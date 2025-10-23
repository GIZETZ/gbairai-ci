# Système de Publication avec IA - Gbairai PWA

## Vue d'ensemble

Le système de publication avec IA est une fonctionnalité avancée qui analyse automatiquement le contenu des Gbairais pour détecter les émotions, valider le contenu et enrichir l'expérience utilisateur. Il utilise une approche hybride combinant l'API OpenRouter et un fallback local avec dictionnaire ivoirien.

## Architecture du système

### Composants principaux

1. **Interface de publication** - Formulaire utilisateur avec validation temps réel
2. **Service d'analyse IA** - Traitement automatique des émotions
3. **Dictionnaire local** - Expressions ivoiriennes (nouchi) pour fallback
4. **Validation de contenu** - Filtrage anti-spam et modération
5. **Gestion des brouillons** - Sauvegarde automatique locale

## Implémentation technique

### 1. Interface de publication
```typescript
// client/src/components/Gbairai/GbairaiForm.tsx
interface GbairaiFormProps {
  onSubmit: (gbairai: NewGbairai) => void;
  onDraftSave: (draft: Draft) => void;
  initialData?: Partial<NewGbairai>;
}

const GbairaiForm: React.FC<GbairaiFormProps> = ({
  onSubmit,
  onDraftSave,
  initialData
}) => {
  const [content, setContent] = useState(initialData?.content || '');
  const [selectedEmotion, setSelectedEmotion] = useState<string | null>(null);
  const [suggestedEmotions, setSuggestedEmotions] = useState<EmotionSuggestion[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [location, setLocation] = useState<LocationData | null>(null);
  const [isAnonymous, setIsAnonymous] = useState(true);

  // Analyse automatique du contenu
  const analyzeContent = useCallback(
    debounce(async (text: string) => {
      if (text.length < 10) return;
      
      setIsAnalyzing(true);
      try {
        const response = await fetch('/api/analyze-emotion', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text, language: 'fr-ci' })
        });
        
        const result = await response.json();
        setSuggestedEmotions(result.suggestions);
        
        // Auto-sélection si confiance élevée
        if (result.suggestions[0]?.confidence > 0.8) {
          setSelectedEmotion(result.suggestions[0].emotion);
        }
      } catch (error) {
        console.error('Erreur analyse:', error);
      } finally {
        setIsAnalyzing(false);
      }
    }, 500),
    []
  );

  // Sauvegarde automatique des brouillons
  useEffect(() => {
    if (content.length > 0) {
      const draft: Draft = {
        id: Date.now().toString(),
        content,
        emotion: selectedEmotion,
        location,
        createdAt: new Date(),
        lastModified: new Date()
      };
      onDraftSave(draft);
    }
  }, [content, selectedEmotion, location]);

  // Analyser le contenu quand il change
  useEffect(() => {
    analyzeContent(content);
  }, [content, analyzeContent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!content.trim() || !selectedEmotion) {
      toast.error('Veuillez remplir tous les champs requis');
      return;
    }

    const newGbairai: NewGbairai = {
      content: content.trim(),
      emotion: selectedEmotion,
      location: location || await getCurrentLocation(),
      isAnonymous,
      metadata: {
        suggestedEmotions,
        userSelected: selectedEmotion !== suggestedEmotions[0]?.emotion
      }
    };

    onSubmit(newGbairai);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Zone de texte principale */}
      <div className="relative">
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Partagez votre gbairai..."
          className="w-full h-32 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          maxLength={280}
        />
        
        {/* Compteur de caractères */}
        <div className="absolute bottom-2 right-2 text-sm text-gray-500">
          {content.length}/280
        </div>
        
        {/* Indicateur d'analyse */}
        {isAnalyzing && (
          <div className="absolute top-2 right-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
          </div>
        )}
      </div>

      {/* Sélecteur d'émotion avec suggestions IA */}
      <EmotionSelector
        selectedEmotion={selectedEmotion}
        onEmotionSelect={setSelectedEmotion}
        suggestions={suggestedEmotions}
        isAnalyzing={isAnalyzing}
      />

      {/* Sélecteur de localisation */}
      <LocationSelector
        location={location}
        onLocationChange={setLocation}
        showMap={false}
      />

      {/* Options de publication */}
      <div className="flex items-center space-x-4">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={isAnonymous}
            onChange={(e) => setIsAnonymous(e.target.checked)}
            className="mr-2"
          />
          Publication anonyme
        </label>
      </div>

      {/* Bouton de soumission */}
      <button
        type="submit"
        disabled={!content.trim() || !selectedEmotion}
        className="w-full bg-blue-500 text-white py-3 px-6 rounded-lg font-semibold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-blue-600 transition-colors"
      >
        Publier le Gbairai
      </button>
    </form>
  );
};
```

