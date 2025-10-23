import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { storage } from "./storage";
import { User as SelectUser } from "@shared/schema";
import { emailService } from "./services/emailService";
import { EmailValidationService } from "./services/emailValidation";

declare global {
  namespace Express {
    interface User extends SelectUser {}
  }
}

const scryptAsync = promisify(scrypt);

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

async function comparePasswords(supplied: string, stored: string) {
  // Vérifier si le mot de passe stocké a le bon format (hash.salt)
  if (!stored || !stored.includes('.')) {
    console.log('Mot de passe mal formaté en base:', stored ? 'présent mais sans point' : 'absent');
    return false;
  }
  
  const [hashed, salt] = stored.split(".");
  
  // Vérifier que les deux parties existent
  if (!hashed || !salt) {
    console.log('Hash ou salt manquant:', { hashed: !!hashed, salt: !!salt });
    return false;
  }
  
  try {
    const hashedBuf = Buffer.from(hashed, "hex");
    const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
    return timingSafeEqual(hashedBuf, suppliedBuf);
  } catch (error) {
    console.error('Erreur lors de la comparaison des mots de passe:', error);
    return false;
  }
}

// Interface pour les données temporaires d'inscription
interface PendingRegistration {
  username: string;
  email: string;
  password: string;
  createdAt: Date;
}

// Stockage temporaire des inscriptions en attente
const pendingRegistrations = new Map<string, PendingRegistration>();

// Nettoyage des inscriptions expirées (30 minutes)
setInterval(() => {
  const now = new Date();
  for (const [email, data] of pendingRegistrations.entries()) {
    if (now.getTime() - data.createdAt.getTime() > 30 * 60 * 1000) {
      pendingRegistrations.delete(email);
    }
  }
}, 5 * 60 * 1000);

