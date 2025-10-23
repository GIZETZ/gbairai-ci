
# Déploiement Gbairai sur Render depuis GitHub

## Prérequis
- Repository GitHub avec le code
- Compte Render
- Base de données PostgreSQL (Neon recommandé)

## Configuration du Repository

### 1. Fichier render.yaml

Créer `render.yaml` à la racine :

```yaml
services:
  - type: web
    name: gbairai-pwa
    env: node
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm start
    healthCheckPath: /api/health
    envVars:
      - key: NODE_ENV
        value: production
      - key: PORT
        value: 10000
      - key: HOST
        value: 0.0.0.0
      - key: DATABASE_URL
        fromDatabase:
          name: gbairai-db
          property: connectionString
      - key: SESSION_SECRET
        generateValue: true
      - key: OPENROUTER_API_KEY
        sync: false

databases:
  - name: gbairai-db
    plan: free
```

### 2. Scripts package.json

Assurer que `package.json` contient :

```json
{
  "scripts": {
    "build": "cd client && npm run build",
    "start": "NODE_ENV=production node server/index.js",
    "postinstall": "cd client && npm install"
  }
}
```

### 3. Adaptation du serveur pour Render

Mettre à jour `server/index.ts` :

```typescript
const PORT = process.env.PORT || 10000;
const HOST = process.env.HOST || '0.0.0.0';

// Servir les fichiers statiques de React
app.use(express.static(path.join(__dirname, '../client/dist')));

// Route catch-all pour React Router
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});
```

## Déploiement

### 1. Connecter GitHub à Render

1. Aller sur [Render Dashboard](https://dashboard.render.com)
2. Cliquer "New +"
3. Sélectionner "Web Service"
4. Connecter votre repository GitHub

### 2. Configuration du service

- **Name**: gbairai-pwa
- **Environment**: Node
- **Region**: Choisir la plus proche
- **Branch**: main
- **Build Command**: `npm install && npm run build`
- **Start Command**: `npm start`

### 3. Variables d'environnement

Ajouter dans l'onglet "Environment" :

```
NODE_ENV=production
PORT=10000
HOST=0.0.0.0
DATABASE_URL=postgresql://...
SESSION_SECRET=your-secret-key
OPENROUTER_API_KEY=your-api-key
```

### 4. Base de données

Si vous utilisez Render PostgreSQL :

1. Créer une base PostgreSQL
2. Copier l'URL de connexion
3. L'ajouter comme `DATABASE_URL`

### 5. Déployer

1. Cliquer "Create Web Service"
2. Attendre le build et déploiement
3. Tester l'URL fournie

## Configuration domaine personnalisé

1. Aller dans Settings > Custom Domains
2. Ajouter votre domaine
3. Configurer les DNS selon les instructions

## Monitoring

- Logs disponibles dans l'onglet "Logs"
- Métriques dans "Metrics"
- Alertes configurables

## Résolution de problèmes

### Build qui échoue
- Vérifier les dépendances dans package.json
- Contrôler les variables d'environnement
- Consulter les logs de build

### Application ne démarre pas
- Vérifier le PORT et HOST
- Contrôler la connexion base de données
- Vérifier les logs runtime
