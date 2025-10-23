
declare global {
  interface Window {
    emailjs: any;
  }
}

interface EmailJSConfig {
  publicKey: string;
  serviceId: string;
  templateId: string;
}

export class ClientEmailService {
  // Envoie une demande au backend pour envoyer un code par email
  async sendVerificationCode(email: string, type: string, username?: string): Promise<any> {
    try {
      // Générer le code côté serveur
      const response = await fetch('/api/send-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          type,
          username
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Erreur lors de l\'envoi du code');
      }

      const result = await response.json();
      
      // Si on a les données d'email, envoyer via EmailJS côté client
      if (result.emailData && window.emailjs) {
        try {
          const emailParams = {
            to_email: result.emailData.email,
            to_name: result.emailData.toName,
            verification_code: result.emailData.code,
            message: result.emailData.message
          };

          await window.emailjs.send("template_1", "template_1", emailParams);
          console.log('Email envoyé avec succès via EmailJS');
        } catch (emailError) {
          console.error('Erreur envoi EmailJS côté client:', emailError);
          // En développement, continuer même si l'envoi échoue
          if (process.env.NODE_ENV !== 'development') {
            throw new Error('Impossible d\'envoyer l\'email');
          }
        }
      }

      return result;
    } catch (error) {
      console.error('Erreur envoi code:', error);
      throw error;
    }
  }

  // Vérifie un code avec le backend
  async verifyCode(email: string, code: string, type: string): Promise<boolean> {
    try {
      const response = await fetch('/api/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          code,
          type
        })
      });

      if (!response.ok) {
        const error = await response.json();
        console.error('Erreur vérification:', error);
        return false;
      }

      const result = await response.json();
      return result.success;
    } catch (error) {
      console.error('Erreur vérification code:', error);
      return false;
    }
  }
}

export const clientEmailService = new ClientEmailService();
