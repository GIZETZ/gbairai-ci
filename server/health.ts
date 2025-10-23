import { Request, Response, Express } from 'express';

export const healthCheck = (req: Request, res: Response) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
};

export function setupHealthCheck(app: Express) {

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({ 
      status: 'healthy', 
      timestamp: new Date().toISOString(),
      service: 'gbairai-pwa'
    });
  });

  app.get("/api/health", async (req, res) => {
    try {
      // Vérification de base du serveur
      const healthStatus: any = {
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        database: 'unknown'
      };

      // Test de la base de données si disponible
      if (process.env.DATABASE_URL) {
        try {
          const { pool } = await import('./db');
          const result = await pool.query('SELECT 1 as test');
          healthStatus.database = 'connected';
          healthStatus.dbTest = result.rows[0]?.test === 1 ? 'passed' : 'failed';
        } catch (dbError) {
          console.error('Database health check failed:', dbError);
          healthStatus.database = 'disconnected';
          healthStatus.status = 'DEGRADED';
          healthStatus.dbError = dbError.message;
        }
      } else {
        healthStatus.database = 'not_configured';
        healthStatus.status = 'DEGRADED';
      }

      res.status(healthStatus.status === 'OK' ? 200 : 503).json(healthStatus);
    } catch (error) {
      console.error('Health check error:', error);
      res.status(500).json({
        status: 'ERROR',
        timestamp: new Date().toISOString(),
        error: error.message
      });
    }
  });
}