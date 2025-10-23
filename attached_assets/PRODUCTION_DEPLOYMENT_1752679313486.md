# Guide de Déploiement en Production - Gbairai PWA

## Configuration complète pour déploiement Replit

### 1. Fichiers de configuration essentiels

#### package.json
```json
{
  "name": "gbairai-pwa",
  "version": "1.0.0",
  "description": "Progressive Web App sociale ivoirienne",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "concurrently \"npm run server\" \"npm run client\"",
    "server": "node server.js",
    "client": "cd client && npm run dev",
    "build": "cd client && npm run build",
    "test": "jest",
    "db:push": "drizzle-kit push:pg"
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
    "zod": "^3.22.0",
    "uuid": "^9.0.0",
    "axios": "^1.5.0",
    "dotenv": "^16.3.1"
  },
  "devDependencies": {
    "@types/node": "^20.5.0",
    "typescript": "^5.0.0",
    "jest": "^29.6.0",
    "concurrently": "^8.2.0",
    "drizzle-kit": "^0.19.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

#### app.json (Configuration Replit)
```json
{
  "name": "gbairai-pwa",
  "description": "Progressive Web App sociale ivoirienne avec carte interactive",
  "repository": "https://github.com/votre-compte/gbairai-pwa",
  "logo": "https://votre-domaine.com/logo.png",
  "keywords": ["social", "pwa", "cote-d-ivoire", "emotion-mapping"],
  "website": "https://gbairai.replit.app",
  "success_url": "/",
  "scripts": {
    "start": "node server.js",
    "build": "npm run build",
    "test": "npm test"
  },
  "env": {
    "NODE_ENV": {
      "description": "Environment (production/development)",
      "value": "production"
    },
    "PORT": {
      "description": "Port number",
      "value": "3001"
    },
    "HOST": {
      "description": "Host address",
      "value": "0.0.0.0"
    },
    "JWT_SECRET": {
      "description": "Secret key for JWT tokens",
      "generator": "secret"
    },
    "DATABASE_URL": {
      "description": "PostgreSQL database URL",
      "required": true
    },
    "OPENROUTER_API_KEY": {
      "description": "OpenRouter API key for emotion analysis",
      "required": false
    }
  },
  "formation": {
    "web": {
      "quantity": 1,
      "size": "free"
    }
  },
  "buildpacks": [
    {
      "url": "heroku/nodejs"
    }
  ],
  "healthcheck": {
    "path": "/health",
    "timeout": 10
  }
}
```

### 2. Point d'entrée principal

#### server.js
```javascript
/**
 * Gbairai Application Server - Production Ready
 * Main deployment entry point with health checks and API endpoints
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');
const fs = require('fs');

// Configuration
const app = express();
const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'production';

// Middleware de sécurité
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:", "blob:"],
      connectSrc: ["'self'", "https://api.openrouter.ai", "https://nominatim.openstreetmap.org"]
    }
  }
}));

app.use(compression());
app.use(cors({
  origin: NODE_ENV === 'production' ? 
    ['https://gbairai.replit.app', 'https://your-domain.com'] : 
    ['http://localhost:3000', 'http://localhost:3001'],
  credentials: true
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: 'Trop de requêtes, veuillez réessayer plus tard'
});
app.use('/api/', limiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check endpoints (priorité maximale)
app.get('/health', (req, res) => {
  const isHealthCheck = req.get('User-Agent')?.includes('GoogleHC') || 
                       req.get('User-Agent')?.includes('curl') ||
                       req.get('Accept')?.includes('application/json');
  
  res.status(200).json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: NODE_ENV
  });
});

app.get('/api/health', (req, res) => {
  res.status(200).json({ 
    status: 'OK', 
    api: 'running',
    timestamp: new Date().toISOString()
  });
});

// Root endpoint avec détection health check
app.get('/', (req, res) => {
  const userAgent = req.get('User-Agent') || '';
  
  if (userAgent.includes('GoogleHC') || userAgent.includes('curl')) {
    return res.status(200).json({ 
      status: 'OK', 
      service: 'gbairai-pwa',
      timestamp: new Date().toISOString()
    });
  }
  
  // Servir l'application React ou page d'accueil
  const indexPath = path.join(__dirname, 'public', 'index.html');
  if (fs.existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).json({
      name: 'Gbairai PWA',
      description: 'Progressive Web App sociale ivoirienne',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        api: '/api',
        health: '/health',
        frontend: '/'
      }
    });
  }
});

// Servir les fichiers statiques
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}
app.use(express.static(publicDir));

// Routes API
try {
  const authRoutes = require('./server/routes/auth');
  const gbairaiRoutes = require('./server/routes/gbairais');
  const mapRoutes = require('./server/routes/map');
  const feedRoutes = require('./server/routes/feed');
  
  app.use('/api/auth', authRoutes);
  app.use('/api/gbairais', gbairaiRoutes);
  app.use('/api/map', mapRoutes);
  app.use('/api/feed', feedRoutes);
} catch (error) {
  console.warn('Routes non disponibles:', error.message);
}

// Endpoint de statistiques
app.get('/api/stats', (req, res) => {
  res.json({
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// Gestion des erreurs 404
app.use('*', (req, res) => {
  if (req.originalUrl.startsWith('/api/')) {
    res.status(404).json({ error: 'Endpoint non trouvé' });
  } else {
    // Servir l'application React pour les routes frontend
    const indexPath = path.join(__dirname, 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).json({ error: 'Page non trouvée' });
    }
  }
});

// Middleware de gestion des erreurs
app.use((error, req, res, next) => {
  console.error('Erreur serveur:', error);
  
  const isDev = NODE_ENV === 'development';
  
  res.status(error.status || 500).json({
    error: isDev ? error.message : 'Erreur interne du serveur',
    ...(isDev && { stack: error.stack })
  });
});

// Démarrage du serveur
const server = app.listen(PORT, HOST, () => {
  console.log(`🚀 Gbairai server running on port ${PORT}`);
  console.log(`🌍 Environment: ${NODE_ENV}`);
  console.log(`📡 Host: ${HOST}`);
  console.log(`✅ Server running at http://${HOST}:${PORT}`);
  console.log(`📊 Health check: http://${HOST}:${PORT}/health`);
  console.log('🎯 Ready for deployment!');
});

// Gestion gracieuse des arrêts
process.on('SIGTERM', () => {
  console.log('SIGTERM reçu, arrêt gracieux...');
  server.close(() => {
    console.log('Serveur arrêté');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT reçu, arrêt gracieux...');
  server.close(() => {
    console.log('Serveur arrêté');
    process.exit(0);
  });
});

module.exports = app;
```

### 3. Variables d'environnement

#### .env.example
```bash
# Configuration de base
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Base de données
DATABASE_URL=postgresql://username:password@host:port/database

# Authentification
JWT_SECRET=your-super-secret-jwt-key-here
JWT_EXPIRES_IN=24h

# Services externes
OPENROUTER_API_KEY=your-openrouter-api-key

# Configuration PWA
PWA_NAME=Gbairai
PWA_SHORT_NAME=Gbairai
PWA_DESCRIPTION=Réseau social ivoirien avec carte interactive
PWA_THEME_COLOR=#F7C948
PWA_BACKGROUND_COLOR=#1D3557

# Limites
MAX_CONTENT_LENGTH=280
RATE_LIMIT_REQUESTS=100
RATE_LIMIT_WINDOW=15

# Géolocalisation
DEFAULT_COUNTRY=CI
DEFAULT_CITY=Abidjan
```

### 4. Configuration PostgreSQL

#### drizzle.config.ts
```typescript
import type { Config } from "drizzle-kit";

export default {
  schema: "./shared/schema.ts",
  out: "./server/migrations",
  driver: "pg",
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;
```

### 5. Schéma de base de données

#### shared/schema.ts
```typescript
import { pgTable, text, timestamp, boolean, jsonb, integer } from 'drizzle-orm/pg-core';
import { createInsertSchema, createSelectSchema } from 'drizzle-zod';
import { z } from 'zod';

// Table des utilisateurs
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  email: text('email').unique().notNull(),
  username: text('username').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  role: text('role').default('user'),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  isActive: boolean('is_active').default(true),
  profile: jsonb('profile'),
  preferences: jsonb('preferences'),
});

// Table des Gbairais
export const gbairais = pgTable('gbairais', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  content: text('content').notNull(),
  emotion: text('emotion').notNull(),
  location: jsonb('location'),
  isAnonymous: boolean('is_anonymous').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  status: text('status').default('active'),
  metadata: jsonb('metadata'),
});

// Table des interactions
export const interactions = pgTable('interactions', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => users.id),
  gbairaiId: text('gbairai_id').references(() => gbairais.id),
  type: text('type').notNull(), // like, comment, share, report
  content: text('content'),
  createdAt: timestamp('created_at').defaultNow(),
  metadata: jsonb('metadata'),
});

// Table des conversations
export const conversations = pgTable('conversations', {
  id: text('id').primaryKey(),
  participants: jsonb('participants').notNull(),
  isEncrypted: boolean('is_encrypted').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),
  lastMessageAt: timestamp('last_message_at'),
  metadata: jsonb('metadata'),
});

// Table des messages
export const messages = pgTable('messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').references(() => conversations.id),
  senderId: text('sender_id').references(() => users.id),
  content: text('content').notNull(),
  type: text('type').default('text'),
  isEncrypted: boolean('is_encrypted').default(true),
  createdAt: timestamp('created_at').defaultNow(),
  metadata: jsonb('metadata'),
});

// Schémas Zod pour validation
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertGbairaiSchema = createInsertSchema(gbairais).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertInteractionSchema = createInsertSchema(interactions).omit({
  id: true,
  createdAt: true,
});

// Types TypeScript
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Gbairai = typeof gbairais.$inferSelect;
export type InsertGbairai = z.infer<typeof insertGbairaiSchema>;
export type Interaction = typeof interactions.$inferSelect;
export type InsertInteraction = z.infer<typeof insertInteractionSchema>;
```

### 6. Configuration PWA

#### public/manifest.json
```json
{
  "name": "Gbairai - Réseau Social Ivoirien",
  "short_name": "Gbairai",
  "description": "Partagez vos émotions sur une carte interactive de la Côte d'Ivoire",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1D3557",
  "theme_color": "#F7C948",
  "orientation": "portrait",
  "icons": [
    {
      "src": "/icons/icon-72x72.png",
      "sizes": "72x72",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-96x96.png",
      "sizes": "96x96",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-128x128.png",
      "sizes": "128x128",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-144x144.png",
      "sizes": "144x144",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-152x152.png",
      "sizes": "152x152",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-384x384.png",
      "sizes": "384x384",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "categories": ["social", "entertainment", "lifestyle"],
  "lang": "fr-CI",
  "scope": "/",
  "prefer_related_applications": false
}
```

### 7. Service Worker

#### public/sw.js
```javascript
const CACHE_NAME = 'gbairai-v1';
const urlsToCache = [
  '/',
  '/static/css/main.css',
  '/static/js/main.js',
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
```

### 8. Scripts de déploiement

#### deploy.js
```javascript
/**
 * Deployment script for Gbairai PWA
 * This script ensures the application is properly configured for deployment
 */

