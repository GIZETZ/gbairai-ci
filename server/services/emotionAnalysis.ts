import { EmotionSuggestion, EmotionAnalysisResult } from "@shared/schema";
import { IvoirianDictionary } from "./ivoirianDictionary";

interface OpenRouterResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
}

export class EmotionAnalysisService {
  private static instance: EmotionAnalysisService;
  private localDictionary: IvoirianDictionary;
  private openRouterApiKey: string;

  constructor() {
    this.localDictionary = new IvoirianDictionary();
    // Utilise la même clé que la modération
    this.openRouterApiKey = process.env.OPENROUTER_CHECK_WORD || process.env.OPENAI_API_KEY || '';
  }

  static getInstance(): EmotionAnalysisService {
    if (!this.instance) {
      this.instance = new EmotionAnalysisService();
    }
    return this.instance;
  }

  async analyzeEmotion(text: string, language = 'fr-ci'): Promise<EmotionAnalysisResult> {
    try {
      // Validation du texte d'entrée
      if (!text || text.trim().length === 0) {
        return {
          emotion: 'calme',
          confidence: 0.5,
          localTerms: [],
          suggestions: [],
        };
      }
      // Tentative d'analyse avec OpenRouter si la clé API est disponible
      if (this.openRouterApiKey) {
        const aiResult = await this.analyzeWithOpenRouter(text, language);
        if (aiResult.confidence > 0.6) {
          return aiResult;
        }
      }
    } catch (error) {
      console.warn('OpenRouter analysis failed:', error);
    }

    // Fallback vers l'analyse locale améliorée
    return this.analyzeLocally(text, language);
  }

  private async analyzeWithOpenRouter(text: string, language: string): Promise<EmotionAnalysisResult> {
    try {
      // Vérifier que la clé API est disponible
      if (!process.env.OPENROUTER_API_KEY) {
        throw new Error('Clé API OpenRouter manquante');
      }

      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${process.env.OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
          "X-Title": "Gbairai App",
        },
        body: JSON.stringify({
          model: "openai/gpt-4o-mini",
          messages: [
            {
              role: "system",
              content: 'Tu es un expert en analyse d\'émotions pour le contexte ivoirien. Analyse les textes en français et en nouchi (argot ivoirien).'
            },
            {
              role: "user",
              content: `Analyse cette phrase: "${text}"`
            }
          ],
          max_tokens: 300,
          temperature: 0.3
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
      }

      const data: OpenRouterResponse = await response.json();

      if (!data.choices || !data.choices[0] || !data.choices[0].message) {
          throw new Error('Structure de réponse OpenRouter invalide');
      }

      const content = data.choices[0].message.content;

      if (!content) {
        throw new Error('Pas de contenu dans la réponse OpenRouter');
      }

      const suggestions = this.parseOpenRouterResponse(content);

      return {
        emotion: suggestions[0]?.emotion || 'calme',
        confidence: suggestions[0]?.confidence || 0.5,
        localTerms: [],
        suggestions: suggestions || []
      };
    } catch (error) {
      console.error('Erreur OpenRouter:', error);
      return {
          emotion: 'calme',
          confidence: 0.3,
          localTerms: [],
          suggestions: [],
      };
    }
  }

  private buildAnalysisPrompt(text: string, language: string): string {
    return `
Analyse l'émotion principale de ce texte en tenant compte du contexte ivoirien et des expressions nouchi :

"${text}"

Émotions possibles : joie, colère, tristesse, amour, suspens, calme, Personalisé

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
- "Ramba" = problème, suspens
`;
  }

  private parseOpenRouterResponse(content: string): EmotionSuggestion[] {
    try {
      // Nettoyer la réponse (enlever les marqueurs markdown si présents)
      let cleanContent = content.replace(/```json\n?|\n?```/g, '').trim();

      // Si la réponse commence par du texte avant le JSON, extraire seulement le JSON
      const jsonMatch = cleanContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        cleanContent = jsonMatch[0];
      }

      const parsed = JSON.parse(cleanContent);

      if (parsed.emotions && Array.isArray(parsed.emotions)) {
        return parsed.emotions.map((emotion: any) => ({
          emotion: emotion.emotion || 'calme',
          confidence: Math.min(Math.max(emotion.confidence || 0.5, 0), 1),
          reason: emotion.reason || 'Analyse automatique'
        }));
      }

      // Si ce n'est pas dans le format attendu, retourner une suggestion par défaut
      return [{
        emotion: 'calme',
        confidence: 0.3,
        reason: 'Format de réponse inattendu'
      }];
    } catch (error) {
      console.error('Erreur parsing réponse OpenRouter:', error);
      console.error('Contenu reçu:', content);

      // Au lieu de lancer une erreur, retourner une suggestion par défaut
      return [{
        emotion: 'calme',
        confidence: 0.3,
        reason: 'Erreur d\'analyse - suggestion par défaut'
      }];
    }
  }