export function setupAuth(app: Express) {
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "your-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      httpOnly: true,
      secure: process.env.NODE_ENV === "production"
    }
  };

  app.set("trust proxy", 1);
  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: 'email',
        passwordField: 'password'
      },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user || !(await comparePasswords(password, user.password))) {
            return done(null, false);
          } else {
            return done(null, user);
          }
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Étape 1: Demande d'inscription avec validation email
  app.post("/api/register/request", async (req, res) => {
    try {
      const { username, email, password } = req.body;

      if (!username || !email || !password) {
        return res.status(400).json({ error: "Tous les champs sont requis" });
      }

      if (password.length < 6) {
        return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères" });
      }

      // Validation de l'email
      const emailValidation = await EmailValidationService.validateEmail(email);
      if (!emailValidation.isValid) {
        return res.status(400).json({ 
          error: "Email invalide", 
          details: emailValidation.issues 
        });
      }

      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Un utilisateur avec cet email existe déjà" });
      }

      const existingUsername = await storage.getUserByUsername(username);
      if (existingUsername) {
        return res.status(400).json({ error: "Ce nom d'utilisateur est déjà pris" });
      }

      // Stocker temporairement les données d'inscription
      pendingRegistrations.set(email, {
        username,
        email,
        password: await hashPassword(password),
        createdAt: new Date()
      });

      // Générer le code de vérification
      await emailService.sendVerificationEmail(email, 'registration', username);

      res.json({ 
        message: "Prêt pour l'envoi du code de vérification",
        email: email,
        needsEmailSending: true
      });
    } catch (error) {
      console.error('Erreur demande inscription:', error);
      res.status(500).json({ error: "Erreur lors de la demande d'inscription" });
    }
  });

  // Étape 2: Vérification du code et création du compte
  app.post("/api/register/verify", async (req, res, next) => {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({ error: "Email et code requis" });
      }

      // Vérifier le code
      console.log(`Vérification du code pour ${email}: ${code}`);
      const isValidCode = emailService.verifyCode(email, code, 'registration');
      if (!isValidCode) {
        console.log(`Code invalide pour ${email}`);
        return res.status(400).json({ error: "Code invalide ou expiré" });
      }
      console.log(`Code valide pour ${email}`);

      // Récupérer les données d'inscription
      const pendingData = pendingRegistrations.get(email);
      if (!pendingData) {
        return res.status(400).json({ error: "Demande d'inscription expirée" });
      }

      // Créer l'utilisateur
      const user = await storage.createUser({
        username: pendingData.username,
        email: pendingData.email,
        password: pendingData.password,
      });

      // Nettoyer les données temporaires
      pendingRegistrations.delete(email);

      // Connecter automatiquement l'utilisateur
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(201).json({ 
          id: user.id, 
          username: user.username, 
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          isActive: user.isActive
        });
      });
    } catch (error) {
      console.error('Erreur vérification inscription:', error);
      res.status(500).json({ error: "Erreur lors de la vérification" });
    }
  });

  // Étape 1: Demande de connexion avec envoi du code
  app.post("/api/login/request", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email et mot de passe requis" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || !(await comparePasswords(password, user.password))) {
        return res.status(401).json({ error: "Email ou mot de passe incorrect" });
      }

      // Envoyer le code de vérification
      await emailService.sendVerificationEmail(email, 'login', user.username);

      res.json({ 
        message: "Code de vérification envoyé par email",
        email: email 
      });
    } catch (error) {
      console.error('Erreur demande connexion:', error);
      res.status(500).json({ error: "Erreur lors de la demande de connexion" });
    }
  });

  // Étape 2: Vérification du code et connexion
  app.post("/api/login/verify", async (req, res, next) => {
    try {
      const { email, code } = req.body;

      if (!email || !code) {
        return res.status(400).json({ error: "Email et code requis" });
      }

      // Vérifier le code
      console.log(`Vérification du code de connexion pour ${email}: ${code}`);
      const isValidCode = emailService.verifyCode(email, code, 'login');
      if (!isValidCode) {
        console.log(`Code de connexion invalide pour ${email}`);
        return res.status(400).json({ error: "Code invalide ou expiré" });
      }
      console.log(`Code de connexion valide pour ${email}`);

      // Récupérer l'utilisateur
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(401).json({ error: "Utilisateur non trouvé" });
      }

      // Mettre à jour la dernière connexion
      try {
        await storage.updateUserLastLogin(user.id);
      } catch (error) {
        console.error('Erreur mise à jour dernière connexion:', error);
        // Ne pas faire échouer la connexion
      }

      // Connecter l'utilisateur
      req.login(user, (err) => {
        if (err) return next(err);
        res.status(200).json({ 
          id: user.id, 
          username: user.username, 
          email: user.email,
          role: user.role,
          createdAt: user.createdAt,
          isActive: user.isActive
        });
      });
    } catch (error) {
      console.error('Erreur vérification connexion:', error);
      res.status(500).json({ error: "Erreur lors de la vérification" });
    }
  });

  // Connexion classique (optionnelle, pour compatibilité)
  app.post("/api/login", passport.authenticate("local"), (req, res) => {
    res.status(200).json({ 
      id: req.user!.id, 
      username: req.user!.username, 
      email: req.user!.email,
      role: req.user!.role,
      createdAt: req.user!.createdAt,
      isActive: req.user!.isActive
    });
  });

  app.post("/api/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  // Étape 1: Demande de réinitialisation du mot de passe
  app.post("/api/password/reset-request", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({ error: "Email requis" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        // Pour des raisons de sécurité, on ne révèle pas si l'email existe
        return res.json({ message: "Si cet email existe, un code de réinitialisation a été envoyé" });
      }

      // Envoyer le code de vérification
      await emailService.sendVerificationEmail(email, 'password_reset', user.username);

      res.json({ message: "Code de réinitialisation envoyé par email" });
    } catch (error) {
      console.error('Erreur demande réinitialisation:', error);
      res.status(500).json({ error: "Erreur lors de la demande de réinitialisation" });
    }
  });

  // Étape 2: Vérification du code et réinitialisation
  app.post("/api/password/reset-verify", async (req, res) => {
    try {
      const { email, code, newPassword } = req.body;

      if (!email || !code || !newPassword) {
        return res.status(400).json({ error: "Email, code et nouveau mot de passe requis" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères" });
      }

      // Vérifier le code
      const isValidCode = emailService.verifyCode(email, code, 'password_reset');
      if (!isValidCode) {
        return res.status(400).json({ error: "Code invalide ou expiré" });
      }

      // Mettre à jour le mot de passe via la méthode dédiée du storage
      const success = await storage.updateUserPassword(email, newPassword);

      if (!success) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      res.json({ message: "Mot de passe réinitialisé avec succès" });
    } catch (error) {
      console.error('Erreur réinitialisation mot de passe:', error);
      res.status(500).json({ error: "Erreur lors de la réinitialisation" });
    }
  });

  app.get("/api/user", (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json({ 
      id: req.user!.id, 
      username: req.user!.username, 
      email: req.user!.email,
      role: req.user!.role,
      createdAt: req.user!.createdAt,
      isActive: req.user!.isActive
    });
  });
}