const fs = require('fs');
const path = require('path');

console.log('🚀 Démarrage du déploiement Gbairai...');

// Vérifier les fichiers essentiels
const requiredFiles = [
  'server.js',
  'package.json',
  'app.json',
  'public/manifest.json',
  'public/sw.js'
];

console.log('📋 Vérification des fichiers...');
requiredFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(`✅ ${file}`);
  } else {
    console.log(`❌ ${file} manquant`);
    process.exit(1);
  }
});

// Vérifier les variables d'environnement
const requiredEnvVars = ['NODE_ENV', 'PORT', 'HOST'];
console.log('🔧 Vérification des variables d\'environnement...');
requiredEnvVars.forEach(envVar => {
  if (process.env[envVar]) {
    console.log(`✅ ${envVar}`);
  } else {
    console.log(`⚠️  ${envVar} non définie`);
  }
});

// Créer les dossiers nécessaires
const requiredDirs = ['public', 'public/icons', 'logs'];
requiredDirs.forEach(dir => {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
    console.log(`📁 Dossier créé: ${dir}`);
  }
});

console.log('✅ Déploiement configuré avec succès!');
console.log('🎯 Prêt pour le démarrage avec: npm start');
```

### 9. Tests de déploiement

#### test-deployment.js
```javascript
/**
 * Test script for deployment validation
 * This script validates that all deployment requirements are met
 */

