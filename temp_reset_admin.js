import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import pg from 'pg';

const scryptAsync = promisify(scrypt);

async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const buf = await scryptAsync(password, salt, 64);
  return `${buf.toString("hex")}.${salt}`;
}

console.log('🚀 Démarrage du script de réinitialisation admin...');

// Configuration de la base de données
const DATABASE_URL = process.env.DATABASE_URL;

if (!DATABASE_URL) {
  console.error('❌ DATABASE_URL non défini dans les variables d\'environnement');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

async function resetAdminPassword() {
  try {
    const newPassword = "Gb@irai.Ci.0192*2025";
    const adminEmail = "gbairai.app@gmail.com";

    console.log(`🔐 Génération du hash pour le nouveau mot de passe...`);
    const hashedPassword = await hashPassword(newPassword);

    console.log(`📧 Recherche de l'admin avec email: ${adminEmail}`);

    // Mettre à jour le mot de passe directement dans la base
    const result = await pool.query(
      'UPDATE users SET password = $1 WHERE email = $2 RETURNING id, email, username',
      [hashedPassword, adminEmail]
    );

    if (result.rows.length === 0) {
      console.error('❌ Administrateur non trouvé avec cet email');
      process.exit(1);
    }

    const admin = result.rows[0];
    console.log('✅ Mot de passe admin réinitialisé avec succès !');
    console.log(`👤 Utilisateur: ${admin.username} (${admin.email})`);
    console.log(`🆔 ID: ${admin.id}`);
    console.log(`🔑 Nouveau mot de passe: ${newPassword}`);
    console.log('🕒 Timestamp:', new Date().toISOString());

  } catch (error) {
    console.error('❌ Erreur lors de la réinitialisation:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
    console.log('🏁 Script terminé, connexion fermée');
  }
}

// Exécuter le script
resetAdminPassword();