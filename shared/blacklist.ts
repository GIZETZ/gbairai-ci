// Liste de mots interdits pour système de modération
// Attention: Cette liste est destinée à des fins de développement et modération

// Mots vraiment offensants (niveau critique)
const severeBannedWords = [
  // Grossièretés françaises sévères
  "merde", "putain", "connard", "connasse", "salope", "pute", "enculé", "enculée",
  "con", "conne", "batard", "batarde", "fdp", "ntm", "ta mère", "tamère",
  "nique", "niquer", "baise", "baiser", "suce", "sucer", "chatte", "bite",
  "couille", "couilles", "cul", "chier", "chiasse", "salaud",
  "bordel", "salopard", "saloparde", "encule", "niquez",
  "catin", "trainée", "garce", "ordure", "fumier", "raclure", "vermine",
  
  // Variantes avec accents
  "pétasse", "pédale", "tapette", "enfoiré", "enfoirée", "crétin", "crétine",
  "débile", "abruti", "abrutie", "dégueulasse", "dégueu",
  
  // Termes sexuels explicites
  "porn", "porno", "xxx", "nichons", "tétons", "vagin", "pénis", "phallus", 
  "masturbation", "masturber", "orgasme", "éjaculation", "sodomie", "fellation", 
  "cunnilingus", "coït", "fornication",
  
  // Injures racistes et discriminatoires
  "nègre", "négro", "bamboula", "bounty", "bougnoule", "bicot", "raton",
  "youpin", "youpine", "feuj", "ritale", "macaroni", "polak", "schleu",
  "rosbif", "ricain", "amerlock", "métèque", "pédé", "gouine",
  
  // Termes violents graves
  "tuer", "crever", "buter", "flinguer", "descendre", "assassiner",
  "violer", "viol", "tabasser", "défonce", "défoncer",
  "massacre", "massacrer", "torturer", "torture", "mutiler", "mutilation",
  
  // Drogues et substances
  "drogue", "cannabis", "haschisch", "marijuana", "cocaïne", "héroïne",
  "ecstasy", "lsd", "speed", "amphétamine", "crack", "méthamphétamine",
  "dealer", "dealeuse", "pusher", "came", "shit", "beuh", "weed",
  
  // Termes liés à l'extrémisme
  "terroriste", "attentat", "bombe", "explosif", "kamikaze", "djihad",
  "nazi", "fasciste", "antisémite", "raciste", "xénophobe", "homophobe",
  
  // Argot offensant
  "tepu", "teub", "tebé",
  
  // Anglicismes offensants
  "fuck", "fucking", "shit", "bitch", "asshole", "bastard",
  "dickhead", "motherfucker", "cocksucker", "whore", "slut", "cunt",
  "pussy", "dick", "cock", "balls", "tits", "boobs", "ass", "butt",
  
  // Variantes avec caractères de remplacement
  "f*ck", "f**k", "sh*t", "sh**", "b*tch", "a**hole",
  "m*rde", "p*tain", "c*n", "s*lope", "enc*lé", "b*tard",
  
  // Variations numériques (leetspeak)
  "m3rd3", "put41n", "c0n", "s4l0p3", "3nculé", "b4t4rd",
  "fck", "sht", "btch", "4ssh0l3",
  
  // Termes médicaux détournés offensants
  "mongol", "attardé", "autiste", "psychopathe",
  
  // Termes politiques offensants
  "facho", "facha"
];

// Mots acceptables dans certains contextes (pas bloqués)
const allowedWords = [
  "bête", "moche", "fou", "folle", "dingue", "malade", "idiot", "idiote",
  "stupide", "imbécile", "affreux", "hideux", "crade", "cracra",
  "porc", "cochon", "chienne", "damn", "hell", "frapper", "cogner",
  "sexe", "seins", "wesh", "wallah", "zarma", "chelou", "relou", "ouf",
  "meuf", "keuf", "keum", "reuf", "reubeu", "rebeu", "feumeu", "tipar",
  "tise", "picole", "cuite", "bourré", "pété", "défoncé", "pourri", "pourrie",
  "pathologie", "maladie", "infection", "virus", "cancer", "sida",
  "handicapé", "handicapée", "invalide", "gaucho", "gauchiste", "droitard",
  "communiste", "capitaliste", "bourgeois", "prolétaire", "révolution", "anarchiste",
  "charogne", "beurk", "pouah", "berk", "répugnant", "écœurant", "nauséabond"
];

export const bannedWords = severeBannedWords;

// Fonction pour vérifier si un texte contient des mots interdits
export const containsBannedWords = (text: string, customWords: string[] = []): boolean => {
  const allBannedWords = [...bannedWords, ...customWords];
  const lowerText = text.toLowerCase();
  
  // Vérifier chaque mot banni potentiel
  for (const word of allBannedWords) {
    if (lowerText.includes(word.toLowerCase())) {
      // Vérifier si le mot est dans la liste des mots autorisés
      const isAllowed = allowedWords.some(allowedWord => 
        word.toLowerCase() === allowedWord.toLowerCase()
      );
      
      if (!isAllowed) {
        return true; // Mot interdit trouvé
      }
    }
  }
  
  return false; // Aucun mot interdit trouvé
};

// Fonction pour censurer les mots interdits
export const censorText = (text: string, replacement: string = "***"): string => {
  let censoredText = text;
  
  bannedWords.forEach(word => {
    const regex = new RegExp(word, "gi");
    censoredText = censoredText.replace(regex, replacement);
  });
  
  return censoredText;
};

// Fonction pour obtenir la liste des mots interdits trouvés
export const getFoundBannedWords = (text: string): string[] => {
  const lowerText = text.toLowerCase();
  return bannedWords.filter(word => {
    if (lowerText.includes(word.toLowerCase())) {
      // Vérifier si le mot est dans la liste des mots autorisés
      const isAllowed = allowedWords.some(allowedWord => 
        word.toLowerCase() === allowedWord.toLowerCase()
      );
      return !isAllowed; // Retourner seulement si pas autorisé
    }
    return false;
  });
};

// Catégories de mots pour une modération plus fine
export const wordCategories = {
  PROFANITY: ["merde", "putain", "connard", "salope", "pute", "enculé"],
  SEXUAL: ["sexe", "porn", "porno", "xxx", "masturbation", "orgasme"],
  VIOLENCE: ["tuer", "crever", "buter", "violer", "tabasser", "massacre"],
  DRUGS: ["drogue", "cannabis", "cocaïne", "héroïne", "dealer", "came"],
  DISCRIMINATION: ["nègre", "bougnoule", "youpin", "pédé", "gouine"],
  MILD: ["débile", "idiot", "stupide", "crétin", "imbécile"]
};

// Fonction pour vérifier par catégorie
export const checkByCategory = (text: string, category: keyof typeof wordCategories): boolean => {
  const wordsInCategory = wordCategories[category] || [];
  const lowerText = text.toLowerCase();
  
  return wordsInCategory.some(word => 
    lowerText.includes(word.toLowerCase())
  );
};