const http = require('http');
const fs = require('fs');

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

async function testEndpoint(path, expectedStatus = 200) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'localhost',
      port: PORT,
      path: path,
      method: 'GET',
      timeout: 5000
    };

    const req = http.request(options, (res) => {
      resolve({
        path,
        status: res.statusCode,
        success: res.statusCode === expectedStatus
      });
    });

    req.on('error', (error) => {
      reject({ path, error: error.message });
    });

    req.on('timeout', () => {
      req.destroy();
      reject({ path, error: 'Timeout' });
    });

    req.end();
  });
}

async function runTests() {
  console.log('🧪 Test de déploiement Gbairai...');
  
  const tests = [
    { path: '/health', name: 'Health Check' },
    { path: '/api/health', name: 'API Health' },
    { path: '/', name: 'Page d\'accueil' },
    { path: '/api/stats', name: 'Statistiques' },
    { path: '/manifest.json', name: 'PWA Manifest' }
  ];

  const results = [];
  
  for (const test of tests) {
    try {
      const result = await testEndpoint(test.path);
      results.push({ ...result, name: test.name });
      console.log(`${result.success ? '✅' : '❌'} ${test.name}: ${result.status}`);
    } catch (error) {
      results.push({ ...error, name: test.name, success: false });
      console.log(`❌ ${test.name}: ${error.error}`);
    }
  }

  const successCount = results.filter(r => r.success).length;
  const totalCount = results.length;
  
  console.log(`\n📊 Résultats: ${successCount}/${totalCount} tests réussis`);
  
  if (successCount === totalCount) {
    console.log('🎉 Tous les tests sont passés! Déploiement prêt.');
    process.exit(0);
  } else {
    console.log('❌ Certains tests ont échoué. Vérifiez la configuration.');
    process.exit(1);
  }
}

