
import dns from 'dns';
import { promisify } from 'util';

const resolveMx = promisify(dns.resolveMx);

export interface EmailValidationResult {
  isValid: boolean;
  exists: boolean;
  issues: string[];
  domain: string;
}

export class EmailValidationService {
  private static readonly EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

  static async validateEmail(email: string): Promise<EmailValidationResult> {
    const issues: string[] = [];
    let isValid = true;
    let exists = false;

    // Vérification du format
    if (!this.EMAIL_REGEX.test(email)) {
      issues.push('Format d\'email invalide');
      isValid = false;
    }

    const domain = email.split('@')[1];
    
    if (!domain) {
      issues.push('Domaine manquant');
      isValid = false;
    } else {
      // Vérification de l'existence du domaine
      try {
        const mxRecords = await resolveMx(domain);
        if (mxRecords && mxRecords.length > 0) {
          exists = true;
        } else {
          issues.push('Domaine email inexistant');
          isValid = false;
        }
      } catch (error) {
        issues.push('Impossible de vérifier le domaine');
        isValid = false;
      }
    }

    // Vérification des domaines temporaires/jetables
    if (this.isDisposableEmail(domain)) {
      issues.push('Les emails temporaires ne sont pas autorisés');
      isValid = false;
    }

    return {
      isValid,
      exists,
      issues,
      domain
    };
  }

  private static isDisposableEmail(domain: string): boolean {
    if (!domain) return false;
    
    const disposableDomains = [
      '10minutemail.com',
      'tempmail.org',
      'guerrillamail.com',
      'mailinator.com',
      'yopmail.com',
      'temp-mail.org',
      'throwaway.email',
      'fakeinbox.com'
    ];

    return disposableDomains.includes(domain.toLowerCase());
  }
}