  private analyzeLocally(text: string, language: string): EmotionAnalysisResult {
    const analysis = this.localDictionary.analyzeText(text);
    const emotions = this.localDictionary.getEmotions();
    const suggestions: EmotionSuggestion[] = [];
    const lowerText = text.toLowerCase();

    // Analyse d'émotions améliorée (30 expressions par type)
    const emotionKeywords = {
      'joie': [
        'content', 'heureux', 'joie', 'cool', 'super', 'bien', 'génial', 'magnifique', 'belle', 'beau',
        'souriant', 'trop bien', 'formidable', 'extra', 'incroyable', 'parfait', 'youpi', 'yeah', 'excellent', 'agréable',
        'kiffant', 'plaisir', 'sympa', 'délire', 'top', 'satisfait', 'confiant', 'sourire', 'motivé', 'rayonnant'
      ],

      'amour': [
        'amour', 'aimer', 'cœur', 'chéri', 'ma go', 'mon gars', 'amoureux', 'couple', 'bébé', 'crush',
        'je t’aime', 'adorer', 'man', 'ma vie', 'précieux', 'je pense à toi', 'mon cœur', 'miss you', 'love', '❤️',
        '💕', '💞', '💋', 'tendre', 'affection', 'romantique', 'passion', 'séduction', 'flirt', 'âme sœur', 'belle relation'
      ],

      'tristesse': [
        'triste', 'pleure', 'mal', 'douleur', 'mort', 'partir', 'manque', 'seul', 'vide', 'déprime',
        'perdu', 'fatigué', 'démoralisé', 'abattu', 'larmes', 'chagrin', 'déçu', 'blessé', 'nostalgie', 'souffrir',
        '😢', '😭', '💔', 'solitude', 'sans toi', 'désespoir', 'malheur', 'tristement', 'affaibli', 'abandon'
      ],

      'colère': [
        'énervé', 'fâché', 'rage', 'colère', 'chauffe', 'problème', 'con', 'fou', 'haine', 'exploser',
        'marre', 'bordel', 'c’est trop', 'trop chiant', 'dégouté', 'craquer', 'agacé', 'insupportable', 'putain', 'merde',
        '🤬', 'grrr', 'n’importe quoi', 'idiot', 'trahison', 'abusé', 'mal foutu', 'énervement', 'stressé', 'crise'
      ],

      'calme': [
        'calme', 'tranquille', 'paix', 'repos', 'détente', 'cool', 'ça va', 'zen', 'reposant', 'silence',
        'chill', 'relax', 'douceur', 'plénitude', 'concentré', 'paisible', 'équilibre', 'harmonie', 'serein', 'légèreté',
        '😌', '🤫', 'slow', 'stable', 'sans stress', 'confiant', 'en paix', 'soft', 'repos total', 'moment zen'
      ],

      'suspens': [
        'attendre', 'voir', 'peut-être', 'bientôt', 'savoir', 'Ramba', 'quoi', 'mystère', 'surprise', 'deviner',
        'suspense', 'je sens', 'ça arrive', 'à suivre', 'curieux', 'intrigue', 'mystérieux', '🤔', 'enquête', 'prochainement',
        'devinons', 'à venir', 'sur le point', 'je me demande', 'pressentir', 'hâte de voir', 'on verra', 'je crois', 'tension', 'préparez-vous'
      ],

      'enjaillé': [
        'fête', 'danse', 'musique', 'sortie', 'ambiance', 'wesh', 'enjaillé', 'kiff', 'show', 'soirée',
        '🔥', '💃', '🥳', 'en mode', 'gros son', 'club', 'ambiançons', 'plaisir', 'style', 'vibes',
        'afro', 'djo', 'on bouge', 'trop fort', 'crazy', 'good vibes', 'ça chauffe', 'groove', 'démarre', 'plein gaz', 'turn up'
      ]
    };


    // Calculer les scores pour chaque émotion
    Object.entries(emotionKeywords).forEach(([emotion, keywords]) => {
      let score = 0;
      const matchedWords: string[] = [];

      keywords.forEach(keyword => {
        if (lowerText.includes(keyword)) {
          score += 1;
          matchedWords.push(keyword);
        }
      });

      if (score > 0) {
        const confidence = Math.min(score * 0.3, 0.9);
        suggestions.push({
          emotion,
          confidence,
          reasoning: `Mots détectés: ${matchedWords.join(', ')}`
        });
      }
    });

    // Trier par confiance
    suggestions.sort((a, b) => b.confidence - a.confidence);

    // Détecter l'émotion principale
    const mainEmotion = suggestions.length > 0 ? suggestions[0].emotion : 'calme';
    const mainConfidence = suggestions.length > 0 ? suggestions[0].confidence : 0.5;

    return {
      emotion: mainEmotion,
      confidence: mainConfidence,
      localTerms: analysis.matchedTerms,
      suggestions: suggestions.slice(0, 3)
    };
  }

  private extractLocalTerms(text: string): string[] {
    const nouchTerms = this.localDictionary.getNouchTerms();
    return nouchTerms.filter(term => text.toLowerCase().includes(term.toLowerCase()));
  }
}