// Démarrer les tests si le serveur est en cours d'exécution
setTimeout(runTests, 5000);
```

### 10. Instructions de déploiement

#### README-DEPLOYMENT.md
```markdown
# Instructions de Déploiement - Gbairai PWA

## Étapes de déploiement sur Replit

### 1. Préparation
- Cloner le projet dans un nouveau Repl
- Installer les dépendances: `npm install`
- Configurer les variables d'environnement

### 2. Configuration
- Créer la base de données PostgreSQL
- Configurer `DATABASE_URL` dans les secrets
- Définir `JWT_SECRET` pour la sécurité

### 3. Démarrage
- Lancer: `npm start`
- Tester les endpoints de santé
- Vérifier la PWA avec manifest.json

### 4. Variables d'environnement requises
```
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
DATABASE_URL=postgresql://...
JWT_SECRET=your-secret-key
```

### 5. Endpoints de test
- `/health` - Santé du serveur
- `/api/health` - Santé de l'API
- `/` - Page d'accueil
- `/manifest.json` - Manifest PWA

### 6. Déploiement automatique
Le déploiement se fait automatiquement avec:
- Point d'entrée: `server.js`
- Health checks configurés
- Gestion des erreurs robuste
- Signaux système gérés

### 7. Monitoring
- Logs accessibles via console Replit
- Métriques disponibles sur `/api/stats`
- Health checks automatiques
```

Ce guide de déploiement garantit un déploiement réussi et stable de l'application Gbairai PWA sur Replit avec tous les composants nécessaires pour une application de production.