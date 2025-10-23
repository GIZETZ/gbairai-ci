import express, { type Express } from "express";
import fs from "fs";
import path from "path";
import { createServer as createViteServer, createLogger } from "vite";
import { type Server } from "http";
import viteConfig from "../vite.config";
import { nanoid } from "nanoid";

const viteLogger = createLogger();

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

export async function setupVite(app: Express, server: Server) {
  const serverOptions = {
    middlewareMode: true,
    hmr: { server },
    allowedHosts: ['all'] as const,
  };

  const vite = await createViteServer({
    ...viteConfig,
    configFile: false,
    customLogger: {
      ...viteLogger,
      error: (msg, options) => {
        viteLogger.error(msg, options);
        process.exit(1);
      },
    },
    server: serverOptions,
    appType: "custom",
  });

  app.use(vite.middlewares);
  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;

    try {
      const clientTemplate = path.resolve(
        import.meta.dirname,
        "..",
        "client",
        "index.html",
      );

      // always reload the index.html file from disk incase it changes
      let template = await fs.promises.readFile(clientTemplate, "utf-8");
      template = template.replace(
        `src="/src/main.tsx"`,
        `src="/src/main.tsx?v=${nanoid()}"`,
      );
      const page = await vite.transformIndexHtml(url, template);
      res.status(200).set({ "Content-Type": "text/html" }).end(page);
    } catch (e) {
      vite.ssrFixStacktrace(e as Error);
      next(e);
    }
  });
}

export function serveStatic(app: Express) {
  try {
    // Essayer plusieurs chemins possibles
    const publicPath = path.resolve(import.meta.dirname, "public");
    const clientDistPath = path.resolve(import.meta.dirname, "..", "client", "dist");
    const distPath = path.resolve(import.meta.dirname, "..", "dist");

    console.log(`🔍 Checking paths:`);
    console.log(`   - publicPath: ${publicPath} (exists: ${fs.existsSync(publicPath)})`);
    console.log(`   - clientDistPath: ${clientDistPath} (exists: ${fs.existsSync(clientDistPath)})`);
    console.log(`   - distPath: ${distPath} (exists: ${fs.existsSync(distPath)})`);

    let staticPath = publicPath;

    // Vérifier dans l'ordre de priorité
    if (fs.existsSync(publicPath) && fs.readdirSync(publicPath).length > 0) {
      staticPath = publicPath;
      console.log(`✅ Using publicPath: ${publicPath}`);
    } else if (fs.existsSync(clientDistPath) && fs.readdirSync(clientDistPath).length > 0) {
      staticPath = clientDistPath;
      console.log(`✅ Using clientDistPath: ${clientDistPath}`);
    } else if (fs.existsSync(distPath) && fs.readdirSync(distPath).length > 0) {
      staticPath = distPath;
      console.log(`✅ Using distPath: ${distPath}`);
    } else {
      // Créer un fallback minimal
      console.warn("⚠️ No build directory found, creating fallback...");
      if (!fs.existsSync(publicPath)) {
        fs.mkdirSync(publicPath, { recursive: true });
      }
      
      const fallbackHtml = `<!DOCTYPE html>
<html lang="fr">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Gbairai - Application en cours de chargement</title>
    <style>
      body { 
        font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
        display: flex; 
        justify-content: center; 
        align-items: center; 
        height: 100vh; 
        margin: 0; 
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }
      .container { 
        text-align: center; 
        background: rgba(255,255,255,0.1); 
        padding: 3rem; 
        border-radius: 15px; 
        box-shadow: 0 8px 32px rgba(0,0,0,0.3);
        backdrop-filter: blur(10px);
      }
      .spinner {
        width: 40px;
        height: 40px;
        margin: 20px auto;
        border: 4px solid rgba(255,255,255,0.3);
        border-top: 4px solid white;
        border-radius: 50%;
        animation: spin 1s linear infinite;
      }
      @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
    </style>
</head>
<body>
    <div class="container">
        <h1>🚀 Gbairai</h1>
        <div class="spinner"></div>
        <p>Chargement de l'application...</p>
        <p><small>Patientez quelques instants</small></p>
    </div>
</body>
</html>`;
      
      fs.writeFileSync(path.resolve(publicPath, "index.html"), fallbackHtml);
      staticPath = publicPath;
      console.log(`💾 Created fallback at: ${publicPath}`);
    }

    // Liste le contenu du dossier static
    try {
      const files = fs.readdirSync(staticPath);
      console.log(`📂 Static files (${files.length}):`, files.slice(0, 10));
    } catch (error) {
      console.error(`❌ Error reading static directory:`, error);
    }

    console.log(`📁 Serving static files from: ${staticPath}`);
    
    // Servir les fichiers statiques avec cache headers pour la production
    app.use(express.static(staticPath, {
      maxAge: process.env.NODE_ENV === 'production' ? '1d' : 0,
      etag: true,
      lastModified: true
    }));
    
    // Fallback pour les routes SPA
    app.get("*", (req, res) => {
      // Ignorer les routes API
      if (req.path.startsWith('/api/')) {
        return res.status(404).json({ error: 'API endpoint not found' });
      }

      const indexPath = path.resolve(staticPath, "index.html");
      console.log(`🔄 SPA fallback for ${req.path} -> ${indexPath}`);
      
      if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        console.error(`❌ index.html not found at: ${indexPath}`);
        res.status(404).send(`
          <h1>Application non disponible</h1>
          <p>Les fichiers de l'application n'ont pas été trouvés.</p>
          <p>Chemin recherché: ${indexPath}</p>
        `);
      }
    });

  } catch (error) {
    console.error(`❌ Error in serveStatic:`, error);
    
    // Fallback d'urgence
    app.get("*", (req, res) => {
      if (req.path.startsWith('/api/')) {
        return res.status(500).json({ error: 'Server configuration error' });
      }
      res.status(500).send(`
        <h1>Erreur de configuration</h1>
        <p>Une erreur est survenue lors de la configuration du serveur.</p>
        <p>Error: ${error.message}</p>
      `);
    });
  }
}