### 2. Service d'analyse IA
```typescript
// server/services/emotionAnalysis.ts
interface EmotionAnalysisResult {
  emotion: string;
  confidence: number;
  localTerms: string[];
  suggestions: EmotionSuggestion[];
}

interface EmotionSuggestion {
  emotion: string;
  confidence: number;
  reasoning: string;
}

export class EmotionAnalysisService {
  private static instance: EmotionAnalysisService;
  private openRouterClient: OpenRouterClient;
  private localDictionary: IvoirianDictionary;

  constructor() {
    this.openRouterClient = new OpenRouterClient(process.env.OPENROUTER_API_KEY);
    this.localDictionary = new IvoirianDictionary();
  }

  static getInstance(): EmotionAnalysisService {
    if (!this.instance) {
      this.instance = new EmotionAnalysisService();
    }
    return this.instance;
  }

  async analyzeEmotion(text: string, language = 'fr-ci'): Promise<EmotionAnalysisResult> {
    try {
      // Tentative d'analyse avec OpenRouter
      const aiResult = await this.analyzeWithOpenRouter(text, language);
      if (aiResult.confidence > 0.6) {
        return aiResult;
      }
    } catch (error) {
      console.warn('OpenRouter analysis failed:', error.message);
    }

    // Fallback vers l'analyse locale
    return this.analyzeLocally(text, language);
  }

  private async analyzeWithOpenRouter(text: string, language: string): Promise<EmotionAnalysisResult> {
    const prompt = this.buildAnalysisPrompt(text, language);
    
    const response = await this.openRouterClient.chat({
      model: 'anthropic/claude-3-haiku',
      messages: [
        {
          role: 'system',
          content: 'Tu es un expert en analyse d\'émotions pour le contexte ivoirien. Analyse les textes en français et en nouchi (argot ivoirien).'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      max_tokens: 300,
      temperature: 0.1
    });

    return this.parseOpenRouterResponse(response.choices[0].message.content);
  }

  private buildAnalysisPrompt(text: string, language: string): string {
    return `
Analyse l'émotion principale de ce texte en tenant compte du contexte ivoirien et des expressions nouchi :

"${text}"

Émotions possibles : joie, colère, tristesse, amour, suspens, calme, inclassable

Réponds au format JSON :
{
  "emotion": "emotion_detectee",
  "confidence": 0.85,
  "reasoning": "explication courte",
  "localTerms": ["termes", "nouchi", "detectes"],
  "suggestions": [
    {
      "emotion": "joie",
      "confidence": 0.85,
      "reasoning": "Présence de termes positifs"
    },
    {
      "emotion": "calme",
      "confidence": 0.3,
      "reasoning": "Ton posé du message"
    }
  ]
}

