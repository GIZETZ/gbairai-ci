import { Pool } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import { eq } from 'drizzle-orm';

// Simule la structure de la table messages
const messages = {
  conversationId: 'conversation_id',
  createdAt: 'created_at'
};

async function testDirectDB() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const db = drizzle({ client: pool });
  
  console.log('=== Test direct avec SQL ===');
  const sqlResult = await db.execute(`
    SELECT id, conversation_id, sender_id, content, created_at 
    FROM messages 
    WHERE conversation_id = 1 
    ORDER BY created_at
  `);
  console.log('Résultats SQL:', sqlResult.rows);
  
  console.log('\n=== Test avec Drizzle ORM ===');
  const { messages: messagesTable } = await import('./shared/schema.js');
  const ormResult = await db.select()
    .from(messagesTable)
    .where(eq(messagesTable.conversationId, 1))
    .orderBy(messagesTable.createdAt);
  console.log('Résultats ORM:', ormResult);
}

testDirectDB().catch(console.error);