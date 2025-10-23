import { containsBannedWords, getFoundBannedWords } from "@shared/blacklist";

export interface ModerationResult {
  approved: boolean;
  reason?: string;
  foundWords?: string[];
  suggestion?: string;
}

// Messages de refus dans le style ivoirien
const rejectionMessages = [
  "Yako, ce message est trop chaud pour Gbairai 😅 !",
  "Gbairai c'est pas pour les palabres ! Reviens quand t'es calmé 😎",
  "Eh non ami, on dit pas ça sur Gbairai ! Change ton message 🙏",
  "Frère, ce gbairai là est pas bon ! Trouve autre chose à dire 💭",
  "Ton message est trop fort ! Gbairai c'est pour les bonnes vibes seulement ✨",
  "Ça va pas marcher comme ça ! Écris quelque chose de bien 📝",
  "On peut pas publier ça sur Gbairai ! Essaie avec des mots plus doux 🌸"
];

// Fonction pour obtenir un message de refus aléatoire
const getRandomRejectionMessage = (): string => {
  return rejectionMessages[Math.floor(Math.random() * rejectionMessages.length)];
};

// Modération locale avec la liste noire
export const checkLocalModeration = (content: string): ModerationResult => {
  const foundWords = getFoundBannedWords(content);
  
  if (foundWords.length > 0) {
    return {
      approved: false,
      reason: getRandomRejectionMessage(),
      foundWords,
      suggestion: "Utilise des mots plus respectueux pour exprimer ton gbairai"
    };
  }
  
  return { approved: true };
};

// Modération avancée avec OpenRouter AI
export const checkAIModeration = async (content: string): Promise<ModerationResult> => {
  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.OPENROUTER_CHECK_WORD}`,
        "Content-Type": "application/json",
        "HTTP-Referer": "https://gbairai.app",
        "X-Title": "Gbairai Content Moderation"
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: `Tu es une IA de modération pour Gbairai, un réseau social ivoirien. Ta mission est d'analyser le contenu des messages et de déterminer s'ils respectent les règles de bonne conduite.

RÈGLES DE MODÉRATION:
- Bloque tout contenu offensant, vulgaire, haineux ou irrespectueux
- Bloque les contenus sexuels explicites, violents ou liés aux drogues
- Bloque les discriminations, le harcèlement et les menaces
- Respecte la culture ivoirienne et l'usage du nouchi/argot local quand c'est respectueux
- Sois tolérant avec l'humour ivoirien tant qu'il reste respectueux

RÉPONSE ATTENDUE:
Réponds UNIQUEMENT par un JSON avec cette structure:
{
  "approved": boolean,
  "toxicity_score": number (0-1),
  "reason": "explication courte si refusé",
  "category": "type de problème si refusé"
}

Si le message est acceptable, réponds: {"approved": true, "toxicity_score": 0.1}
Si le message est problématique, donne une raison claire et un score de toxicité.`
          },
          {
            role: "user",
            content: `Analyse ce message: "${content}"`
          }
        ],
        max_tokens: 200,
        temperature: 0.1
      })
    });

    if (!response.ok) {
      console.error("Erreur OpenRouter:", response.status, response.statusText);
      return { approved: true }; // En cas d'erreur API, on approuve pour ne pas bloquer
    }

    const data = await response.json();
    const aiResponse = data.choices[0]?.message?.content;
    
    if (!aiResponse) {
      return { approved: true };
    }

    // Parse la réponse JSON de l'IA
    try {
      const result = JSON.parse(aiResponse);
      
      if (!result.approved) {
        return {
          approved: false,
          reason: getRandomRejectionMessage(),
          suggestion: result.reason || "Contenu inapproprié détecté par l'IA"
        };
      }
      
      return { approved: true };
    } catch (parseError) {
      console.error("Erreur parsing réponse IA:", parseError);
      return { approved: true };
    }

  } catch (error) {
    console.error("Erreur modération AI:", error);
    return { approved: true }; // Fallback en cas d'erreur
  }
};

// Fonction principale de modération (combine local + AI)
export const moderateContent = async (content: string): Promise<ModerationResult> => {
  // Étape 1: Vérification locale rapide
  const localResult = checkLocalModeration(content);
  if (!localResult.approved) {
    return localResult;
  }
  
  // Étape 2: Vérification IA si le contenu passe la modération locale
  const aiResult = await checkAIModeration(content);
  return aiResult;
};