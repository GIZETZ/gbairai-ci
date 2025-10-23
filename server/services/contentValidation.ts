interface ValidationResult {
  isValid: boolean;
  issues: string[];
  confidence: number;
  suggestedChanges?: string[];
}

export class ContentValidationService {
  private spamKeywords = [
    'viagra', 'casino', 'promo', 'gratuit', 'urgent', 'cliquez',
    'gagner', 'argent facile', 'opportunité', 'business', 'mlm'
  ];

  private inappropriateKeywords = [
    'connard', 'salope', 'putain', 'merde', 'bordel',
    'violence', 'tuer', 'mort', 'suicide', 'haine'
  ];

  async validateContent(content: string): Promise<ValidationResult> {
    const issues: string[] = [];
    let confidence = 1.0;

    // Vérifier la longueur
    if (content.length < 5) {
      issues.push('Contenu trop court');
      confidence -= 0.3;
    }

    if (content.length > 280) {
      issues.push('Contenu trop long (max 280 caractères)');
      confidence -= 0.5;
    }

    // Détecter le spam
    const spamScore = this.detectSpam(content);
    if (spamScore > 0.7) {
      issues.push('Contenu potentiellement spam');
      confidence -= 0.4;
    }

    // Détecter le contenu inapproprié
    const inappropriateScore = this.detectInappropriate(content);
    if (inappropriateScore > 0.6) {
      issues.push('Contenu potentiellement inapproprié');
      confidence -= 0.6;
    }

    // Vérifier la répétition
    if (this.hasExcessiveRepetition(content)) {
      issues.push('Répétition excessive de caractères');
      confidence -= 0.2;
    }

    return {
      isValid: issues.length === 0 && confidence > 0.5,
      issues,
      confidence: Math.max(confidence, 0),
      suggestedChanges: this.generateSuggestions(content, issues)
    };
  }

  private detectSpam(content: string): number {
    const normalizedContent = content.toLowerCase();
    let spamScore = 0;

    this.spamKeywords.forEach(keyword => {
      if (normalizedContent.includes(keyword)) {
        spamScore += 0.2;
      }
    });

    // Vérifier les caractères répétés
    if (/(.)\1{4,}/.test(content)) {
      spamScore += 0.3;
    }

    // Vérifier les majuscules excessives
    const upperCaseRatio = (content.match(/[A-Z]/g) || []).length / content.length;
    if (upperCaseRatio > 0.5) {
      spamScore += 0.2;
    }

    // Vérifier les liens suspects
    if (content.includes('http') || content.includes('www.')) {
      spamScore += 0.1;
    }

    return Math.min(spamScore, 1);
  }

  private detectInappropriate(content: string): number {
    const normalizedContent = content.toLowerCase();
    let inappropriateScore = 0;

    this.inappropriateKeywords.forEach(keyword => {
      if (normalizedContent.includes(keyword)) {
        inappropriateScore += 0.3;
      }
    });

    // Vérifier les expressions de haine
    const hatePatterns = [
      /je déteste/i,
      /je hais/i,
      /crève/i,
      /va mourir/i
    ];

    hatePatterns.forEach(pattern => {
      if (pattern.test(content)) {
        inappropriateScore += 0.2;
      }
    });

    return Math.min(inappropriateScore, 1);
  }

  private hasExcessiveRepetition(content: string): boolean {
    return /(.)\1{3,}/.test(content) || /(\w+)\s+\1\s+\1/.test(content);
  }

  private generateSuggestions(content: string, issues: string[]): string[] {
    const suggestions: string[] = [];

    if (issues.includes('Contenu trop court')) {
      suggestions.push('Ajoutez plus de détails à votre message');
    }

    if (issues.includes('Contenu trop long (max 280 caractères)')) {
      suggestions.push('Raccourcissez votre message');
    }

    if (issues.includes('Répétition excessive de caractères')) {
      suggestions.push('Évitez de répéter les mêmes caractères');
    }

    if (issues.includes('Contenu potentiellement spam')) {
      suggestions.push('Évitez les termes promotionnels');
    }

    if (issues.includes('Contenu potentiellement inapproprié')) {
      suggestions.push('Utilisez un langage plus respectueux');
    }

    return suggestions;
  }
}
