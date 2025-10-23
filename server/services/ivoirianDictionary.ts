interface EmotionDefinition {
  name: string;
  triggers: string[];
  nouchExpressions: string[];
  weight: number;
}

export class IvoirianDictionary {
  private emotions: EmotionDefinition[] = [
    {
      name: 'enjaillé',
      triggers: ['content', 'heureux', 'joie', 'bonheur', 'réussi', 'gagné', 'fête', 'bien', 'super', 'génial'],
      nouchExpressions: [
        'même pas fatigue',
        'c\'est chaud',
        'ça gâte pas',
        'on est ensemble',
        'ça va aller',
        'c\'est bon',
        'top niveau',
        'ça me fait plaisir',
        'c\'est sweet',
        'ça déchire',
        'on est là'
      ],
      weight: 0.8
    },
    {
      name: 'nerveux',
      triggers: ['énervé', 'furieux', 'colère', 'marre', 'agacé', 'insulte', 'chauffe', 'énerve'],
      nouchExpressions: [
        'ça me chauffe',
        'j\'ai chaud',
        'ça m\'énerve',
        'c\'est fort',
        'tu me cherches',
        'ça gâte',
        'je suis vexé',
        'ça me saoule',
        'c\'est trop là',
        'ça va chauffer',
        'je suis hot'
      ],
      weight: 0.9
    },
    {
      name: 'goumin',
      triggers: ['triste', 'pleure', 'déprimé', 'malheureux', 'difficile', 'problème', 'mort', 'serré'],
      nouchExpressions: [
        'j\'ai le cœur serré',
        'c\'est dur',
        'ça fait mal',
        'je pleure',
        'c\'est difficile',
        'ça me touche',
        'je suis down',
        'c\'est triste',
        'ça me fait mal',
        'je suis pas bien',
        'c\'est compliqué'
      ],
      weight: 0.8
    },
    {
      name: 'trop fan',
      triggers: ['amour', 'aime', 'chéri', 'cœur', 'romantique', 'couple', 'manque'],
      nouchExpressions: [
        'mon dja',
        'ma go',
        'mon bébé',
        'je t\'aime',
        'mon cœur',
        'ma chérie',
        'mon amour',
        'tu me manques',
        'ma doudou',
        'on est ensemble',
        'je suis gâté',
        'tu me fais craquer'
      ],
      weight: 0.7
    },
    {
      name: 'Mais Ahy?',
      triggers: ['étrange', 'bizarre', 'suspens', 'mystère', 'comprends pas', 'quoi', 'comment', 'pourquoi'],
      nouchExpressions: [
        'mais ahy?',
        'c\'est comment?',
        'je comprends pas',
        'c\'est bizarre',
        'qu\'est-ce qui se passe?',
        'c\'est quoi ça?',
        'j\'ai pas compris',
        'c\'est étrange',
        'mais comment?',
        'qu\'est-ce que c\'est?'
      ],
      weight: 0.6
    },
    {
      name: 'Légé',
      triggers: ['calme', 'tranquille', 'serein', 'paisible', 'cool', 'relax', 'zen', 'posé'],
      nouchExpressions: [
        'légé légé',
        'c\'est cool',
        'on est tranquille',
        'pas de stress',
        'c\'est posé',
        'on gère',
        'c\'est zen',
        'tout va bien',
        'on est relax',
        'c\'est soft'
      ],
      weight: 0.5
    },
    {
      name: 'inclassable',
      triggers: ['autre', 'différent', 'spécial', 'unique', 'personnalisé'],
      nouchExpressions: [
        'c\'est spécial',
        'c\'est unique',
        'c\'est différent',
        'c\'est particulier',
        'c\'est mon truc',
        'c\'est personnel'
      ],
      weight: 0.3
    }
  ];

  getEmotions(): EmotionDefinition[] {
    return this.emotions;
  }

  getNouchTerms(): string[] {
    return this.emotions
      .flatMap(e => e.nouchExpressions)
      .sort()
      .filter((term, index, array) => array.indexOf(term) === index);
  }

  getEmotionByName(name: string): EmotionDefinition | undefined {
    return this.emotions.find(e => e.name === name);
  }

  analyzeText(text: string): { emotion: string; confidence: number; matchedTerms: string[] } {
    const normalizedText = text.toLowerCase();
    const results: { emotion: string; confidence: number; matchedTerms: string[] }[] = [];

    this.emotions.forEach(emotion => {
      const score = this.calculateEmotionScore(normalizedText, emotion);
      if (score.confidence > 0.1) {
        results.push({
          emotion: emotion.name,
          confidence: score.confidence,
          matchedTerms: score.matchedTerms
        });
      }
    });

    // Trier par confiance
    results.sort((a, b) => b.confidence - a.confidence);

    return results[0] || {
      emotion: 'inclassable',
      confidence: 0.5,
      matchedTerms: []
    };
  }

  private calculateEmotionScore(text: string, emotion: EmotionDefinition): { confidence: number; matchedTerms: string[] } {
    let score = 0;
    let matchCount = 0;
    const matchedTerms: string[] = [];

    // Vérifier les mots déclencheurs
    emotion.triggers.forEach(trigger => {
      if (text.includes(trigger)) {
        score += emotion.weight;
        matchCount++;
        matchedTerms.push(trigger);
      }
    });

    // Vérifier les expressions nouchi (bonus)
    emotion.nouchExpressions.forEach(expr => {
      if (text.includes(expr.toLowerCase())) {
        score += emotion.weight * 1.5; // Bonus pour nouchi
        matchCount++;
        matchedTerms.push(expr);
      }
    });

    // Normaliser le score
    const confidence = matchCount > 0 ? Math.min(score / (matchCount * 2), 1) : 0;

    return { confidence, matchedTerms };
  }
}
