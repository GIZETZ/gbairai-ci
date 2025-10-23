# Architecture Technique - Gbairai PWA

## Vue d'ensemble de l'architecture

Gbairai est une Progressive Web App (PWA) fullstack utilisant une architecture moderne découplée avec React frontend et Node.js backend.

## Stack technique

### Frontend (React + TypeScript)
```typescript
// Technologies principales
- React 18 avec TypeScript
- Vite comme bundler
- Tailwind CSS pour le styling
- Wouter pour le routing
- TanStack Query pour la gestion d'état
- Leaflet pour les cartes
- Socket.IO client pour temps réel

// Structure recommandée
client/
├── src/
│   ├── components/
│   │   ├── Map/
│   │   │   ├── InteractiveMap.tsx
│   │   │   ├── EmotionMarker.tsx
│   │   │   └── MapControls.tsx
│   │   ├── Gbairai/
│   │   │   ├── GbairaiCard.tsx
│   │   │   ├── GbairaiForm.tsx
│   │   │   └── EmotionSelector.tsx
│   │   └── Common/
│   │       ├── Navigation.tsx
│   │       └── Layout.tsx
│   ├── pages/
│   │   ├── Home.tsx
│   │   ├── Map.tsx
│   │   ├── Feed.tsx
│   │   └── Profile.tsx
│   ├── services/
│   │   ├── api.ts
│   │   ├── auth.ts
│   │   └── location.ts
│   └── hooks/
│       ├── useAuth.ts
│       ├── useLocation.ts
│       └── useGbairais.ts
```

### Backend (Node.js + Express)
```typescript
// Technologies principales
- Node.js avec Express
- TypeScript
- Drizzle ORM + PostgreSQL
- JWT pour authentification
- Socket.IO pour temps réel
- OpenRouter API pour IA

// Structure recommandée
server/
├── routes/
│   ├── auth.ts
│   ├── gbairais.ts
│   ├── map.ts
│   └── admin.ts
├── middleware/
│   ├── auth.ts
│   ├── security.ts
│   └── rateLimit.ts
├── services/
│   ├── emotionAnalysis.ts
│   ├── notification.ts
│   └── gamification.ts
├── storage/
│   ├── interface.ts
│   └── postgres.ts
└── utils/
    ├── crypto.ts
    └── validation.ts
```

## Schéma de base de données

### Tables principales
```typescript
// shared/schema.ts
import { pgTable, text, timestamp, integer, boolean, jsonb } from 'drizzle-orm/pg-core';

// Utilisateurs
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  username: text('username').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('user'),
  createdAt: timestamp('created_at').defaultNow(),
  isActive: boolean('is_active').default(true),
  profile: jsonb('profile'),
});

// Gbairais (posts)
export const gbairais = pgTable('gbairais', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  content: text('content').notNull(),
  emotion: text('emotion').notNull(),
  location: jsonb('location'),
  isAnonymous: boolean('is_anonymous').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  status: text('status').default('active'),
  metadata: jsonb('metadata'),
});

// Interactions
export const interactions = pgTable('interactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  gbairaiId: text('gbairai_id').references(() => gbairais.id),
  type: text('type').notNull(), // like, comment, share
  content: text('content'),
  createdAt: timestamp('created_at').defaultNow(),
});

// Conversations (messagerie)
export const conversations = pgTable('conversations', {
  id: text('id').primaryKey(),
  participants: jsonb('participants').notNull(),
  isEncrypted: boolean('is_encrypted').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  lastMessageAt: timestamp('last_message_at'),
});

// Messages
export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').references(() => conversations.id),
  senderId: text('sender_id').references(() => users.id),
  content: text('content').notNull(), // Chiffré
  type: text('type').default('text'),
  createdAt: timestamp('created_at').defaultNow(),
});
```

## API Routes

### Authentification
```typescript
// server/routes/auth.ts
POST /api/auth/register
POST /api/auth/login
POST /api/auth/refresh
DELETE /api/auth/logout
GET /api/auth/me
```

### Gbairais
```typescript
// server/routes/gbairais.ts
GET /api/gbairais           // Liste avec filtres
POST /api/gbairais          // Créer un gbairai
GET /api/gbairais/:id       // Détails d'un gbairai
PUT /api/gbairais/:id       // Modifier (propriétaire)
DELETE /api/gbairais/:id    // Supprimer (propriétaire/admin)
POST /api/gbairais/:id/interact  // Like, comment, share
```

### Carte
```typescript
// server/routes/map.ts
GET /api/map/markers        // Marqueurs pour carte
GET /api/map/regions        // Statistiques par région
GET /api/map/emotions       // Distribution émotions
```

### Feed personnalisé
```typescript
// server/routes/feed.ts
GET /api/feed/personal      // Feed personnalisé
GET /api/feed/trending      // Tendances
GET /api/feed/nearby        // Gbairais proches
```

## Services clés

### Analyse d'émotion
```typescript
// server/services/emotionAnalysis.ts
interface EmotionResult {
  emotion: string;
  confidence: number;
  localTerms: string[];
}

async function analyzeEmotion(text: string): Promise<EmotionResult> {
  // 1. Essayer OpenRouter API
  // 2. Fallback analyse locale avec dictionnaire nouchi
  // 3. Retour par défaut si échec
}
```

### Géolocalisation
```typescript
// client/src/services/location.ts
interface LocationData {
  latitude: number;
  longitude: number;
  city: string;
  region: string;
  country: string;
}

async function getCurrentLocation(): Promise<LocationData> {
  // Utiliser Geolocation API + géocodage inverse
}
```

### Recommandations
```typescript
// server/services/recommendations.ts
interface RecommendationEngine {
  getUserFeed(userId: string): Promise<Gbairai[]>;
  getTrendingContent(): Promise<Gbairai[]>;
  getNearbyContent(location: LocationData): Promise<Gbairai[]>;
}
```

## Sécurité et Performance

### Middleware de sécurité
```typescript
// server/middleware/security.ts
- Helmet pour headers sécurisés
- CORS configuré
- Rate limiting par utilisateur
- Validation des données avec Zod
- Sanitisation des entrées
```

### Authentification JWT
```typescript
// server/middleware/auth.ts
- Tokens JWT avec expiration
- Refresh tokens
- Middleware de vérification
- Gestion des rôles (user/admin)
```

### PWA Configuration
```typescript
// client/public/manifest.json
{
  "name": "Gbairai",
  "short_name": "Gbairai",
  "description": "Réseau social ivoirien",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#F7C948",
  "background_color": "#1D3557",
  "icons": [...]
}
```

## Déploiement

### Configuration Replit
```bash
# Variables d'environnement
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
DATABASE_URL=postgresql://...
JWT_SECRET=your-jwt-secret
OPENROUTER_API_KEY=your-api-key
```

### Scripts de démarrage
```json
{
  "scripts": {
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "build": "cd client && npm run build",
    "start": "node server.js",
    "db:push": "drizzle-kit push:pg"
  }
}
```

### Endpoints de santé
```typescript
// server.js
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});
```

Cette architecture garantit une application scalable, sécurisée et maintenant les standards PWA modernes.