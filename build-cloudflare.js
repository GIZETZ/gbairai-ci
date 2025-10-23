
#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Building Gbairai for Cloudflare Pages...');

// Variables d'environnement pour Cloudflare
process.env.NODE_ENV = 'production';
process.env.VITE_API_URL = process.env.VITE_API_URL || '/api';

try {
  // Nettoyer le dossier de build précédent
  if (fs.existsSync('dist')) {
    execSync('rm -rf dist', { stdio: 'inherit' });
  }

  // Build du client
  console.log('📦 Building client for Cloudflare...');
  execSync('cd client && npm install && npm run build', { stdio: 'inherit' });

  // Copier les fichiers de build vers la racine
  console.log('📁 Copying build files...');
  execSync('cp -r client/dist/* ./', { stdio: 'inherit' });

  // Créer _redirects pour Cloudflare Pages
  const redirects = `
# API redirects vers votre backend (si vous avez un backend séparé)
/api/* https://votre-backend.replit.app/api/:splat 200

# SPA fallback
/* /index.html 200
`;

  fs.writeFileSync('_redirects', redirects.trim());
  console.log('📝 Created _redirects file for Cloudflare Pages');

  // Créer _headers pour optimisation
  const headers = `
# Cache static assets
/static/*
  Cache-Control: public, max-age=31536000, immutable

# Cache images
*.png
  Cache-Control: public, max-age=31536000
*.jpg
  Cache-Control: public, max-age=31536000
*.webp
  Cache-Control: public, max-age=31536000

# Service Worker
/sw.js
  Cache-Control: public, max-age=0, must-revalidate

# Manifest
/manifest.json
  Cache-Control: public, max-age=3600
`;

  fs.writeFileSync('_headers', headers.trim());
  console.log('📝 Created _headers file for optimization');

  console.log('✅ Build completed successfully for Cloudflare Pages!');

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
