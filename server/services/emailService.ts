
import crypto from 'crypto';
import fetch from 'node-fetch';

interface VerificationCode {
  code: string;
  email: string;
  expiresAt: Date;
  type: 'registration' | 'login' | 'password_reset';
}

export class EmailService {
  private verificationCodes: Map<string, VerificationCode> = new Map();
  private publicKey: string;
  private serviceId: string;
  private templateId: string;

  constructor() {
    this.publicKey = "80uppJ5N5LVthj_SB";
    this.serviceId = "template_1";
    this.templateId = "template_1";  // Utilisez l'ID par défaut ou créez un nouveau template
  }

  generateVerificationCode(): string {
    return crypto.randomInt(100000, 999999).toString();
  }

  async sendVerificationEmail(
    email: string, 
    type: 'registration' | 'login' | 'password_reset',
    username?: string
  ): Promise<string> {
    const code = this.generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Stocker le code
    this.verificationCodes.set(email, {
      code,
      email,
      expiresAt,
      type
    });

    // En mode développement, afficher le code
    if (process.env.NODE_ENV === 'development') {
      console.log(`[DEV] Code de vérification pour ${email}: ${code}`);
    }

    // Ne pas envoyer l'email côté serveur - sera fait côté client
    console.log(`Code généré pour ${email}, envoi délégué au client`);

    return code;
  }

  private async sendEmailViaEmailJS(
    email: string, 
    code: string, 
    type: string, 
    username?: string
  ): Promise<void> {
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

    const params = {
      service_id: this.serviceId,
      template_id: this.templateId,
      user_id: this.publicKey,
      template_params: {
        user_email: email,
        verification_code: code,
        subject: subject,
        message: message,
        to_name: username || 'Utilisateur'
      }
    };

    const response = await fetch('https://api.emailjs.com/api/v1.0/email/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`EmailJS API error: ${response.status} - ${errorText}`);
    }
  }

  verifyCode(email: string, code: string, type: 'registration' | 'login' | 'password_reset'): boolean {
    const stored = this.verificationCodes.get(email);

    if (!stored) {
      console.log(`Code non trouvé pour ${email}`);
      return false;
    }

    if (stored.type !== type) {
      console.log(`Type incorrect pour ${email}: attendu ${type}, reçu ${stored.type}`);
      return false;
    }

    if (new Date() > stored.expiresAt) {
      console.log(`Code expiré pour ${email}`);
      this.verificationCodes.delete(email);
      return false;
    }

    if (stored.code !== code) {
      console.log(`Code incorrect pour ${email}: attendu ${stored.code}, reçu ${code}`);
      return false;
    }

    // Code valide, le supprimer
    this.verificationCodes.delete(email);
    console.log(`Code vérifié avec succès pour ${email}`);
    return true;
  }

  cleanupExpiredCodes(): void {
    const now = new Date();
    for (const [email, verification] of this.verificationCodes.entries()) {
      if (now > verification.expiresAt) {
        this.verificationCodes.delete(email);
      }
    }
  }

  // Méthode pour obtenir les informations EmailJS côté client
  getEmailJSConfig() {
    return {
      publicKey: this.publicKey,
      serviceId: this.serviceId,
      templateId: this.templateId
    };
  }

  // Méthode pour déboguer les codes stockés
  getStoredCodes() {
    if (process.env.NODE_ENV === 'development') {
      return Array.from(this.verificationCodes.entries());
    }
    return [];
  }
}

export const emailService = new EmailService();

// Nettoyage automatique des codes expirés toutes les 5 minutes
setInterval(() => {
  emailService.cleanupExpiredCodes();
}, 5 * 60 * 1000);
