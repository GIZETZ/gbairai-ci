import type { Express } from "express";
import { createServer, type Server } from "http";
import { setupAuth } from "./auth";
import { storage } from "./storage";
import { EmotionAnalysisService } from "./services/emotionAnalysis";
import { ContentValidationService } from "./services/contentValidation";
import { moderateContent } from "./services/contentModeration";
import { insertGbairaiSchema, insertInteractionSchema, insertMessageSchema } from "@shared/schema";
import { z } from "zod";
import OpenAI from "openai";
import multer from "multer";
import path from "path";
import { promises as fs } from "fs";
import express from "express";
import { healthCheck } from './health';
import { EmailValidationService } from "./services/emailValidation";
import { emailService } from "./services/emailService";
import { db, pool } from "./db";
import { gbairais, users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { sql } from "drizzle-orm";

// Middleware pour vérifier l'authentification
function requireAuth(req: any, res: any, next: any) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Authentification requise" });
  }
  next();
}

// Declaration pour TypeScript
declare global {
  namespace Express {
    interface User {
      id: number;
      username: string;
      email: string;
      role: string;
    }
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Configuration de l'authentification
  setupAuth(app);

  // Service d'analyse d'émotion
  const emotionService = EmotionAnalysisService.getInstance();
  const validationService = new ContentValidationService();

  // Configuration multer pour l'upload des fichiers
  const storage_multer = multer.diskStorage({
    destination: async (req, file, cb) => {
      const uploadDir = path.join(process.cwd(), 'uploads');
      try {
        await fs.mkdir(uploadDir, { recursive: true });
        cb(null, uploadDir);
      } catch (error) {
        cb(error as Error, uploadDir);
      }
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `${file.fieldname}-${uniqueSuffix}${ext}`);
    }
  });

  const fileFilter = (req: any, file: any, cb: any) => {
    const allowedTypes = [
      'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/m4a', 'audio/mp3', 
      'audio/webm', 'audio/mp4', 'audio/aac', 'audio/flac'
    ];

    console.log('Type de fichier reçu:', file.mimetype);

    // Vérifier si c'est un type audio (même avec des codecs)
    const isAudioFile = allowedTypes.includes(file.mimetype) || file.mimetype.startsWith('audio/');

    if (isAudioFile) {
      cb(null, true);
    } else {
      cb(new Error('Seuls les fichiers audio sont autorisés'), false);
    }
  };

  const upload = multer({
    storage: storage_multer,
    fileFilter,
    limits: {
      fileSize: 50 * 1024 * 1024, // 50MB maximum
    }
  });

  // Servir les fichiers uploadés
  app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

  // Routes d'analyse
  app.post("/api/analyze-emotion", async (req, res) => {
    try {
      const { text, language = 'fr-ci' } = req.body;

      if (!text || typeof text !== 'string') {
        return res.status(400).json({ error: 'Texte requis' });
      }

      const result = await emotionService.analyzeEmotion(text, language);

      res.json({
        success: true,
        emotion: result.emotion,
        confidence: result.confidence,
        suggestions: result.suggestions,
        localTerms: result.localTerms
      });
    } catch (error) {
      console.error('Erreur analyse émotion:', error);
      res.status(500).json({ error: 'Erreur lors de l\'analyse' });
    }
  });

  app.post("/api/validate-content", async (req, res) => {
    try {
      const { content } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: 'Contenu requis' });
      }

      const result = await validationService.validateContent(content);
      res.json(result);
    } catch (error) {
      console.error('Erreur validation contenu:', error);
      res.status(500).json({ error: 'Erreur lors de la validation' });
    }
  });

  // Endpoint pour tester la modération de contenu
  app.post("/api/moderate-content", async (req, res) => {
    try {
      const { content } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: 'Contenu requis' });
      }

      const result = await moderateContent(content);
      res.json(result);
    } catch (error) {
      console.error('Erreur modération contenu:', error);
      res.status(500).json({ error: 'Erreur lors de la modération' });
    }
  });

  // Routes Gbairais (accessible aux visiteurs)
  app.get("/api/gbairais", async (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 20;
      const offset = parseInt(req.query.offset as string) || 0;
      const emotion = req.query.emotion as string;
      const region = req.query.region as string;
      const followingOnly = req.query.followingOnly === 'true';
      const userId = req.user?.id;

      let gbairais;

      if (followingOnly && userId) {
        // Récupérer les gbairais des utilisateurs suivis
        gbairais = await storage.getGbairaisFromFollowing(userId, limit, offset);
      } else if (region) {
        // Filtrer par région de Côte d'Ivoire
        gbairais = await storage.getGbairaisByRegion(region, limit, offset);
      } else if (emotion) {
        gbairais = await storage.getGbairaisByEmotion(emotion, limit);
      } else {
        gbairais = await storage.getGbairais(limit, offset);
      }

      res.json(gbairais);
    } catch (error) {
      console.error('Erreur récupération gbairais:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération' });
    }
  });

  // Route pour récupérer un Gbairai individuel
  app.get("/api/gbairais/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);

      if (isNaN(id)) {
        return res.status(400).json({ error: 'ID invalide' });
      }

      const gbairai = await storage.getGbairaiById(id);

      if (!gbairai) {
        return res.status(404).json({ error: 'Gbairai non trouvé' });
      }

      res.json(gbairai);
    } catch (error) {
      console.error('Erreur récupération gbairai:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération' });
    }
  });



  app.post("/api/gbairais", requireAuth, async (req, res) => {
    try {
      console.log('Données reçues:', req.body);
      console.log('Utilisateur:', req.user);

      const validationResult = insertGbairaiSchema.safeParse(req.body);
      if (!validationResult.success) {
        console.log('Erreur validation:', validationResult.error.issues);
        return res.status(400).json({ 
          error: 'Données invalides',
          details: validationResult.error.issues 
        });
      }

      const { content, emotion, location, isAnonymous } = validationResult.data;

      // Étape 1: Modération du contenu avec IA et liste noire
      const moderationResult = await moderateContent(content);
      if (!moderationResult.approved) {
        return res.status(400).json({
          error: 'Contenu modéré',
          message: moderationResult.reason,
          suggestion: moderationResult.suggestion,
          foundWords: moderationResult.foundWords
        });
      }

      // Étape 2: Validation du contenu (format, longueur, etc.)
      const contentValidation = await validationService.validateContent(content);
      if (!contentValidation.isValid) {
        return res.status(400).json({
          error: 'Contenu invalide',
          issues: contentValidation.issues,
          suggestions: contentValidation.suggestedChanges
        });
      }

      // Créer le Gbairai
      const gbairai = await storage.createGbairai({
        userId: req.user?.id,
        content,
        emotion,
        location,
        isAnonymous: isAnonymous !== false,
        metadata: {}
      });

      // Envoyer notification à tous les utilisateurs
      const authorName = isAnonymous !== false ? "Quelqu'un" : req.user?.username || "Un utilisateur";
      const notificationMessage = `${authorName} a publié un nouveau gbairai avec l'émotion "${emotion}"`;

      try {
        await storage.createNotificationForAllUsers(
          'new_post',
          notificationMessage,
          req.user?.id,
          gbairai.id,
          req.user?.id // Exclure l'auteur
        );
        console.log(`Notifications envoyées pour le gbairai ${gbairai.id}`);
      } catch (error) {
        console.error('Erreur envoi notifications:', error);
        // Ne pas faire échouer la création du gbairai si les notifications échouent
      }

      res.status(201).json(gbairai);
    } catch (error) {
      console.error('Erreur création gbairai:', error);
      res.status(500).json({ error: 'Erreur lors de la création' });
    }
  });

  app.delete("/api/gbairais/:id", requireAuth, async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const success = await storage.deleteGbairai(id, req.user?.id || 0);

      if (!success) {
        return res.status(404).json({ error: 'Gbairai non trouvé ou non autorisé' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Erreur suppression gbairai:', error);
      res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
  });

  // Routes d'interaction
  app.post("/api/gbairais/:id/interact", requireAuth, async (req, res) => {
    try {
      const gbairaiId = parseInt(req.params.id);
      const { type, content } = req.body;

      if (!['like', 'comment', 'share'].includes(type)) {
        return res.status(400).json({ error: 'Type d\'interaction invalide' });
      }

      // Vérifier si l'interaction existe déjà pour les likes
      if (type === 'like') {
        const existingInteraction = await storage.getUserInteraction(
          req.user?.id || 0,
          gbairaiId,
          'like'
        );

        if (existingInteraction) {
          // Supprimer le like existant
          await storage.deleteInteraction(existingInteraction.id, req.user?.id || 0);
          return res.json({ success: true, action: 'unliked' });
        }
      }

      // Modération du contenu pour les commentaires
      if (type === 'comment' && content) {
        const moderationResult = await moderateContent(content);
        if (!moderationResult.approved) {
          return res.status(400).json({
            error: 'Contenu modéré',
            message: moderationResult.reason,
            suggestion: moderationResult.suggestion,
            foundWords: moderationResult.foundWords
          });
        }
      }

      // Créer l'interaction
      const interaction = await storage.createInteraction({
        userId: req.user?.id || 0,
        gbairaiId,
        type,
        content: content || null,
        parentCommentId: req.body.parentCommentId || null
      });

      // Créer une notification pour le propriétaire du Gbairai
      const gbairai = await storage.getGbairaiById(gbairaiId);
      if (gbairai && gbairai.userId !== req.user?.id) {
        const currentUser = await storage.getUser(req.user?.id || 0);
        let notificationMessage = '';

        switch (type) {
          case 'like':
            notificationMessage = `${currentUser?.username} a aimé votre Gbairai`;
            break;
          case 'comment':
            notificationMessage = `${currentUser?.username} a commenté votre Gbairai`;
            break;
          case 'share':
            notificationMessage = `${currentUser?.username} a partagé votre Gbairai`;
            break;
        }

        if (notificationMessage) {
          await storage.createNotification({
            userId: gbairai.userId,
            type: type as 'like' | 'comment',
            fromUserId: req.user?.id,
            gbairaiId,
            message: notificationMessage
          });
        }
      }

      res.status(201).json({ success: true, interaction, action: 'created' });
    } catch (error) {
      console.error('Erreur création interaction:', error);
      res.status(500).json({ error: 'Erreur lors de l\'interaction' });
    }
  });

  // Routes de localisation
  app.get("/api/gbairais/nearby", requireAuth, async (req, res) => {
    try {
      const { latitude, longitude, radius = 10 } = req.query;

      if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Coordonnées requises' });
      }

      const location = {
        latitude: parseFloat(latitude as string),
        longitude: parseFloat(longitude as string),
        city: '',
        region: '',
        country: 'Côte d\'Ivoire'
      };

      const gbairais = await storage.getGbairaisByLocation(
        location,
        parseFloat(radius as string),
        20
      );

      res.json(gbairais);
    } catch (error) {
      console.error('Erreur récupération gbairais proches:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération' });
    }
  });

  // Routes utilisateur
  app.get("/api/users/:id/gbairais", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const gbairais = await storage.getUserGbairais(userId, 20);

      res.json(gbairais);
    } catch (error) {
      console.error('Erreur récupération gbairais utilisateur:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération' });
    }
  });

  app.put("/api/users/profile", requireAuth, async (req, res) => {
    try {
      const { username, email } = req.body;

      // Validate input
      if (!username || !email) {
        return res.status(400).json({ error: "Username and email are required" });
      }

      // Check if username is already taken by another user
      const existingUserByUsername = await storage.getUserByUsername(username);
      if (existingUserByUsername && existingUserByUsername.id !== req.user?.id) {
        return res.status(400).json({ error: "Ce nom d'utilisateur est déjà pris" });
      }

      // Check if email is already taken by another user
      const existingUserByEmail = await storage.getUserByEmail(email);
      if (existingUserByEmail && existingUserByEmail.id !== req.user?.id) {
        return res.status(400).json({ error: "Cette adresse email est déjà utilisée" });
      }

      // Update user profile
      const updatedUser = await storage.updateUser(req.user?.id || 0, { username, email });

      if (!updatedUser) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user profile:", error);
      res.status(500).json({ error: "Erreur interne du serveur" });
    }
  });

  // Route pour récupérer les commentaires d'un Gbairai
  app.get("/api/gbairais/:id/comments", async (req, res) => {
    try {
      const gbairaiId = parseInt(req.params.id);
      const comments = await storage.getInteractionsByGbairai(gbairaiId);

      // Filtrer seulement les commentaires principaux (pas les likes/shares et pas les réponses)
      const mainCommentsOnly = comments.filter(comment => 
        comment.type === 'comment' && !comment.parentCommentId
      );

      res.json(mainCommentsOnly);
    } catch (error) {
      console.error('Erreur récupération commentaires:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des commentaires' });
    }
  });

  // Route pour récupérer les réponses d'un commentaire spécifique
  app.get("/api/comments/:id/replies", async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const replies = await storage.getRepliesByCommentId(commentId);

      res.json(replies);
    } catch (error) {
      console.error('Erreur récupération réponses:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des réponses' });
    }
  });

  // Route pour supprimer une interaction/commentaire
  app.delete("/api/interactions/:id", requireAuth, async (req, res) => {
    try {
      const interactionId = parseInt(req.params.id);
      const userId = req.user?.id || 0;

      const success = await storage.deleteInteraction(interactionId, userId);

      if (success) {
        res.json({ message: 'Interaction supprimée avec succès' });
      } else {
        res.status(404).json({ error: 'Interaction non trouvée ou non autorisée' });
      }
    } catch (error) {
      console.error('Erreur suppression interaction:', error);
      res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
  });

  // Route pour traduire du texte avec OpenAI
  app.post("/api/translate", requireAuth, async (req, res) => {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Texte requis' });
      }

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "Tu es un traducteur professionnel. Traduis le texte suivant en français standard si c'est en nouchi ou en langue locale ivoirienne, ou en nouchi/français local si c'est en français standard. Garde le sens et l'émotion du message original."
          },
          {
            role: "user",
            content: text
          }
        ],
        max_tokens: 200,
        temperature: 0.3,
      });

      const translatedText = response.choices[0].message.content;

      res.json({ translatedText });
    } catch (error) {
      console.error('Erreur traduction:', error);
      res.status(500).json({ error: 'Erreur lors de la traduction' });
    }
  });

  // Route pour signaler du contenu
  app.post("/api/reports", requireAuth, async (req, res) => {
    try {
      const { type, targetId, reason } = req.body;
      const userId = req.user?.id || 0;

      if (!type || !targetId || !reason) {
        return res.status(400).json({ error: 'Type, ID cible et raison requis' });
      }

      const report = await storage.createReport({
        userId,
        type,
        targetId,
        reason,
        status: 'pending'
      });

      res.json({ message: 'Signalement enregistré avec succès', reportId: report.id });
    } catch (error) {
      console.error('Erreur signalement:', error);

      // Gérer le cas où le contenu a déjà été signalé
      if (error instanceof Error && error.message === 'Vous avez déjà signalé ce contenu') {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: 'Erreur lors du signalement' });
    }
  });

  // Routes de messagerie
  // Récupérer tous les utilisateurs (authentifié - pour la messagerie)
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Erreur récupération utilisateurs:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
    }
  });

  // Endpoint pour la recherche d'utilisateurs (public)
  app.get("/api/users/search", async (req, res) => {
    try {
      const { q } = req.query;
      const currentUserId = req.user?.id;

      if (!q || typeof q !== 'string') {
        return res.json([]);
      }

      const users = await storage.searchUsers(q, currentUserId);

      res.json(users);
    } catch (error) {
      console.error('Erreur recherche utilisateurs:', error);
      res.status(500).json({ error: 'Erreur lors de la recherche des utilisateurs' });
    }
  });

  // Route pour obtenir le profil d'un utilisateur
  app.get("/api/users/:id/profile", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const profile = await storage.getUserProfile(userId);

      if (!profile) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      res.json(profile);
    } catch (error) {
      console.error('Erreur récupération profil:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
    }
  });

  app.put("/api/users/profile", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Utilisateur non authentifié' });
      }

      const { bio, location, website, avatar } = req.body;
      const profileData = { bio, location, website, avatar };

      const updatedUser = await storage.updateUserProfile(userId, profileData);

      if (!updatedUser) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error('Erreur mise à jour profil:', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
    }
  });

  // Route pour récupérer les commentaires d'un Gbairai
  app.get("/api/gbairais/:id/comments", async (req, res) => {
    try {
      const gbairaiId = parseInt(req.params.id);
      const comments = await storage.getInteractionsByGbairai(gbairaiId);

      // Filtrer seulement les commentaires principaux (pas les likes/shares et pas les réponses)
      const mainCommentsOnly = comments.filter(comment => 
        comment.type === 'comment' && !comment.parentCommentId
      );

      res.json(mainCommentsOnly);
    } catch (error) {
      console.error('Erreur récupération commentaires:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des commentaires' });
    }
  });

  // Route pour récupérer les réponses d'un commentaire spécifique
  app.get("/api/comments/:id/replies", async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const replies = await storage.getRepliesByCommentId(commentId);

      res.json(replies);
    } catch (error) {
      console.error('Erreur récupération réponses:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des réponses' });
    }
  });

  // Route pour supprimer une interaction/commentaire
  app.delete("/api/interactions/:id", requireAuth, async (req, res) => {
    try {
      const interactionId = parseInt(req.params.id);
      const userId = req.user?.id || 0;

      const success = await storage.deleteInteraction(interactionId, userId);

      if (success) {
        res.json({ message: 'Interaction supprimée avec succès' });
      } else {
        res.status(404).json({ error: 'Interaction non trouvée ou non autorisée' });
      }
    } catch (error) {
      console.error('Erreur suppression interaction:', error);
      res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
  });

  // Route pour traduire du texte avec OpenAI
  app.post("/api/translate", requireAuth, async (req, res) => {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Texte requis' });
      }

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "Tu es un traducteur professionnel. Traduis le texte suivant en français standard si c'est en nouchi ou en langue locale ivoirienne, ou en nouchi/français local si c'est en français standard. Garde le sens et l'émotion du message original."
          },
          {
            role: "user",
            content: text
          }
        ],
        max_tokens: 200,
        temperature: 0.3,
      });

      const translatedText = response.choices[0].message.content;

      res.json({ translatedText });
    } catch (error) {
      console.error('Erreur traduction:', error);
      res.status(500).json({ error: 'Erreur lors de la traduction' });
    }
  });

  // Route pour signaler du contenu
  app.post("/api/reports", requireAuth, async (req, res) => {
    try {
      const { type, targetId, reason } = req.body;
      const userId = req.user?.id || 0;

      if (!type || !targetId || !reason) {
        return res.status(400).json({ error: 'Type, ID cible et raison requis' });
      }

      const report = await storage.createReport({
        userId,
        type,
        targetId,
        reason,
        status: 'pending'
      });

      res.json({ message: 'Signalement enregistré avec succès', reportId: report.id });
    } catch (error) {
      console.error('Erreur signalement:', error);

      // Gérer le cas où le contenu a déjà été signalé
      if (error instanceof Error && error.message === 'Vous avez déjà signalé ce contenu') {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: 'Erreur lors du signalement' });
    }
  });

  // Routes de messagerie
  // Récupérer tous les utilisateurs (authentifié - pour la messagerie)
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Erreur récupération utilisateurs:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
    }
  });

  // Endpoint pour la recherche d'utilisateurs (public)
  app.get("/api/users/search", async (req, res) => {
    try {
      const { q } = req.query;
      const currentUserId = req.user?.id;

      if (!q || typeof q !== 'string') {
        return res.json([]);
      }

      const users = await storage.searchUsers(q, currentUserId);

      res.json(users);
    } catch (error) {
      console.error('Erreur recherche utilisateurs:', error);
      res.status(500).json({ error: 'Erreur lors de la recherche des utilisateurs' });
    }
  });

  // Route pour obtenir le profil d'un utilisateur
  app.get("/api/users/:id/profile", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const profile = await storage.getUserProfile(userId);

      if (!profile) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      res.json(profile);
    } catch (error) {
      console.error('Erreur récupération profil:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
    }
  });

  app.put("/api/users/profile", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Utilisateur non authentifié' });
      }

      const { bio, location, website, avatar } = req.body;
      const profileData = { bio, location, website, avatar };

      const updatedUser = await storage.updateUserProfile(userId, profileData);

      if (!updatedUser) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error('Erreur mise à jour profil:', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
    }
  });

  // Route pour récupérer les commentaires d'un Gbairai
  app.get("/api/gbairais/:id/comments", async (req, res) => {
    try {
      const gbairaiId = parseInt(req.params.id);
      const comments = await storage.getInteractionsByGbairai(gbairaiId);

      // Filtrer seulement les commentaires principaux (pas les likes/shares et pas les réponses)
      const mainCommentsOnly = comments.filter(comment => 
        comment.type === 'comment' && !comment.parentCommentId
      );

      res.json(mainCommentsOnly);
    } catch (error) {
      console.error('Erreur récupération commentaires:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des commentaires' });
    }
  });

  // Route pour récupérer les réponses d'un commentaire spécifique
  app.get("/api/comments/:id/replies", async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const replies = await storage.getRepliesByCommentId(commentId);

      res.json(replies);
    } catch (error) {
      console.error('Erreur récupération réponses:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des réponses' });
    }
  });

  // Route pour supprimer une interaction/commentaire
  app.delete("/api/interactions/:id", requireAuth, async (req, res) => {
    try {
      const interactionId = parseInt(req.params.id);
      const userId = req.user?.id || 0;

      const success = await storage.deleteInteraction(interactionId, userId);

      if (success) {
        res.json({ message: 'Interaction supprimée avec succès' });
      } else {
        res.status(404).json({ error: 'Interaction non trouvée ou non autorisée' });
      }
    } catch (error) {
      console.error('Erreur suppression interaction:', error);
      res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
  });

  // Route pour traduire du texte avec OpenAI
  app.post("/api/translate", requireAuth, async (req, res) => {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Texte requis' });
      }

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "Tu es un traducteur professionnel. Traduis le texte suivant en français standard si c'est en nouchi ou en langue locale ivoirienne, ou en nouchi/français local si c'est en français standard. Garde le sens et l'émotion du message original."
          },
          {
            role: "user",
            content: text
          }
        ],
        max_tokens: 200,
        temperature: 0.3,
      });

      const translatedText = response.choices[0].message.content;

      res.json({ translatedText });
    } catch (error) {
      console.error('Erreur traduction:', error);
      res.status(500).json({ error: 'Erreur lors de la traduction' });
    }
  });

  // Route pour signaler du contenu
  app.post("/api/reports", requireAuth, async (req, res) => {
    try {
      const { type, targetId, reason } = req.body;
      const userId = req.user?.id || 0;

      if (!type || !targetId || !reason) {
        return res.status(400).json({ error: 'Type, ID cible et raison requis' });
      }

      const report = await storage.createReport({
        userId,
        type,
        targetId,
        reason,
        status: 'pending'
      });

      res.json({ message: 'Signalement enregistré avec succès', reportId: report.id });
    } catch (error) {
      console.error('Erreur signalement:', error);

      // Gérer le cas où le contenu a déjà été signalé
      if (error instanceof Error && error.message === 'Vous avez déjà signalé ce contenu') {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: 'Erreur lors du signalement' });
    }
  });

  // Routes de messagerie
  // Récupérer tous les utilisateurs (authentifié - pour la messagerie)
  app.get("/api/users", requireAuth, async (req, res) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error('Erreur récupération utilisateurs:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
    }
  });

  // Endpoint pour la recherche d'utilisateurs (public)
  app.get("/api/users/search", async (req, res) => {
    try {
      const { q } = req.query;
      const currentUserId = req.user?.id;

      if (!q || typeof q !== 'string') {
        return res.json([]);
      }

      const users = await storage.searchUsers(q, currentUserId);

      res.json(users);
    } catch (error) {
      console.error('Erreur recherche utilisateurs:', error);
      res.status(500).json({ error: 'Erreur lors de la recherche des utilisateurs' });
    }
  });

  // Route pour obtenir le profil d'un utilisateur
  app.get("/api/users/:id/profile", async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const profile = await storage.getUserProfile(userId);

      if (!profile) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      res.json(profile);
    } catch (error) {
      console.error('Erreur récupération profil:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération du profil' });
    }
  });

  app.put("/api/users/profile", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id;
      if (!userId) {
        return res.status(401).json({ error: 'Utilisateur non authentifié' });
      }

      const { bio, location, website, avatar } = req.body;
      const profileData = { bio, location, website, avatar };

      const updatedUser = await storage.updateUserProfile(userId, profileData);

      if (!updatedUser) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      res.json(updatedUser);
    } catch (error) {
      console.error('Erreur mise à jour profil:', error);
      res.status(500).json({ error: 'Erreur lors de la mise à jour du profil' });
    }
  });

  // Route pour récupérer les commentaires d'un Gbairai
  app.get("/api/gbairais/:id/comments", async (req, res) => {
    try {
      const gbairaiId = parseInt(req.params.id);
      const comments = await storage.getInteractionsByGbairai(gbairaiId);

      // Filtrer seulement les commentaires principaux (pas les likes/shares et pas les réponses)
      const mainCommentsOnly = comments.filter(comment => 
        comment.type === 'comment' && !comment.parentCommentId
      );

      res.json(mainCommentsOnly);
    } catch (error) {
      console.error('Erreur récupération commentaires:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des commentaires' });
    }
  });

  // Route pour récupérer les réponses d'un commentaire spécifique
  app.get("/api/comments/:id/replies", async (req, res) => {
    try {
      const commentId = parseInt(req.params.id);
      const replies = await storage.getRepliesByCommentId(commentId);

      res.json(replies);
    } catch (error) {
      console.error('Erreur récupération réponses:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des réponses' });
    }
  });

  // Route pour supprimer une interaction/commentaire
  app.delete("/api/interactions/:id", requireAuth, async (req, res) => {
    try {
      const interactionId = parseInt(req.params.id);
      const userId = req.user?.id || 0;

      const success = await storage.deleteInteraction(interactionId, userId);

      if (success) {
        res.json({ message: 'Interaction supprimée avec succès' });
      } else {
        res.status(404).json({ error: 'Interaction non trouvée ou non autorisée' });
      }
    } catch (error) {
      console.error('Erreur suppression interaction:', error);
      res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
  });

  // Route pour traduire du texte avec OpenAI
  app.post("/api/translate", requireAuth, async (req, res) => {
    try {
      const { text } = req.body;

      if (!text) {
        return res.status(400).json({ error: 'Texte requis' });
      }

      const openai = new OpenAI({
        apiKey: process.env.OPENAI_API_KEY
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o", // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
        messages: [
          {
            role: "system",
            content: "Tu es un traducteur professionnel. Traduis le texte suivant en français standard si c'est en nouchi ou en langue locale ivoirienne, ou en nouchi/français local si c'est en français standard. Garde le sens et l'émotion du message original."
          },
          {
            role: "user",
            content: text
          }
        ],
        max_tokens: 200,
        temperature: 0.3,
      });

      const translatedText = response.choices[0].message.content;

      res.json({ translatedText });
    } catch (error) {
      console.error('Erreur traduction:', error);
      res.status(500).json({ error: 'Erreur lors de la traduction' });
    }
  });

  // Route pour signaler du contenu
  app.post("/api/reports", requireAuth, async (req, res) => {
    try {
      const { type, targetId, reason } = req.body;
      const userId = req.user?.id || 0;

      if (!type || !targetId || !reason) {
        return res.status(400).json({ error: 'Type, ID cible et raison requis' });
      }

      const report = await storage.createReport({
        userId,
        type,
        targetId,
        reason,
        status: 'pending'
      });

      res.json({ message: 'Signalement enregistré avec succès', reportId: report.id });
    } catch (error) {
      console.error('Erreur signalement:', error);

      // Gérer le cas où le contenu a déjà été signalé
      if (error instanceof Error && error.message === 'Vous avez déjà signalé ce contenu') {
        return res.status(400).json({ error: error.message });
      }

      res.status(500).json({ error: 'Erreur lors du signalement' });
    }
  });

  // Routes de messagerie

  // Route pour récupérer une conversation spécifique
  app.get("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.user?.id || 0;

      // Vérifier que l'ID est valide
      if (isNaN(conversationId) || conversationId <= 0) {
        console.log(`ID de conversation invalide: ${req.params.id}`);
        return res.status(400).json({ error: 'ID de conversation invalide' });
      }

      console.log(`Récupération conversation ${conversationId} pour utilisateur ${userId}`);

      const conversation = await storage.getConversationById(conversationId);

      if (!conversation) {
        console.log(`Conversation ${conversationId} non trouvée`);
        return res.status(404).json({ error: 'Conversation non trouvée' });
      }

      const participants = conversation.participants as number[];
      if (!participants.includes(userId)) {
        console.log(`Utilisateur ${userId} non autorisé pour conversation ${conversationId}`);
        return res.status(403).json({ error: 'Accès non autorisé' });
      }

      // Enrichir avec les données des participants
      const participantsData = await Promise.all(
        participants.map(async (id) => {
          const user = await storage.getUser(id);
          return user ? { id: user.id, username: user.username, email: user.email } : null;
        })
      );

      const enrichedConversation = {
        ...conversation,
        participants: participantsData.filter(Boolean),
      };

      res.json(enrichedConversation);
    } catch (error) {
      console.error('Erreur récupération conversation:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération de la conversation' });
    }
  });

  // Routes pour créer ou récupérer une conversation
  app.post("/api/conversations", requireAuth, async (req, res) => {
    try {
      const { participantId } = req.body;
      const userId = req.user?.id || 0;

      if (!participantId) {
        return res.status(400).json({ error: 'ID du participant requis' });
      }

      if (participantId === userId) {
        return res.status(400).json({ error: 'Impossible de créer une conversation avec soi-même' });
      }

      // Vérifier si l'utilisateur cible existe
      const targetUser = await storage.getUser(participantId);
      if (!targetUser) {
        return res.status(404).json({ error: 'Utilisateur non trouvé' });
      }

      // Vérifier si l'utilisateur est bloqué
      const isBlocked = await storage.isBlocked(userId, participantId);
      if (isBlocked) {
        return res.status(403).json({ error: 'Impossible de créer une conversation avec cet utilisateur' });
      }

      const participants = [userId, participantId].sort();

      // Vérifier si une conversation existe déjà
      let conversation = await storage.getConversationByParticipants(participants);

      if (!conversation) {
        // Créer une nouvelle conversation
        conversation = await storage.createConversation({
          participants,
          isEncrypted: false
        });
        console.log('Nouvelle conversation créée:', conversation.id);
      } else {
        console.log('Conversation existante trouvée:', conversation.id);
      }

      res.json({ 
        conversationId: conversation.id,
        id: conversation.id,
        success: true 
      });
    } catch (error) {
      console.error('Erreur création conversation:', error);
      res.status(500).json({ error: 'Erreur lors de la création de la conversation' });
    }
  });

  // Récupérer les conversations d'un utilisateur
  app.get("/api/conversations", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || 0;
      console.log(`🔍 Récupération conversations pour utilisateur ${userId}`);

      const allConversations = await storage.getConversationsByUserId(userId);
      console.log(`📊 ${allConversations.length} conversations trouvées avant filtrage`);

      // Debug détaillé des conversations brutes
      allConversations.forEach(conv => {
        console.log(`📋 Conversation ${conv.id}: participants=${JSON.stringify(conv.participants)}`);
      });

      // Filtrer les conversations supprimées pour cet utilisateur
      const conversations = [];
      for (const conversation of allConversations) {
        const isDeleted = await storage.isConversationDeletedForUser(conversation.id, userId);
        if (!isDeleted) {
          conversations.push(conversation);
          console.log(`✅ Conversation ${conversation.id} gardée`);
        } else {
          console.log(`❌ Conversation ${conversation.id} supprimée pour utilisateur ${userId}`);
        }
      }

      console.log(`📈 ${conversations.length} conversations après filtrage des supprimées`);

      // Enrichir les conversations avec les informations des participants
      const enrichedConversations = await Promise.all(
        conversations.map(async (conversation) => {
          const participants = conversation.participants as number[];
          const participantsData = await Promise.all(
            participants.map(async (id) => {
              const user = await storage.getUser(id);
              return user ? { id: user.id, username: user.username, email: user.email } : null;
            })
          );

          // Récupérer le dernier message (plus efficace)
          const lastMessageQuery = await pool.query(`
            SELECT content, created_at, sender_id 
            FROM messages 
            WHERE conversation_id = $1 
              AND (deleted_for_everyone = FALSE OR deleted_for_everyone IS NULL)
            ORDER BY created_at DESC 
            LIMIT 1
          `, [conversation.id]);

          const lastMessage = lastMessageQuery.rows[0];

          // Compter les messages non lus
          const unreadCount = await storage.getUnreadMessagesCount(conversation.id, userId);

          return {
            ...conversation,
            participants: participantsData.filter(Boolean),
            lastMessage: lastMessage ? {
              content: lastMessage.content,
              timestamp: lastMessage.created_at,
              senderId: lastMessage.sender_id,
            } : null,
            unreadCount: unreadCount,
          };
        })
      );

      console.log(`🎯 ${enrichedConversations.length} conversations enrichies retournées`);

      // Log détaillé des conversations enrichies
      enrichedConversations.forEach(conv => {
        const participantNames = conv.participants.map(p => `${p.username} (${p.id})`).join(', ');
        console.log(`🎈 Conversation ${conv.id}:`, {
          participants: participantNames,
          lastMessage: conv.lastMessage ? `"${conv.lastMessage.content.substring(0, 30)}..."` : 'Aucun',
          unreadCount: conv.unreadCount
        });
      });

      res.json(enrichedConversations);
    } catch (error) {
      console.error('Erreur récupération conversations:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des conversations' });
    }
  });

  // Récupérer les messages d'une conversation
  app.get("/api/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.user?.id || 0;

      // Désactiver le cache pour cette route
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });

      // Vérifier que l'utilisateur fait partie de la conversation
      const conversation = await storage.getConversationById(conversationId);
      console.log(`Recherche conversation ${conversationId}:`, conversation ? 'trouvée' : 'non trouvée');

      if (!conversation) {
        console.log(`Conversation ${conversationId} non trouvée pour l'utilisateur ${userId}`);
        return res.status(404).json({ error: 'Conversation non trouvée' });
      }

      const participants = conversation.participants as number[];
      console.log(`Participants de la conversation ${conversationId}:`, participants);

      if (!participants.includes(userId)) {
        console.log(`Utilisateur ${userId} non autorisé pour la conversation ${conversationId}`);
        return res.status(403).json({ error: 'Accès non autorisé' });
      }

      // Marquer les messages comme lus (sans bloquer si ça échoue)
      try {
        await storage.markMessagesAsRead(conversationId, userId);
      } catch (error) {
        console.error('Erreur marquage messages comme lus (non bloquant):', error);
      }

      // Récupérer les messages de la conversation avec les informations de réponse
      const messages = await pool.query(`
        SELECT 
          m.*,
          rm.content as reply_content,
          rm.sender_id as reply_sender_id,
          ru.username as reply_sender_name
        FROM messages m
        LEFT JOIN messages rm ON m.reply_to_id = rm.id
        LEFT JOIN users ru ON rm.sender_id = ru.id
        WHERE m.conversation_id = $1 
          AND m.deleted_for_everyone = FALSE
          AND m.id NOT IN (
            SELECT message_id FROM message_deletions WHERE user_id = $2
          )
        ORDER BY m.created_at ASC
      `, [conversationId, userId]);

      // Formater les messages avec les informations de réponse
      const formattedMessages = messages.rows.map(msg => ({
        id: msg.id,
        conversationId: msg.conversation_id,
        senderId: msg.sender_id,
        content: msg.content,
        type: msg.type || 'text',
        createdAt: msg.created_at ? msg.created_at.toISOString() : new Date().toISOString(),
        replyToMessage: msg.reply_to_id ? {
          id: msg.reply_to_id,
          content: msg.reply_content,
          senderId: msg.reply_sender_id,
          senderName: msg.reply_sender_name
        } : null
      }));

      res.json(formattedMessages);
    } catch (error) {
      console.error('Erreur récupération messages:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des messages' });
    }
  });

  // Envoyer un message texte
  app.post("/api/conversations/:id/messages", requireAuth, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const { content, type = 'text', replyToId } = req.body;
      const userId = req.user?.id || 0;

      // Vérifier que l'ID de conversation est valide
      if (isNaN(conversationId) || conversationId <= 0) {
        console.log(`Tentative d'envoi de message avec ID invalide: ${req.params.id}`);
        return res.status(400).json({ error: 'ID de conversation invalide' });
      }

      if (!content || !content.trim()) {
        return res.status(400).json({ error: 'Contenu du message requis' });
      }

      // Vérifier que l'utilisateur fait partie de la conversation
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation non trouvée' });
      }

      const participants = conversation.participants as number[];
      if (!participants.includes(userId)) {
        return res.status(403).json({ error: 'Accès non autorisé' });
      }

      // Vérifier si l'utilisateur a été bloqué par l'autre participant
      const otherParticipantId = participants.find(id => id !== userId);
      if (otherParticipantId) {
        const isBlocked = await storage.isBlocked(userId, otherParticipantId);
        if (isBlocked) {
          return res.status(403).json({ error: 'Vous ne pouvez pas envoyer de message à cet utilisateur' });
        }
      }

      // Si replyToId est fourni, vérifier que le message existe dans cette conversation
      if (replyToId) {
        const replyMessage = await pool.query(`
          SELECT id FROM messages 
          WHERE id = $1 AND conversation_id = $2
        `, [replyToId, conversationId]);

        if (!replyMessage.rows.length) {
          return res.status(400).json({ error: 'Message de réponse non trouvé' });
        }
      }

      // Créer le message
      const newMessage = await storage.createMessage({
        conversationId,
        senderId: userId,
        content: content.trim(),
        type,
        replyToId
      });

      res.status(201).json(newMessage);
    } catch (error) {
      console.error('Erreur envoi message:', error);
      res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
    }
  });

  // Supprimer un message pour soi uniquement
  app.delete("/api/messages/:id/for-me", requireAuth, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const userId = req.user?.id || 0;

      const success = await storage.deleteMessageForUser(messageId, userId);
      if (!success) {
        return res.status(404).json({ error: 'Message non trouvé ou accès non autorisé' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Erreur suppression message pour soi:', error);
      res.status(500).json({ error: 'Erreur lors de la suppression du message' });
    }
  });

  // Supprimer un message pour tout le monde (seulement ses propres messages)
  app.delete("/api/messages/:id", requireAuth, async (req, res) => {
    try {
      const messageId = parseInt(req.params.id);
      const userId = req.user?.id || 0;

      const success = await storage.deleteMessageForEveryone(messageId, userId);
      if (!success) {
        return res.status(404).json({ error: 'Message non trouvé ou vous ne pouvez pas le supprimer' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Erreur suppression message pour tous:', error);
      res.status(500).json({ error: 'Erreur lors de la suppression du message' });
    }
  });

  // Routes pour les notifications
  app.get("/api/notifications", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || 0;
      const since = req.query.since ? new Date(req.query.since as string) : undefined;

      const notifications = await storage.getNotifications(userId, 20);

      // Ajouter un header pour indiquer s'il y a de nouvelles notifications
      const hasNewNotifications = notifications.some(n => !n.read);
      res.setHeader('X-Has-New-Notifications', hasNewNotifications.toString());

      res.json(notifications);
    } catch (error) {
      console.error('Erreur récupération notifications:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des notifications' });
    }
  });

  // Marquer une notification comme lue
  app.put("/api/notifications/:id/read", requireAuth, async (req, res) => {
    try {
      const notificationId = parseInt(req.params.id);
      const userId = req.user?.id || 0;

      await storage.markNotificationAsRead(notificationId);

      res.json({ success: true });
    } catch (error) {
      console.error('Erreur marquage notification lue:', error);
      res.status(500).json({ error: 'Erreur lors du marquage comme lu' });
    }
  });

  // Marquer toutes les notifications comme lues
  app.put("/api/notifications/read-all", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || 0;

      // Marquer toutes les notifications comme lues pour l'utilisateur
      const userNotifications = await storage.getNotifications(userId, 100);
      for (const notification of userNotifications) {
        if (!notification.read) {
          await storage.markNotificationAsRead(notification.id);
        }
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Erreur marquage toutes notifications lues:', error);
      res.status(500).json({ error: 'Erreur lors du marquage de toutes les notifications comme lues' });
    }
  });

  // Valider le contenu
  app.post("/api/validate-content", requireAuth, async (req, res) => {
    try {
      const { content } = req.body;

      if (!content || typeof content !== 'string') {
        return res.status(400).json({ error: "Contenu requis" });
      }

      const result = await validationService.validateContent(content);
      res.json(result);
    } catch (error) {
      console.error("Erreur lors de la validation du contenu:", error);
      res.status(500).json({ error: "Erreur lors de la validation du contenu" });
    }
  });

  // Valider l'email
  app.post("/api/validate-email", async (req, res) => {
    try {
      const { email } = req.body;

      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: "Email requis" });
      }

      const result = await EmailValidationService.validateEmail(email);
      res.json(result);
    } catch (error) {
      console.error("Erreur lors de la validation de l'email:", error);
      res.status(500).json({ error: "Erreur lors de la validation de l'email" });
    }
  });

  // Route pour obtenir la configuration EmailJS
  app.get("/api/emailjs-config", (req, res) => {
    const config = emailService.getEmailJSConfig();
    res.json(config);
  });

  // Route pour envoyer un code de vérification
  app.post("/api/send-code", async (req, res) => {
    try {
      const { email, type, username } = req.body;

      if (!email || !type) {
        return res.status(400).json({ error: "Email et type requis" });
      }

      // Générer et stocker le code côté serveur
      const code = await emailService.sendVerificationEmail(email, type, username);

      // Retourner les infos pour l'envoi côté client
      let subject = '';
      let message = '';

      switch (type) {
        case 'registration':
          subject = 'Gbairai - Code de vérification d\'inscription';
          message = `Bonjour${username ? ' ' + username : ''},\n\nVotre code de vérification pour votre inscription sur Gbairai est : ${code}\n\nCe code expire dans 10 minutes.\n\nSi vous n'avez pas demandé cette inscription, ignorez ce message.\n\nÉquipe Gbairai`;
          break;
        case 'login':
          subject = 'Gbairai - Code de vérification de connexion';
          message = `Bonjour${username ? ' ' + username : ''},\n\nVotre code de vérification pour vous connecter à Gbairai est : ${code}\n\nCe code expire dans 10 minutes.\n\nSi vous n'avez pas demandé cette connexion, changez votre mot de passe immédiatement.\n\nÉquipe Gbairai`;
          break;
        case 'password_reset':
          subject = 'Gbairai - Code de réinitialisation du mot de passe';
          message = `Bonjour${username ? ' ' + username : ''},\n\nVotre code de vérification pour réinitialiser votre mot de passe sur Gbairai est : ${code}\n\nCe code expire dans 10 minutes.\n\nSi vous n'avez pas demandé cette réinitialisation, ignorez ce message.\n\nÉquipe Gbairai`;
          break;
        default:
          throw new Error('Type de message non supporté');
      }

      res.json({
        success: true,
        emailData: {
          email,
          subject,
          message,
          code,
          toName: username || 'Utilisateur'
        },
        // En développement, on peut afficher le code pour le debug
        ...(process.env.NODE_ENV === 'development' && { debugCode: code })
      });
    } catch (error) {
      console.error('Erreur envoi code:', error);
      res.status(500).json({ error: "Erreur lors de l'envoi du code" });
    }
  });

  // Route pour vérifier un code
  app.post("/api/verify-code", async (req, res) => {
    try {
      const { email, code, type } = req.body;

      if (!email || !code || !type) {
        return res.status(400).json({ error: "Email, code et type requis" });
      }

      const isValid = emailService.verifyCode(email, code, type);

      if (isValid) {
        res.json({ success: true, message: "Code vérifié avec succès" });
      } else {
        res.status(400).json({ error: "Code invalide ou expiré" });
      }
    } catch (error) {
      console.error('Erreur vérification code:', error);
      res.status(500).json({ error: "Erreur lors de la vérification du code" });
    }
  });

  // Routes pour la réinitialisation du mot de passe
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

      res.json({ message: "Code de réinitialisation prêt à être envoyé" });
    } catch (error) {
      console.error('Erreur demande réinitialisation:', error);
      res.status(500).json({ error: "Erreur lors de la demande de réinitialisation" });
    }
  });



  // Route pour confirmer la réinitialisation avec le nouveau mot de passe
  app.post("/api/password/reset-confirm", async (req, res) => {
    try {
      const { email, newPassword } = req.body;

      if (!email || !newPassword) {
        return res.status(400).json({ error: "Email et nouveau mot de passe requis" });
      }

      if (newPassword.length < 6) {
        return res.status(400).json({ error: "Le mot de passe doit contenir au moins 6 caractères" });
      }

      // Utiliser le bon système de hashage (scrypt)
      const { hashPassword } = require('./auth');
      const hashedPassword = await hashPassword(newPassword);

      // Mettre à jour le mot de passe de l'utilisateur
      const [updated] = await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.email, email))
        .returning();

      if (!updated) {
        return res.status(404).json({ error: "Utilisateur non trouvé" });
      }

      res.json({ message: "Mot de passe modifié avec succès" });
    } catch (error) {
      console.error('Erreur confirmation réinitialisation:', error);
      res.status(500).json({ error: "Erreur lors de la modification du mot de passe" });
    }
  });

  // Routes admin
  // Middleware pour vérifier l'accès admin
  function requireAdmin(req: any, res: any, next: any) {
    if (!req.isAuthenticated() || req.user?.email !== 'gbairai.app@gmail.com') {
      return res.status(403).json({ error: "Accès administrateur requis" });
    }
    next();
  }

  // Récupérer tous les utilisateurs avec leurs stats (admin)
  app.get("/api/admin/users", requireAdmin, async (req, res) => {
    try {
      const users = await storage.getAllUsersWithStats();
      res.json(users);
    } catch (error) {
      console.error('Erreur récupération utilisateurs admin:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des utilisateurs' });
    }
  });

  // Supprimer un utilisateur (admin)
  app.delete("/api/admin/users/:id", requireAdmin, async (req, res) => {
    try {
      const userId = parseInt(req.params.id);
      const success = await storage.deleteUserCompletely(userId);

      if (success) {
        res.json({ message: 'Utilisateur supprimé avec succès' });
      } else {
        res.status(404).json({ error: 'Utilisateur non trouvé' });
      }
    } catch (error) {
      console.error('Erreur suppression utilisateur admin:', error);
      res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
  });

  // Envoyer un message admin
  app.post("/api/admin/messages", requireAdmin, async (req, res) => {
    try {
      const { userId, content } = req.body;

      if (!userId || !content) {
        return res.status(400).json({ error: 'ID utilisateur et contenu requis' });
      }

      const adminMessage = await storage.createAdminMessage({
        recipientId: userId,
        content,
        sentAt: new Date()
      });

      // Créer une notification pour l'utilisateur
      await storage.createNotification(
        userId,
        'message',
        `Message de l'administration : ${content.substring(0, 50)}${content.length > 50 ? '...' : ''}`,
        req.user?.id
      );

      // Créer ou récupérer une conversation avec l'admin
      const participants = [req.user?.id || 0, userId].sort();
      let conversation = await storage.getConversationByParticipants(participants);

      if (!conversation) {
        conversation = await storage.createConversation({
          participants,
          isEncrypted: false
        });
      }

      // Créer le message dans la conversation
      await storage.createMessage({
        conversationId: conversation.id,
        senderId: req.user?.id || 0,
        content,
        type: 'text'
      });

      res.status(201).json(adminMessage);
    } catch (error) {
      console.error('Erreur envoi message admin:', error);
      res.status(500).json({ error: 'Erreur lors de l\'envoi du message' });
    }
  });

  // Récupérer les messages admin
  app.get("/api/admin/messages", requireAdmin, async (req, res) => {
    try {
      const messages = await storage.getAdminMessages();
      res.json(messages);
    } catch (error) {
      console.error('Erreur récupération messages admin:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des messages' });
    }
  });

  app.get("/api/admin/reports", requireAdmin, async (req, res) => {
    try {
      const reports = await storage.getReports();
      res.json(reports);
    } catch (error) {
      console.error('Erreur récupération signalements admin:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération des signalements' });
    }
  });

  // Traiter un signalement (admin)
  app.post("/api/admin/reports/:id/process", requireAdmin, async (req, res) => {
    try {
      const reportId = parseInt(req.params.id);
      const { status, adminNote } = req.body;

      if (!status) {
        return res.status(400).json({ error: 'Statut requis' });
      }

      const updatedReport = await storage.updateReportStatus(reportId, status, adminNote);

      if (updatedReport) {
        res.json(updatedReport);
      } else {
        res.status(404).json({ error: 'Signalement non trouvé' });
      }
    } catch (error) {
      console.error('Erreur traitement signalement admin:', error);
      res.status(500).json({ error: 'Erreur lors du traitement du signalement' });
    }
  });

  // Supprimer un Gbairai signalé (admin)
  app.delete("/api/admin/gbairais/:id", requireAdmin, async (req, res) => {
    try {
      const gbairaiId = parseInt(req.params.id);

      console.log(`Admin suppression gbairai ${gbairaiId}`);

      // Pour les admins, on supprime définitivement le gbairai
      const [result] = await db
        .update(gbairais)
        .set({
          status: 'deleted',
          // Optionnel: masquer le contenu
          content: '[Contenu supprimé par l\'administration]'
        })
        .where(eq(gbairais.id, gbairaiId))
        .returning();

      if (result) {
        console.log(`Gbairai ${gbairaiId} supprimé avec succès`);
        res.json({ message: 'Gbairai supprimé avec succès' });
      } else {
        console.log(`Gbairai ${gbairaiId} non trouvé`);
        res.status(404).json({ error: 'Gbairai non trouvé' });
      }
    } catch (error) {
      console.error('Erreur suppression gbairai admin:', error);
      res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
  });

  // Routes pour les blocages d'utilisateurs
  app.post("/api/users/:id/block", requireAuth, async (req, res) => {
    try {
      const blockedId = parseInt(req.params.id);
      const blockerId = req.user?.id || 0;

      if (blockedId === blockerId) {
        return res.status(400).json({ error: 'Vous ne pouvez pas vous bloquer vous-même' });
      }

      // Vérifier que l'utilisateur à bloquer n'est pas l'admin
      const userToBlock = await storage.getUser(blockedId);
      if (userToBlock?.email === 'gbairai.app@gmail.com') {
        return res.status(403).json({ error: 'Impossible de bloquer l\'administrateur' });
      }

      // Vérifier si déjà bloqué
      const isAlreadyBlocked = await storage.isBlocked(blockerId, blockedId);
      if (isAlreadyBlocked) {
        return res.status(400).json({ error: 'Utilisateur déjà bloqué' });
      }

      const block = await storage.blockUser(blockerId, blockedId);
      res.status(201).json(block);
    } catch (error) {
      console.error('Erreur blocage utilisateur:', error);
      res.status(500).json({ error: 'Erreur lors du blocage' });
    }
  });

  app.delete("/api/users/:id/block", requireAuth, async (req, res) => {
    try {
      const blockedId = parseInt(req.params.id);
      const blockerId = req.user?.id || 0;

      const success = await storage.unblockUser(blockerId, blockedId);
      if (!success) {
        return res.status(404).json({ error: 'Utilisateur non bloqué' });
      }

      res.json({ success: true });
    } catch (error) {
      console.error('Erreur déblocage utilisateur:', error);
      res.status(500).json({ error: 'Erreur lors du déblocage' });
    }
  });

  app.get("/api/blocked-users", requireAuth, async (req, res) => {
    try {
      const userId = req.user?.id || 0;
      const blockedUsers = await storage.getBlockedUsers(userId);
      res.json(blockedUsers);
    } catch (error) {
      console.error('Erreur récupération utilisateurs bloqués:', error);
      res.status(500).json({ error: 'Erreur lors de la récupération' });
    }
  });

  // Routes pour la suppression de conversations
  app.delete("/api/conversations/:id", requireAuth, async (req, res) => {
    try {
      const conversationId = parseInt(req.params.id);
      const userId = req.user?.id || 0;

      // Vérifier que l'utilisateur fait partie de la conversation
      const conversation = await storage.getConversationById(conversationId);
      if (!conversation) {
        return res.status(404).json({ error: 'Conversation non trouvée' });
      }

      const participants = conversation.participants as number[];
      if (!participants.includes(userId)) {
        return res.status(403).json({ error: 'Accès non autorisé' });
      }

      // Supprimer la conversation pour cet utilisateur
      await storage.deleteConversationForUser(conversationId, userId);
      res.json({ success: true });
    } catch (error) {
      console.error('Erreur suppression conversation:', error);
      res.status(500).json({ error: 'Erreur lors de la suppression' });
    }
  });

  // Route de santé
  app.get("/api/health", (req, res) => {
    res.status(200).json({
      status: 'OK',
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    });
  });

  // Route 404 pour les API non trouvées
  app.use('/api/*', (req, res) => {
    console.log(`❌ API route not found: ${req.method} ${req.path}`);
    res.status(404).json({
      error: 'API endpoint not found',
      path: req.path,
      method: req.method,
      timestamp: new Date().toISOString()
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}