import dotenv from "dotenv";

// Charger les variables d'environnement
dotenv.config();

// Vérifier que DATABASE_URL est correctement chargée
console.log("DATABASE_URL loaded:", process.env.DATABASE_URL ? "✓" : "✗");
if (process.env.DATABASE_URL) {
  console.log("DATABASE_URL starts with:", process.env.DATABASE_URL.substring(0, 30) + "...");
}

import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import { setupHealthCheck } from "./health";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

(async () => {
  // Setup health check endpoints
  setupHealthCheck(app);
  
  const server = await registerRoutes(app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Log détaillé de l'erreur
    console.error('🚨 Server Error:', {
      status,
      message,
      stack: err.stack,
      url: _req.url,
      method: _req.method,
      timestamp: new Date().toISOString(),
      headers: _req.headers,
      body: _req.body
    });

    // Réponse sécurisée selon l'environnement
    if (process.env.NODE_ENV === 'production') {
      res.status(status).json({ 
        error: status === 500 ? "Erreur interne du serveur" : message,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(status).json({ 
        error: message,
        timestamp: new Date().toISOString(),
        stack: err.stack,
        url: _req.url,
        method: _req.method
      });
    }
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Default to 10000 for Replit deployment compatibility.
  // this serves both the API and the client.
  const port = parseInt(process.env.PORT || '10000', 10);
  const host = "0.0.0.0";
  
  // Force production mode detection
  const isProduction = process.env.NODE_ENV === 'production' || process.env.REPL_SLUG || process.env.REPLIT_DEPLOYMENT;
  
  if (isProduction) {
    app.set('env', 'production');
    process.env.NODE_ENV = 'production';
    console.log('🚀 Running in PRODUCTION mode');
    console.log('🌍 Environment variables:', {
      NODE_ENV: process.env.NODE_ENV,
      REPL_SLUG: process.env.REPL_SLUG,
      REPLIT_DEPLOYMENT: process.env.REPLIT_DEPLOYMENT,
      PORT: process.env.PORT,
      DATABASE_URL: process.env.DATABASE_URL ? 'configured' : 'missing'
    });
  } else {
    console.log('🚀 Running in DEVELOPMENT mode');
  }

  // Add graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received, shutting down gracefully');
    server.close(() => {
      console.log('Process terminated');
    });
  });

  process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
  });

  process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
  });
  
  server.listen(port, host, () => {
    log(`🚀 Server running on ${host}:${port}`);
    log(`🌐 API available at http://${host}:${port}/api`);
    log(`📁 Environment: ${app.get("env")}`);
    if (app.get("env") === "development") {
      log(`⚡ Vite dev server integrated`);
    } else {
      log(`📦 Serving static files in production`);
    }
  });
})();