Prends en compte les expressions ivoiriennes typiques :
- "Même pas fatigue" = confiance, joie
- "Ça va aller" = espoir, calme
- "Ça me chauffe" = colère, énervement
- "J'ai le cœur serré" = tristesse
- "Mon dja" = amour, affection
- "Gbagba" = problème, suspens
`;
  }

  private parseOpenRouterResponse(response: string): EmotionAnalysisResult {
    try {
      const parsed = JSON.parse(response);
      return {
        emotion: parsed.emotion,
        confidence: parsed.confidence,
        localTerms: parsed.localTerms || [],
        suggestions: parsed.suggestions || []
      };
    } catch (error) {
      throw new Error('Erreur parsing réponse OpenRouter');
    }
  }

  private analyzeLocally(text: string, language: string): EmotionAnalysisResult {
    const normalizedText = text.toLowerCase();
    const emotions = this.localDictionary.getEmotions();
    const results: EmotionSuggestion[] = [];

    // Analyser pour chaque émotion
    emotions.forEach(emotion => {
      const score = this.calculateEmotionScore(normalizedText, emotion);
      if (score > 0.1) {
        results.push({
          emotion: emotion.name,
          confidence: score,
          reasoning: `Détection locale: ${emotion.triggers.filter(t => normalizedText.includes(t)).join(', ')}`
        });
      }
    });

    // Trier par confiance
    results.sort((a, b) => b.confidence - a.confidence);

    const topEmotion = results[0] || {
      emotion: 'inclassable',
      confidence: 0.5,
      reasoning: 'Aucune émotion claire détectée'
    };

    return {
      emotion: topEmotion.emotion,
      confidence: topEmotion.confidence,
      localTerms: this.extractLocalTerms(normalizedText),
      suggestions: results.slice(0, 3)
    };
  }

  private calculateEmotionScore(text: string, emotion: EmotionDefinition): number {
    let score = 0;
    let matchCount = 0;

    // Vérifier les mots déclencheurs
    emotion.triggers.forEach(trigger => {
      if (text.includes(trigger)) {
        score += emotion.weight;
        matchCount++;
      }
    });

    // Vérifier les expressions nouchi
    emotion.nouchExpressions?.forEach(expr => {
      if (text.includes(expr.toLowerCase())) {
        score += emotion.weight * 1.5; // Bonus pour nouchi
        matchCount++;
      }
    });

    // Normaliser le score
    return matchCount > 0 ? Math.min(score / (matchCount * 2), 1) : 0;
  }

  private extractLocalTerms(text: string): string[] {
    const nouchTerms = this.localDictionary.getNouchTerms();
    return nouchTerms.filter(term => text.includes(term.toLowerCase()));
  }
}
```

### 3. Dictionnaire ivoirien
```typescript
// server/services/ivoirianDictionary.ts
interface EmotionDefinition {
  name: string;
  triggers: string[];
  nouchExpressions: string[];
  weight: number;
}

export class IvoirianDictionary {
  private emotions: EmotionDefinition[] = [
    {
      name: 'joie',
      triggers: ['content', 'heureux', 'joie', 'bonheur', 'réussi', 'gagné', 'fête'],
      nouchExpressions: [
        'même pas fatigue',
        'c\'est chaud',
        'ça gâte pas',
        'on est ensemble',
        'ça va aller',
        'c\'est bon',
        'top niveau',
        'ça me fait plaisir'
      ],
      weight: 0.8
    },
    {
      name: 'colère',
      triggers: ['énervé', 'furieux', 'colère', 'marre', 'agacé', 'insulte'],
      nouchExpressions: [
        'ça me chauffe',
        'j\'ai chaud',
        'ça m\'énerve',
        'c\'est fort',
        'tu me cherches',
        'ça gâte',
        'je suis vexé',
        'ça me saoule'
      ],
      weight: 0.9
    },
    {
      name: 'tristesse',
      triggers: ['triste', 'pleure', 'déprimé', 'malheureux', 'difficile', 'problème'],
      nouchExpressions: [
        'j\'ai le cœur serré',
        'c\'est dur',
        'ça fait mal',
        'je pleure',
        'c\'est difficile',
        'ça me touche',
        'je suis down',
        'c\'est triste'
      ],
      weight: 0.8
    },
    {
      name: 'amour',
      triggers: ['amour', 'aime', 'chéri', 'cœur', 'romantique', 'couple'],
      nouchExpressions: [
        'mon dja',
        'ma go',
        'mon bébé',
        'je t\'aime',
        'mon cœur',
        'ma chérie',
        'mon amour',
        'tu me manques'
      ],
      weight: 0.9
    },
    {
      name: 'suspens',
      triggers: ['attendre', 'inquiet', 'mystère', 'surprise', 'tension', 'stress'],
      nouchExpressions: [
        'gbagba',
        'c\'est louche',
        'ça m\'inquiète',
        'j\'ai peur',
        'c\'est bizarre',
        'ça me stresse',
        'je sais pas',
        'ça me préoccupe'
      ],
      weight: 0.7
    },
    {
      name: 'calme',
      triggers: ['calme', 'tranquille', 'paisible', 'relaxé', 'serein', 'zen'],
      nouchExpressions: [
        'ça va aller',
        'tout est bon',
        'on est calme',
        'tranquille',
        'c\'est cool',
        'pas de problème',
        'on gère',
        'tout va bien'
      ],
      weight: 0.6
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
}
```

