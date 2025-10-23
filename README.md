
# Gbairai PWA - Réseau Social Ivoirien (gbairai.onrender.com)

Gbairai est une Progressive Web App (PWA) sociale ivoirienne permettant le partage anonyme d'histoires géolocalisées avec analyse d'émotion par IA. L'application affiche une carte interactive colorée par émotions à travers la Côte d'Ivoire.

## 🌟 Fonctionnalités

- **Carte Interactive** : Visualisation des émotions sur une carte de la Côte d'Ivoire
- **Analyse IA** : Classification automatique des émotions avec OpenRouter API
- **Géolocalisation** : Partage de contenus géolocalisés
- **Messagerie** : Système de messages privés sécurisé
- **PWA** : Installation possible sur mobile et desktop
- **Responsive** : Interface adaptée mobile et desktop

## 🚀 Technologies

### Frontend
- React 18 + TypeScript
- Tailwind CSS
- Leaflet pour les cartes
- Radix UI composants
- TanStack Query
- Wouter routing

### Backend
- Node.js + Express
- PostgreSQL + Drizzle ORM
- Passport.js authentification
- OpenRouter AI API
- Multer upload fichiers

## 📦 Installation

### Prérequis
- Node.js 18+
- PostgreSQL
- Compte OpenRouter (optionnel)

### Setup Local

1. Cloner le repository
```bash
git clone https://github.com/votre-username/gbairai-pwa.git
cd gbairai-pwa
```

2. Installer les dépendances
```bash
npm install
```

3. Configurer les variables d'environnement
```bash
cp .env.example .env
```

Remplir `.env` avec vos variables :
```env
DATABASE_URL=postgresql://username:password@localhost:5432/gbairai
SESSION_SECRET=your-secret-key
OPENROUTER_API_KEY=your-api-key
OPENROUTER_CHECK_WORD=your-check-word
NODE_ENV=development
```

4. Initialiser la base de données
```bash
npm run db:push
```

5. Démarrer l'application
```bash
npm run dev
```

L'application sera disponible sur `http://localhost:5000`

## 🗄️ Guides de Base de Données

### Avec Neon (Recommandé)

1. Créer un compte sur [Neon](https://neon.tech)
2. Créer une nouvelle base de données
3. Copier l'URL de connexion
4. Mettre à jour `DATABASE_URL` dans `.env`

### Avec Firebase (Firestore)

Voir le guide détaillé dans `docs/FIREBASE_SETUP.md`

### Avec Supabase

1. Créer un projet sur [Supabase](https://supabase.com)
2. Récupérer l'URL PostgreSQL
3. Mettre à jour `DATABASE_URL`

## 🚀 Déploiement

### Sur Render depuis GitHub
Voir le guide détaillé dans `docs/RENDER_DEPLOYMENT.md`

### Sur Vercel
Voir le guide dans `docs/VERCEL_DEPLOYMENT.md`

## 📱 Application Mobile APK

Voir le guide complet dans `docs/MOBILE_APK_GUIDE.md`

## 🔧 Scripts NPM

- `npm run dev` - Démarrer en développement
- `npm run build` - Build production
- `npm run start` - Démarrer en production
- `npm run db:push` - Synchroniser la base de données

## 📁 Structure du Projet

```
gbairai/
├── client/           # Frontend React
├── server/           # Backend Express
├── shared/           # Code partagé
├── uploads/          # Fichiers uploadés
└── docs/            # Documentation
```

## 🤝 Contribution

1. Fork le projet
2. Créer une branche feature
3. Commit vos changements
4. Push vers la branche
5. Ouvrir une Pull Request

testez dès maintenant sur gbairai.onrender.com

## 📄 Licence

MIT License - voir `LICENSE` pour plus de détails

## 🙏 Remerciements

- OpenRouter pour l'API IA
- Leaflet pour les cartes
- Radix UI pour les composants
