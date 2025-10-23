# Guide de Recréation - Gbairai PWA

## Vue d'ensemble du projet

Gbairai est une PWA (Progressive Web App) sociale ivoirienne permettant le partage anonyme d'histoires géolocalisées avec analyse d'émotion par IA. L'application affiche une carte interactive colorée par émotions à travers la Côte d'Ivoire.

## Architecture technique recommandée

### Structure des dossiers
```
gbairai/
├── client/                 # Frontend React + Vite
│   ├── src/
│   │   ├── components/     # Composants React
│   │   ├── pages/         # Pages de l'application
│   │   ├── services/      # Services API
│   │   └── hooks/         # Hooks React personnalisés
│   ├── public/            # Fichiers statiques
│   └── vite.config.ts     # Configuration Vite
├── server/                # Backend Node.js + Express
│   ├── routes/           # Routes API
│   ├── middleware/       # Middleware Express
│   ├── services/         # Services backend
│   └── storage/          # Interface de stockage
├── shared/               # Code partagé
│   └── schema.ts         # Schémas TypeScript/Zod
└── package.json          # Dépendances
```

### Technologies principales
- **Frontend**: React 18, TypeScript, Tailwind CSS, Vite
- **Backend**: Node.js, Express, JWT, Socket.IO
- **Base de données**: PostgreSQL avec Drizzle ORM
- **Cartes**: Leaflet + React-Leaflet
- **PWA**: Service Workers, Web App Manifest
- **IA**: OpenRouter API + fallback local

## Fonctionnalités clés à implémenter

### 1. Authentification utilisateur
- Inscription/connexion avec JWT
- Système de tokens sécurisés
- Middleware d'authentification

### 2. Système de publication
- Création de "Gbairais" (posts courts)
- Sélection d'émotion (7 couleurs)
- Géolocalisation automatique
- Analyse d'émotion par IA

### 3. Carte interactive
- Leaflet avec marqueurs colorés
- Filtres par émotion
- Zoom sur régions/villes
- Clustering intelligent

### 4. Fonctionnalités sociales
- Likes, commentaires, partages
- Feed personnalisé
- Notifications en temps réel
- Messagerie privée chiffrée

### 5. Système d'administration
- Dashboard d'administration
- Modération de contenu
- Analytics et statistiques
- Configuration système

## Points d'entrée recommandés

### Script principal
```javascript
// server.js - Point d'entrée principal
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware de sécurité
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json());

// Routes de santé pour déploiement
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Routes API
app.use('/api/auth', require('./server/routes/auth'));
app.use('/api/gbairais', require('./server/routes/gbairais'));
app.use('/api/map', require('./server/routes/map'));

// Servir les fichiers statiques
app.use(express.static('public'));

// Démarrage du serveur
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Gbairai server running on port ${PORT}`);
});
```

### Configuration package.json
```json
{
  "name": "gbairai-pwa",
  "version": "1.0.0",
  "scripts": {
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "server": "node server.js",
    "client": "cd client && npm run dev",
    "build": "cd client && npm run build",
    "start": "node server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "helmet": "^7.0.0",
    "compression": "^1.7.4",
    "jsonwebtoken": "^9.0.0",
    "bcryptjs": "^2.4.3",
    "drizzle-orm": "^0.28.0",
    "postgres": "^3.3.5",
    "socket.io": "^4.7.2",
    "express-rate-limit": "^7.1.3",
    "zod": "^3.22.0"
  }
}
```

## Configuration de déploiement

### Variables d'environnement
```bash
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
OPENROUTER_API_KEY=your-api-key
```

### app.json pour Replit
```json
{
  "name": "gbairai-pwa",
  "description": "Progressive Web App sociale ivoirienne",
  "scripts": {
    "start": "node server.js"
  },
  "env": {
    "NODE_ENV": "production",
    "PORT": "3001"
  },
  "healthcheck": {
    "path": "/health",
    "timeout": 10
  }
}
```

## Étapes de création recommandées

### Phase 1: Configuration de base
1. Créer la structure de dossiers
2. Configurer package.json et dépendances
3. Créer server.js basique avec routes de santé
4. Tester le déploiement initial

### Phase 2: Base de données
1. Configurer PostgreSQL
2. Créer schémas Drizzle dans shared/schema.ts
3. Implémenter interface de stockage
4. Tester les connexions

### Phase 3: Authentification
1. Routes d'inscription/connexion
2. Middleware JWT
3. Système de tokens
4. Interface frontend

### Phase 4: Fonctionnalités principales
1. Création de Gbairais
2. Carte interactive
3. Système d'émotions
4. Géolocalisation

### Phase 5: Fonctionnalités avancées
1. Feed personnalisé
2. Interactions sociales
3. Notifications
4. Administration

## Problèmes à éviter

### Dépendances problématiques
- Éviter les versions incompatibles d'express-rate-limit
- Utiliser des versions stables de toutes les dépendances
- Tester les middleware avant intégration

### Configuration serveur
- Toujours utiliser 0.0.0.0 comme host
- Implémenter des endpoints de santé robustes
- Gérer les signaux système (SIGTERM/SIGINT)

### Sécurité
- Valider toutes les entrées utilisateur
- Implémenter rate limiting approprié
- Chiffrer les données sensibles

## Ressources importantes

### Données mockées
- 70+ Gbairais avec contenu en nouchi
- Géolocalisation Abidjan et région
- Émotions variées pour tests

### Design système
- Couleurs d'émotions spécifiques
- Thème ivoirien (orange, blanc, vert)
- Interface responsive mobile-first

### APIs recommandées
- OpenRouter pour analyse d'émotion
- Nominatim pour géocodage
- PostgreSQL pour données persistantes

Ce guide vous permettra de recréer l'application proprement en évitant les erreurs rencontrées dans ce projet.