
# Déploiement sur Cloudflare Pages - Gbairai

## Étapes de déploiement

### 1. Préparer le repository GitHub
1. Assurez-vous que votre code est poussé sur GitHub
2. Le script `build-cloudflare.js` est configuré pour le build

### 2. Configuration Cloudflare Pages

1. Allez sur [Cloudflare Dashboard](https://dash.cloudflare.com)
2. Sélectionnez votre compte
3. Cliquez sur "Pages" dans la barre latérale
4. Cliquez "Create a project"
5. Sélectionnez "Connect to Git"

### 3. Configuration du projet

**Repository**: Sélectionnez votre repo GitHub `gbairai-pwa`

**Build settings**:
- **Framework preset**: None
- **Build command**: `npm run build:cloudflare`
- **Build output directory**: `/`
- **Root directory**: `/`

### 4. Variables d'environnement

Dans les settings de votre projet Cloudflare, ajoutez :

```
NODE_ENV=production
VITE_API_URL=https://votre-backend.replit.app
```

### 5. Configuration du backend (Replit)

Si vous gardez votre backend sur Replit, assurez-vous de :

1. Déployer votre backend sur Replit
2. Récupérer l'URL de déploiement
3. Mettre à jour `VITE_API_URL` dans Cloudflare avec cette URL

### 6. CORS pour le backend

Dans votre backend Replit, assurez-vous d'autoriser votre domaine Cloudflare :

```typescript
app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://votre-projet.pages.dev',
    'https://votre-domaine-custom.com'
  ],
  credentials: true
}));
```

### 7. Déploiement

1. Cliquez "Save and Deploy"
2. Cloudflare va automatiquement build et déployer votre app
3. Vous obtiendrez une URL `*.pages.dev`

### 8. Domaine personnalisé (optionnel)

1. Dans les settings de votre projet Pages
2. Onglet "Custom domains"
3. Ajoutez votre domaine personnalisé

## Architecture déployée

- **Frontend**: Cloudflare Pages (gratuit)
- **Backend**: Replit (avec URL publique)
- **Base de données**: Neon PostgreSQL
- **CDN**: Cloudflare (automatique)

## Avantages de cette configuration

✅ **Performance**: CDN mondial Cloudflare  
✅ **Gratuit**: Cloudflare Pages est gratuit  
✅ **HTTPS**: Certificat SSL automatique  
✅ **Domaine personnalisé**: Gratuit sur Cloudflare  
✅ **Déploiement automatique**: À chaque push GitHub  

Votre application sera accessible sur `https://votre-projet.pages.dev` ! 🚀
