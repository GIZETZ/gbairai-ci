
# Guide de Déploiement Gbairai sur Replit

## Préparation du Projet

### 1. Configuration des Variables d'Environnement

Créer un fichier `.env` à la racine du projet avec les variables suivantes :

```env
NODE_ENV=production
DATABASE_URL=postgresql://username:password@hostname:port/database
SESSION_SECRET=your-super-secret-key-change-this
OPENROUTER_API_KEY=your-openrouter-api-key
```

### 2. Configuration Replit

Le fichier `.replit` est déjà configuré pour le développement :

```
modules = ["nodejs-20", "web"]
run = "npm run dev"

[deployment]
run = ["sh", "-c", "npm run dev"]

[[ports]]
localPort = 5000
externalPort = 80
```

## Déploiement sur Replit

### 1. Import depuis GitHub

1. Aller sur [Replit](https://replit.com)
2. Cliquer sur "Create Repl"
3. Sélectionner "Import from GitHub"
4. Entrer l'URL de votre repository GitHub
5. Cliquer "Import from GitHub"

### 2. Configuration des Secrets

Dans Replit, aller dans l'onglet "Secrets" (🔒) et ajouter :

```
DATABASE_URL=postgresql://your-database-url
SESSION_SECRET=your-secret-key
OPENROUTER_API_KEY=your-api-key
NODE_ENV=production
```

### 3. Installation des Dépendances

Replit installera automatiquement les dépendances, mais si nécessaire :

```bash
npm install
cd client && npm install
```

### 4. Configuration de la Base de Données

Pour une base de données PostgreSQL externe (Neon recommandé) :

1. Créer un compte sur [Neon](https://neon.tech)
2. Créer une nouvelle base de données
3. Copier l'URL de connexion
4. L'ajouter dans les Secrets Replit comme `DATABASE_URL`

### 5. Test de l'Application

1. Cliquer sur le bouton "Run" 
2. L'application sera accessible via l'URL fournie par Replit
3. Tester toutes les fonctionnalités principales :
   - Inscription/Connexion
   - Création de Gbairais
   - Filtres et navigation
   - Système de messages

## Configuration de Production

### 1. Optimisation du Build

Pour la production, modifier le script de démarrage :

```json
{
  "scripts": {
    "start": "NODE_ENV=production node server/index.js",
    "build": "cd client && npm run build",
    "dev": "NODE_ENV=development tsx server/index.ts"
  }
}
```

### 2. Configuration du Serveur

Le serveur est déjà configuré pour Replit avec :

```typescript
const PORT = process.env.PORT || 5000;
const HOST = '0.0.0.0'; // Important pour Replit

app.listen(PORT, HOST, () => {
  console.log(`Server running on http://${HOST}:${PORT}`);
});
```

### 3. Variables d'Environnement de Production

```env
NODE_ENV=production
PORT=5000
HOST=0.0.0.0
DATABASE_URL=postgresql://...
SESSION_SECRET=complex-secret-key
OPENROUTER_API_KEY=your-api-key
```

## Test de l'Environnement

### 1. Tests Fonctionnels

- ✅ **Authentification** : Inscription, connexion, codes par email
- ✅ **Gbairais** : Création, affichage, interactions
- ✅ **Filtres** : Région, émotion, abonnements
- ✅ **Messages** : Conversations privées
- ✅ **Notifications** : Système temps réel

### 2. Tests de Performance

```bash
# Tester la réponse du serveur
curl https://your-repl-name.replit.app/api/health

# Tester l'API
curl https://your-repl-name.replit.app/api/gbairais
```

### 3. Tests de Sécurité

- Vérifier que les secrets ne sont pas exposés
- Tester l'authentification
- Valider les permissions d'accès

## Maintenance

### 1. Monitoring

Surveiller les logs Replit pour :
- Erreurs de connexion base de données
- Erreurs d'authentification
- Performances des requêtes

### 2. Mises à Jour

Pour déployer des changements :

1. Pousser sur GitHub
2. Dans Replit, aller dans l'onglet "Version Control"
3. Cliquer "Pull" pour récupérer les changements
4. Redémarrer l'application

### 3. Backup

- La base de données Neon a des backups automatiques
- Exporter régulièrement les données importantes
- Sauvegarder les secrets et configurations

## Résolution de Problèmes

### Application ne démarre pas

1. Vérifier les variables d'environnement
2. Contrôler la connexion à la base de données
3. Consulter les logs dans la console Replit

### Erreurs de base de données

1. Vérifier l'URL de connexion
2. Tester la connectivité depuis Replit Shell :
   ```bash
   npm run db:test
   ```

### Performance lente

1. Optimiser les requêtes de base de données
2. Activer le cache pour les données statiques
3. Utiliser des indexes appropriés

## Domaine Personnalisé (Optionnel)

Pour un domaine personnalisé sur Replit :

1. Upgrade vers un plan payant
2. Aller dans "Settings" > "Domains"
3. Ajouter votre domaine personnalisé
4. Configurer les DNS selon les instructions

## Conclusion

Replit offre une solution simple et efficace pour déployer Gbairai avec :
- Configuration automatique
- Gestion des secrets sécurisée
- Monitoring intégré
- Facilité de mise à jour depuis GitHub

L'application est maintenant prête pour la production sur Replit ! 🚀