### 4. Validation et modération
```typescript
// server/services/contentValidation.ts
interface ValidationResult {
  isValid: boolean;
  issues: string[];
  confidence: number;
  suggestedChanges?: string[];
}

export class ContentValidationService {
  private spamKeywords = [
    'viagra', 'casino', 'promo', 'gratuit', 'urgent', 'cliquez',
    'gagner', 'argent facile', 'opportunité', 'business'
  ];

  private inappropriateContent = [
    'insultes', 'violence', 'haine', 'discrimination',
    'contenu sexuel explicite', 'drogues', 'armes'
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

    return Math.min(spamScore, 1);
  }

  private detectInappropriate(content: string): number {
    // Implémentation simplifiée
    // En production, utiliser une API de modération plus avancée
    const normalizedContent = content.toLowerCase();
    let inappropriateScore = 0;

    const inappropriateKeywords = [
      'connard', 'salope', 'putain', 'merde', 'bordel',
      'violence', 'tuer', 'mort', 'suicide'
    ];

    inappropriateKeywords.forEach(keyword => {
      if (normalizedContent.includes(keyword)) {
        inappropriateScore += 0.3;
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

    return suggestions;
  }
}
```

## API Routes

### Route d'analyse
```typescript
// server/routes/gbairais.ts
import { EmotionAnalysisService } from '../services/emotionAnalysis';
import { ContentValidationService } from '../services/contentValidation';

router.post('/analyze-emotion', async (req, res) => {
  try {
    const { text, language = 'fr-ci' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Texte requis' });
    }

    const analysisService = EmotionAnalysisService.getInstance();
    const result = await analysisService.analyzeEmotion(text, language);

    res.json({
      success: true,
      emotion: result.emotion,
      confidence: result.confidence,
      suggestions: result.suggestions,
      localTerms: result.localTerms
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/validate-content', async (req, res) => {
  try {
    const { content } = req.body;
    
    const validationService = new ContentValidationService();
    const result = await validationService.validateContent(content);

    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { content, emotion, location, isAnonymous } = req.body;
    
    // Validation du contenu
    const validationService = new ContentValidationService();
    const validation = await validationService.validateContent(content);
    
    if (!validation.isValid) {
      return res.status(400).json({
        error: 'Contenu invalide',
        issues: validation.issues,
        suggestions: validation.suggestedChanges
      });
    }

    // Créer le Gbairai
    const gbairai = await storage.createGbairai({
      userId: req.user.id,
      content,
      emotion,
      location,
      isAnonymous: isAnonymous !== false
    });

    res.status(201).json(gbairai);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Optimisations et performance

### Cache intelligent
```typescript
// server/services/cacheService.ts
export class CacheService {
  private cache = new Map<string, any>();
  private ttl = new Map<string, number>();

  set(key: string, value: any, ttlMs = 300000): void {
    this.cache.set(key, value);
    this.ttl.set(key, Date.now() + ttlMs);
  }

  get(key: string): any {
    if (this.ttl.get(key)! < Date.now()) {
      this.cache.delete(key);
      this.ttl.delete(key);
      return null;
    }
    return this.cache.get(key);
  }
}
```

### Debouncing côté client
```typescript
// client/src/hooks/useDebounce.ts
export function useDebounce<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}
```

Ce système de publication avec IA offre une expérience utilisateur intelligente et culturellement adaptée, tout en maintenant la qualité du contenu et la sécurité de la plateforme.