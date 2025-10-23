
# Guide GitHub Setup pour Gbairai

## 1. Préparation du projet

### Nettoyer le projet

```bash
# Supprimer les fichiers Replit
rm .replit replit.nix

# Nettoyer node_modules si présent
rm -rf node_modules
rm package-lock.json

# Nettoyer les fichiers temporaires
rm -rf .config uploads/*.jpg uploads/*.png
```

### Réinstaller les dépendances

```bash
npm install
```

## 2. Initialisation Git

```bash
# Initialiser le repository
git init

# Ajouter tous les fichiers
git add .

# Commit initial
git commit -m "Initial commit: Gbairai PWA - Réseau social ivoirien"
```

## 3. Création du repository GitHub

### Via GitHub CLI (recommandé)

```bash
# Installer GitHub CLI si pas installé
npm install -g @github/gh

# Login
gh auth login

# Créer le repository
gh repo create gbairai-pwa --public --description "PWA sociale ivoirienne avec carte interactive et analyse IA"

# Push vers GitHub
git remote add origin https://github.com/VOTRE-USERNAME/gbairai-pwa.git
git branch -M main
git push -u origin main
```

### Via interface web GitHub

1. Aller sur [GitHub](https://github.com)
2. Cliquer "New repository"
3. Nom: `gbairai-pwa`
4. Description: "PWA sociale ivoirienne avec carte interactive et analyse IA"
5. Public/Private selon préférence
6. Créer le repository

Puis dans votre terminal :

```bash
git remote add origin https://github.com/VOTRE-USERNAME/gbairai-pwa.git
git branch -M main
git push -u origin main
```

## 4. Configuration GitHub

### Secrets pour Actions (optionnel)

Si vous voulez CI/CD :

1. Settings > Secrets and variables > Actions
2. Ajouter :
   - `DATABASE_URL`
   - `SESSION_SECRET`
   - `OPENROUTER_API_KEY`

### Protection des branches

1. Settings > Branches
2. Add rule pour `main`
3. Require pull request reviews
4. Require status checks

## 5. Clone et setup sur un autre PC

```bash
# Cloner
git clone https://github.com/VOTRE-USERNAME/gbairai-pwa.git
cd gbairai-pwa

# Installer dépendances
npm install

# Copier et configurer environnement
cp .env.example .env
# Éditer .env avec vos variables

# Base de données (si nouvelle)
npm run db:push

# Démarrer
npm run dev
```

## 6. Workflow de développement

### Créer une feature

```bash
git checkout -b feature/nouvelle-fonctionnalite
# Développer...
git add .
git commit -m "Add: nouvelle fonctionnalité"
git push origin feature/nouvelle-fonctionnalite
```

### Pull Request

1. Aller sur GitHub
2. Créer Pull Request
3. Review et merge

### Synchroniser avec main

```bash
git checkout main
git pull origin main
git checkout votre-branche
git rebase main
```

## 7. Releases

### Créer une release

```bash
# Tag
git tag -a v1.0.0 -m "Version 1.0.0: Premier release"
git push origin v1.0.0

# Ou via GitHub CLI
gh release create v1.0.0 --title "Version 1.0.0" --notes "Premier release de Gbairai PWA"
```

## 8. Issues et projet

### Templates d'issues

Créer `.github/ISSUE_TEMPLATE/bug_report.md` :

```markdown
---
name: Bug report
about: Signaler un bug
---

## Description du bug
Brève description du problème

## Étapes pour reproduire
1. Aller à '...'
2. Cliquer sur '...'
3. Voir l'erreur

## Comportement attendu
Ce qui devrait se passer

## Screenshots
Si applicable

## Environnement
- OS: [e.g. iOS]
- Navigateur: [e.g. chrome, safari]
- Version: [e.g. 22]
```

### Project board

1. Projects > New project
2. Board template
3. Organiser les tâches
