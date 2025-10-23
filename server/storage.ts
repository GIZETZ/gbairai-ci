import { 
  users, 
  gbairais, 
  interactions, 
  conversations, 
  messages,
  follows,
  notifications,
  reports,
  type User, 
  type InsertUser,
  type UpdateUser,
  type UserProfile,
  type UserWithStats,
  type Gbairai,
  type InsertGbairai,
  type GbairaiWithInteractions,
  type Interaction,
  type InsertInteraction,
  type Conversation,
  type InsertConversation,
  type Message,
  type InsertMessage,
  type Follow,
  type InsertFollow,
  type LocationData
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, sql, inArray, gt, ilike, ne, or, count } from "drizzle-orm";
import session from "express-session";
import connectPg from "connect-pg-simple";
import createMemoryStore from "memorystore";
import { pool } from "./db";
import * as schema from "@shared/schema";
import bcrypt from 'bcrypt';
import { scrypt, randomBytes } from 'crypto';
import { promisify } from 'util';

const PostgresSessionStore = connectPg(session);
const MemoryStore = createMemoryStore(session);

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: UpdateUser): Promise<User | undefined>;
  updateUserPassword(email: string, newPassword: string): Promise<boolean>;

  createGbairai(gbairai: InsertGbairai): Promise<Gbairai>;
  getGbairais(limit?: number, offset?: number): Promise<GbairaiWithInteractions[]>;
  getGbairaiById(id: number): Promise<GbairaiWithInteractions | undefined>;
  getGbairaisByEmotion(emotion: string, limit?: number): Promise<GbairaiWithInteractions[]>;
  getGbairaisByLocation(location: LocationData, radius: number, limit?: number): Promise<GbairaiWithInteractions[]>;
  getUserGbairais(userId: number, limit?: number): Promise<GbairaiWithInteractions[]>;
  deleteGbairai(id: number, userId: number): Promise<boolean>;

  createInteraction(interaction: InsertInteraction): Promise<Interaction>;
  getInteractionsByGbairai(gbairaiId: number): Promise<Interaction[]>;
  getUserInteraction(userId: number, gbairaiId: number, type: string): Promise<Interaction | undefined>;
  deleteInteraction(id: number, userId: number): Promise<boolean>;
  getRepliesByCommentId(commentId: number): Promise<Interaction[]>;

  // Messagerie
  getAllUsers(): Promise<User[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversationsByUserId(userId: number): Promise<Conversation[]>;
  getConversationById(id: number): Promise<Conversation | undefined>;
  getConversationByParticipants(participants: number[]): Promise<Conversation | undefined>;
  createMessage(message: InsertMessage): Promise<Message>;
  getMessagesByConversationId(conversationId: number): Promise<Message[]>;
  getUnreadMessagesCount(conversationId: number, userId: number): Promise<number>;
  markMessagesAsRead(conversationId: number, userId: number): Promise<void>;

  // Profils et follows
  getUserProfile(userId: number): Promise<UserWithStats | undefined>;
  updateUserProfile(userId: number, profile: UserProfile): Promise<User | undefined>;
  followUser(followerId: number, followingId: number): Promise<Follow>;
  unfollowUser(followerId: number, followingId: number): Promise<boolean>;
  isFollowing(followerId: number, followingId: number): Promise<boolean>;
  getUserFollowers(userId: number): Promise<User[]>;
  getUserFollowing(userId: number): Promise<User[]>;
  getUserStats(userId: number): Promise<{ followersCount: number; followingCount: number; gbairaisCount: number; }>;
  searchUsers(query: string, currentUserId?: number): Promise<UserWithStats[]>;

  // Nouveaux filtres
  getGbairaisFromFollowing(userId: number, limit?: number, offset?: number): Promise<GbairaiWithInteractions[]>;
  getGbairaisByRegion(region: string, limit?: number, offset?: number): Promise<GbairaiWithInteractions[]>;

  // Blocages d'utilisateurs
  blockUser(blockerId: number, blockedId: number): Promise<any>;
  unblockUser(blockerId: number, blockedId: number): Promise<boolean>;
  isBlocked(userId1: number, userId2: number): Promise<boolean>;
  getBlockedUsers(userId: number): Promise<any[]>;

  // Suppression de conversations
  deleteConversationForUser(conversationId: number, userId: number): Promise<any>;
  isConversationDeletedForUser(conversationId: number, userId: number): Promise<boolean>;
  restoreConversationForUser(conversationId: number, userId: number): Promise<boolean>;

  // Suppression de messages
  deleteMessageForUser(messageId: number, userId: number): Promise<boolean>;
  deleteMessageForEveryone(messageId: number, userId: number): Promise<boolean>;
  isMessageDeletedForUser(messageId: number, userId: number): Promise<boolean>;

  // Notifications
  createNotification(userId: number, type: string, message: string, fromUserId?: number, gbairaiId?: number, conversationId?: number): Promise<void>;
  createNotificationForAllUsers(type: string, message: string, fromUserId?: number, gbairaiId?: number, excludeUserId?: number): Promise<void>;
  getNotifications(userId: number, limit?: number): Promise<any[]>;
  markNotificationAsRead(id: number): Promise<boolean>;

  sessionStore: any;
}

interface AdminMessage {
  id: number;
  recipientId: number;
  recipientUsername: string;
  content: string;
  sentAt: Date;
}

interface Report {
  id: number;
  userId: number;
  type: string;
  targetId: number;
  reason: string;
  status: string;
  adminNote?: string;
  createdAt: Date;
  user?: { username: string };
  gbairai?: { content: string; user?: { username: string } };
}

interface InsertReport {
  userId: number;
  type: string;
  targetId: number;
  reason: string;
  status: string;
}

export class DatabaseStorage implements IStorage {
  sessionStore: any;
  public users = users;
  public gbairais = gbairais;
  public interactions = interactions;
  public conversations = conversations;
  public messages = messages;
  public follows = follows;
  public notifications = notifications;
  private db: any;

  constructor() {
    this.sessionStore = new PostgresSessionStore({ 
      pool, 
      createTableIfMissing: true,
      tableName: 'session'
    });
    this.db = db;
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user || undefined;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  // Mettre à jour un utilisateur
  async updateUser(id: number, updateUser: UpdateUser): Promise<User | undefined> {
    try {
      if (updateUser.email && id === 0) {
        // Recherche par email quand id est 0 (cas de réinitialisation de mot de passe)
        const [user] = await db
          .update(users)
          .set(updateUser)
          .where(eq(users.email, updateUser.email))
          .returning();

        return user || undefined;
      } else {
        // Recherche par ID
        const [user] = await db
          .update(users)
          .set(updateUser)
          .where(eq(users.id, id))
          .returning();

        return user || undefined;
      }
    } catch (error) {
      console.error('Erreur mise à jour utilisateur:', error);
      return undefined;
    }
  }

  // Mettre à jour le mot de passe d'un utilisateur
  async updateUserPassword(email: string, newPassword: string): Promise<boolean> {
    try {
      // Utiliser le même système de hashage que le reste de l'app (scrypt)
      const scryptAsync = promisify(scrypt);
      const salt = randomBytes(16).toString('hex');
      const buf = (await scryptAsync(newPassword, salt, 64)) as Buffer;
      const hashedPassword = `${buf.toString('hex')}.${salt}`;

      const [updated] = await db
        .update(users)
        .set({ password: hashedPassword })
        .where(eq(users.email, email))
        .returning();

      return !!updated;
    } catch (error) {
      console.error('Erreur mise à jour mot de passe:', error);
      return false;
    }
  }

  async createGbairai(insertGbairai: InsertGbairai): Promise<Gbairai> {
    const [gbairai] = await db
      .insert(gbairais)
      .values(insertGbairai)
      .returning();
    return gbairai;
  }

  async getGbairais(limit = 20, offset = 0): Promise<GbairaiWithInteractions[]> {
    const gbairaisData = await db
      .select()
      .from(gbairais)
      .leftJoin(users, eq(gbairais.userId, users.id))
      .where(eq(gbairais.status, 'active'))
      .orderBy(desc(gbairais.createdAt))
      .limit(limit)
      .offset(offset);

    const gbairaisWithInteractions: GbairaiWithInteractions[] = [];

    for (const row of gbairaisData) {
      const gbairai = row.gbairais;
      const user = row.users;

      const interactionsData = await this.getInteractionsByGbairai(gbairai.id);

      const likesCount = interactionsData.filter(i => i.type === 'like').length;
      const commentsCount = interactionsData.filter(i => i.type === 'comment').length;
      const sharesCount = interactionsData.filter(i => i.type === 'share').length;

      gbairaisWithInteractions.push({
        ...gbairai,
        interactions: interactionsData,
        user: user || undefined,
        likesCount,
        commentsCount,
        sharesCount
      });
    }

    return gbairaisWithInteractions;
  }

  async getGbairaiById(id: number): Promise<GbairaiWithInteractions | undefined> {
    const [gbairaiData] = await db
      .select()
      .from(gbairais)
      .leftJoin(users, eq(gbairais.userId, users.id))
      .where(and(eq(gbairais.id, id), eq(gbairais.status, 'active')));

    if (!gbairaiData) return undefined;

    const gbairai = gbairaiData.gbairais;
    const user = gbairaiData.users;

    const interactionsData = await this.getInteractionsByGbairai(gbairai.id);

    const likesCount = interactionsData.filter(i => i.type === 'like').length;
    const commentsCount = interactionsData.filter(i => i.type === 'comment').length;
    const sharesCount = interactionsData.filter(i => i.type === 'share').length;

    return {
      ...gbairai,
      interactions: interactionsData,
      user: user || undefined,
      likesCount,
      commentsCount,
      sharesCount
    };
  }

  async getGbairaisByEmotion(emotion: string, limit = 20): Promise<GbairaiWithInteractions[]> {
    const gbairaisData = await db
      .select()
      .from(gbairais)
      .leftJoin(users, eq(gbairais.userId, users.id))
      .where(and(eq(gbairais.emotion, emotion), eq(gbairais.status, 'active')))
      .orderBy(desc(gbairais.createdAt))
      .limit(limit);

    const gbairaisWithInteractions: GbairaiWithInteractions[] = [];

    for (const row of gbairaisData) {
      const gbairai = row.gbairais;
      const user = row.users;

      const interactionsData = await this.getInteractionsByGbairai(gbairai.id);

      const likesCount = interactionsData.filter(i => i.type === 'like').length;
      const commentsCount = interactionsData.filter(i => i.type === 'comment').length;
      const sharesCount = interactionsData.filter(i => i.type === 'share').length;

      gbairaisWithInteractions.push({
        ...gbairai,
        interactions: interactionsData,
        user: user || undefined,
        likesCount,
        commentsCount,
        sharesCount
      });
    }

    return gbairaisWithInteractions;
  }

  async getGbairaisByLocation(location: LocationData, radius: number, limit = 20): Promise<GbairaiWithInteractions[]> {
    // Using simple distance calculation for now
    // In production, use PostGIS for proper geospatial queries
    const gbairaisData = await db
      .select()
      .from(gbairais)
      .leftJoin(users, eq(gbairais.userId, users.id))
      .where(eq(gbairais.status, 'active'))
      .orderBy(desc(gbairais.createdAt))
      .limit(limit * 2); // Get more to filter by distance

    const gbairaisWithInteractions: GbairaiWithInteractions[] = [];

    for (const row of gbairaisData) {
      const gbairai = row.gbairais;
      const user = row.users;

      // Check if gbairai has location data
      if (gbairai.location && typeof gbairai.location === 'object') {
        const gbairaiLocation = gbairai.location as any;
        if (gbairaiLocation.latitude && gbairaiLocation.longitude) {
          // Simple distance calculation
          const distance = this.calculateDistance(
            location.latitude,
            location.longitude,
            gbairaiLocation.latitude,
            gbairaiLocation.longitude
          );

          if (distance <= radius) {
            const interactionsData = await this.getInteractionsByGbairai(gbairai.id);

            const likesCount = interactionsData.filter(i => i.type === 'like').length;
            const commentsCount = interactionsData.filter(i => i.type === 'comment').length;
            const sharesCount = interactionsData.filter(i => i.type === 'share').length;

            gbairaisWithInteractions.push({
              ...gbairai,
              interactions: interactionsData,
              user: user || undefined,
              likesCount,
              commentsCount,
              sharesCount
            });
          }
        }
      }
    }

    return gbairaisWithInteractions.slice(0, limit);
  }

  async getUserGbairais(userId: number, limit = 20): Promise<GbairaiWithInteractions[]> {
    const gbairaisData = await db
      .select()
      .from(gbairais)
      .leftJoin(users, eq(gbairais.userId, users.id))
      .where(and(eq(gbairais.userId, userId), eq(gbairais.status, 'active')))
      .orderBy(desc(gbairais.createdAt))
      .limit(limit);

    const gbairaisWithInteractions: GbairaiWithInteractions[] = [];

    for (const row of gbairaisData) {
      const gbairai = row.gbairais;
      const user = row.users;

      const interactionsData = await this.getInteractionsByGbairai(gbairai.id);

      const likesCount = interactionsData.filter(i => i.type === 'like').length;
      const commentsCount = interactionsData.filter(i => i.type === 'comment').length;
      const sharesCount = interactionsData.filter(i => i.type === 'share').length;

      gbairaisWithInteractions.push({
        ...gbairai,
        interactions: interactionsData,
        user: user || undefined,
        likesCount,
        commentsCount,
        sharesCount
      });
    }

    return gbairaisWithInteractions;
  }

  async deleteGbairai(id: number, userId: number): Promise<boolean> {
    // Si userId est 0, c'est un admin qui peut supprimer n'importe quel gbairai
    const whereClause = userId === 0 
      ? eq(gbairais.id, id)
      : and(eq(gbairais.id, id), eq(gbairais.userId, userId));

    const [result] = await db
      .update(gbairais)
      .set({ status: 'deleted' })
      .where(whereClause)
      .returning();

    return !!result;
  }

  async createInteraction(insertInteraction: InsertInteraction): Promise<Interaction> {
    const [interaction] = await db
      .insert(interactions)
      .values(insertInteraction)
      .returning();
    return interaction;
  }

  async getInteractionsByGbairai(gbairaiId: number): Promise<Interaction[]> {
    const result = await db
      .select({
        id: interactions.id,
        userId: interactions.userId,
        gbairaiId: interactions.gbairaiId,
        type: interactions.type,
        content: interactions.content,
        createdAt: interactions.createdAt,
        parentCommentId: interactions.parentCommentId,
        user: {
          id: users.id,
          username: users.username,
          email: users.email,
        }
      })
      .from(interactions)
      .leftJoin(users, eq(interactions.userId, users.id))
      .where(eq(interactions.gbairaiId, gbairaiId))
      .orderBy(desc(interactions.createdAt));

    return result as any;
  }

  async getUserInteraction(userId: number, gbairaiId: number, type: string): Promise<Interaction | undefined> {
    const [interaction] = await db
      .select()
      .from(interactions)
      .where(and(
        eq(interactions.userId, userId),
        eq(interactions.gbairaiId, gbairaiId),
        eq(interactions.type, type)
      ));
    return interaction || undefined;
  }

  async deleteInteraction(id: number, userId: number): Promise<boolean> {
    const [result] = await db
      .delete(interactions)
      .where(and(eq(interactions.id, id), eq(interactions.userId, userId)))
      .returning();

    return !!result;
  }

  async getRepliesByCommentId(commentId: number): Promise<Interaction[]> {
    const result = await db
      .select({
        id: interactions.id,
        userId: interactions.userId,
        gbairaiId: interactions.gbairaiId,
        type: interactions.type,
        content: interactions.content,
        createdAt: interactions.createdAt,
        parentCommentId: interactions.parentCommentId,
        user: {
          id: users.id,
          username: users.username,
          email: users.email,
        }
      })
      .from(interactions)
      .leftJoin(users, eq(interactions.userId, users.id))
      .where(and(
        eq(interactions.parentCommentId, commentId),
        eq(interactions.type, 'comment')
      ))
      .orderBy(desc(interactions.createdAt));

    return result as any;
  }

  // Méthodes de messagerie pour DatabaseStorage
  async getAllUsers(): Promise<User[]> {
    const allUsers = await db.select().from(users)
      .where(eq(users.isActive, true))
      .orderBy(users.username);
    return allUsers;
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const [newConversation] = await db.insert(conversations)
      .values(conversation)
      .returning();
    return newConversation;
  }

  async getConversationsByUserId(userId: number): Promise<Conversation[]> {
    try {
      const userConversations = await db
        .select()
        .from(conversations)
        .where(sql`${conversations.participants} @> ${JSON.stringify([userId])}`)
        .orderBy(desc(conversations.lastMessageAt));

      return userConversations;
    } catch (error) {
      console.error('Erreur récupération conversations:', error);
      throw error;
    }
  }

  async getConversationById(id: number): Promise<Conversation | undefined> {
    try {
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(eq(conversations.id, id));
      return conversation || undefined;
    } catch (error) {
      console.error('Erreur récupération conversation:', error);
      return undefined;
    }
  }

  async getConversationByParticipants(participants: number[]): Promise<Conversation | undefined> {
    try {
      const sortedParticipants = participants.sort();
      const [conversation] = await db
        .select()
        .from(conversations)
        .where(sql`${conversations.participants} = ${JSON.stringify(sortedParticipants)}`);
      return conversation || undefined;
    } catch (error) {
      console.error('Erreur récupération conversation par participants:', error);
      return undefined;
    }
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    // Utiliser uniquement les champs de base qui existent dans la table
    const messageData = {
      conversationId: message.conversationId,
      senderId: message.senderId,
      content: message.content,
      type: message.type || 'text',
      replyToId: message.replyToId
    };

    const [newMessage] = await db.insert(messages)
      .values(messageData)
      .returning();

    // Mettre à jour la dernière activité de la conversation
    if (message.conversationId) {
      await db.update(conversations)
        .set({ lastMessageAt: new Date() })
        .where(eq(conversations.id, message.conversationId));

      // NOUVEAU: Restaurer automatiquement la conversation pour tous les participants qui l'avaient supprimée
      const conversation = await this.getConversationById(message.conversationId);
      if (conversation) {
        const participants = conversation.participants as number[];

        // Pour chaque participant, vérifier s'il avait supprimé la conversation et la restaurer
        for (const participantId of participants) {
          const isDeleted = await this.isConversationDeletedForUser(message.conversationId, participantId);
          if (isDeleted) {
            console.log(`Restauration automatique de la conversation ${message.conversationId} pour l'utilisateur ${participantId}`);
            await this.restoreConversationForUser(message.conversationId, participantId);
          }
        }
      }
    }

    return newMessage;
  }

  async getMessagesByConversationId(conversationId: number): Promise<Message[]> {
    try {
      const allMessages = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conversationId),
            or(
              eq(messages.deletedForEveryone, false),
              sql`${messages.deletedForEveryone} IS NULL`
            )
          )
        )
        .orderBy(messages.createdAt);

      return allMessages;
    } catch (error) {
      console.error('Erreur récupération messages:', error);
      throw error;
    }
  }

  async getUnreadMessagesCount(conversationId: number, userId: number): Promise<number> {
    try {
      const result = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(
          and(
            eq(messages.conversationId, conversationId),
            ne(messages.senderId, userId),
            or(
              eq(messages.read, false),
              sql`${messages.read} IS NULL`
            )
          )
        );

      return result[0]?.count || 0;
    } catch (error) {
      console.error('Erreur comptage messages non lus:', error);
      return 0;
    }
  }

  async markMessagesAsRead(conversationId: number, userId: number): Promise<void> {
    try {
      const result = await db
        .update(messages)
        .set({ read: true })
        .where(
          and(
            eq(messages.conversationId, conversationId),
            ne(messages.senderId, userId),
            or(
              eq(messages.read, false),
              sql`${messages.read} IS NULL`
            )
          )
        );
      console.log(`Messages marqués comme lus: ${result.rowCount || 0}`);
    } catch (error) {
      console.error('Erreur marquage messages comme lus:', error);
      // Ne pas faire échouer l'opération si le marquage échoue
    }
  }

  // Méthodes pour les profils et follows
  async getUserProfile(userId: number): Promise<UserWithStats | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    if (!user) return undefined;

    const stats = await this.getUserStats(userId);
    return {
      ...user,
      ...stats,
    };
  }

  async updateUserProfile(userId: number, profile: UserProfile): Promise<User | undefined> {
    const [user] = await db
      .update(users)
      .set({ profile })
      .where(eq(users.id, userId))
      .returning();
    return user || undefined;
  }

  // Blocages d'utilisateurs
  async blockUser(blockerId: number, blockedId: number) {
    const [block] = await db
      .insert(schema.blocks)
      .values({ blockerId, blockedId })
      .returning();
    return block;
  }

  async unblockUser(blockerId: number, blockedId: number) {
    const [deletedBlock] = await db
      .delete(schema.blocks)
      .where(
        and(
          eq(schema.blocks.blockerId, blockerId),
          eq(schema.blocks.blockedId, blockedId)
        )
      )
      .returning();
    return !!deletedBlock;
  }

  async isBlocked(userId1: number, userId2: number): Promise<boolean> {
    const blocks = await db
      .select()
      .from(schema.blocks)
      .where(
        or(
          and(eq(schema.blocks.blockerId, userId1), eq(schema.blocks.blockedId, userId2)),
          and(eq(schema.blocks.blockerId, userId2), eq(schema.blocks.blockedId, userId1))
        )
      );
    return blocks.length > 0;
  }

  async getBlockedUsers(userId: number) {
    const blocks = await db
      .select({
        id: schema.users.id,
        username: schema.users.username,
        email: schema.users.email,
        blockedAt: schema.blocks.createdAt,
      })
      .from(schema.blocks)
      .innerJoin(schema.users, eq(schema.users.id, schema.blocks.blockedId))
      .where(eq(schema.blocks.blockerId, userId));
    return blocks;
  }

  // Suppression de conversations
  async deleteConversationForUser(conversationId: number, userId: number) {
    const [deletion] = await db
      .insert(schema.conversationDeletions)
      .values({ conversationId, userId })
      .returning();
    return deletion;
  }

  async isConversationDeletedForUser(conversationId: number, userId: number): Promise<boolean> {
    const deletions = await db
      .select()
      .from(schema.conversationDeletions)
      .where(
        and(
          eq(schema.conversationDeletions.conversationId, conversationId),
          eq(schema.conversationDeletions.userId, userId)
        )
      );
    return deletions.length > 0;
  }

  async restoreConversationForUser(conversationId: number, userId: number): Promise<boolean> {
    try {
      const [restored] = await db
        .delete(schema.conversationDeletions)
        .where(
          and(
            eq(schema.conversationDeletions.conversationId, conversationId),
            eq(schema.conversationDeletions.userId, userId)
          )
        )
        .returning();

      console.log(`Conversation ${conversationId} restaurée pour utilisateur ${userId}: ${!!restored}`);
      return !!restored;
    } catch (error) {
      console.error('Erreur restauration conversation:', error);
      return false;
    }
  }

  // Suppression de messages
  async deleteMessageForUser(messageId: number, userId: number): Promise<boolean> {
    try {
      // Vérifier que le message existe
      const [message] = await db
        .select()
        .from(messages)
        .where(eq(messages.id, messageId));

      if (!message) return false;

      // Vérifier que l'utilisateur fait partie de la conversation
      const conversation = await this.getConversationById(message.conversationId!);
      if (!conversation) return false;

      const participants = conversation.participants as number[];
      if (!participants.includes(userId)) return false;

      // Ajouter à la table des suppressions
      await db
        .insert(schema.messageDeletions)
        .values({ messageId, userId })
        .onConflictDoNothing();

      return true;
    } catch (error) {
      console.error('Erreur suppression message pour utilisateur:', error);
      return false;
    }
  }

  async deleteMessageForEveryone(messageId: number, userId: number): Promise<boolean> {
    try {
      // Vérifier que l'utilisateur est l'expéditeur du message
      const [message] = await db
        .select()
        .from(messages)
        .where(
          and(
            eq(messages.id, messageId),
            eq(messages.senderId, userId)
          )
        );

      if (!message) return false;

      // Marquer le message comme supprimé pour tout le monde
      const [updated] = await db
        .update(messages)
        .set({ 
          deletedForEveryone: true,
          content: 'Ce message a été supprimé'
        })
        .where(eq(messages.id, messageId))
        .returning();

      return !!updated;
    } catch (error) {
      console.error('Erreur suppression message pour tous:', error);
      return false;
    }
  }

  async isMessageDeletedForUser(messageId: number, userId: number): Promise<boolean> {
    const deletions = await db
      .select()
      .from(schema.messageDeletions)
      .where(
        and(
          eq(schema.messageDeletions.messageId, messageId),
          eq(schema.messageDeletions.userId, userId)
        )
      );
    return deletions.length > 0;
  }

  async followUser(followerId: number, followingId: number): Promise<Follow> {
    const [follow] = await db
      .insert(follows)
      .values({ followerId, followingId })
      .returning();
    return follow;
  }

  async unfollowUser(followerId: number, followingId: number): Promise<boolean> {
    const result = await db
      .delete(follows)
      .where(and(
        eq(follows.followerId, followerId),
        eq(follows.followingId, followingId)
      ));
    return result.rowCount > 0;
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    const [follow] = await db
      .select()
      .from(follows)
      .where(and(
        eq(follows.followerId, followerId),
        eq(follows.followingId, followingId)
      ));
    return !!follow;
  }

  async getUserFollowers(userId: number): Promise<User[]> {
    return await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        password: users.password,
        role: users.role,
        createdAt: users.createdAt,
        isActive: users.isActive,
        profile: users.profile,
      })
      .from(follows)
      .innerJoin(users, eq(follows.followerId, users.id))
      .where(eq(follows.followingId, userId));
  }

  async getUserFollowing(userId: number): Promise<User[]> {
    return await db
      .select({
        id: users.id,
        username: users.username,
        email: users.email,
        password: users.password,
        role: users.role,
        createdAt: users.createdAt,
        isActive: users.isActive,
        profile: users.profile,
      })
      .from(follows)
      .innerJoin(users, eq(follows.followingId, users.id))
      .where(eq(follows.followerId, userId));
  }

  async getUserStats(userId: number): Promise<{ followersCount: number; followingCount: number; gbairaisCount: number; }> {
    const [followersCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(follows)
      .where(eq(follows.followingId, userId));

    const [followingCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(follows)
      .where(eq(follows.followerId, userId));

    const [gbairaisCount] = await db
      .select({ count: sql<number>`count(*)` })
      .from(gbairais)
      .where(and(
        eq(gbairais.userId, userId),
        eq(gbairais.status, 'active')
      ));

    return {
      followersCount: followersCount?.count || 0,
      followingCount: followingCount?.count || 0,
      gbairaisCount: gbairaisCount?.count || 0,
    };
  }

  async searchUsers(query: string, currentUserId?: number): Promise<UserWithStats[]> {
    const usersData = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.isActive, true),
          sql`lower(${users.username}) like lower('%' || ${query} || '%')`
        )
      )
      .limit(20);

    const usersWithStats: UserWithStats[] = [];
    for (const user of usersData) {
      const stats = await this.getUserStats(user.id);
      const isFollowing = currentUserId ? await this.isFollowing(currentUserId, user.id) : false;

      usersWithStats.push({
        ...user,
        ...stats,
        isFollowing,
      });
    }

    return usersWithStats;
  }

  // Méthodes pour les notifications
  async createNotification(userId: number, type: string, message: string, fromUserId?: number, gbairaiId?: number, conversationId?: number): Promise<void> {
    await db.insert(notifications).values({
      userId,
      type,
      message,
      fromUserId: fromUserId || null,
      gbairaiId: gbairaiId || null,
      read: false
    });
  }

  async createNotificationForAllUsers(type: string, message: string, fromUserId?: number, gbairaiId?: number, excludeUserId?: number): Promise<void> {
    // Récupérer tous les utilisateurs actifs
    const allUsers = await db.select({ id: users.id }).from(users).where(eq(users.isActive, true));

    // Créer des notifications pour tous les utilisateurs sauf celui exclu
    const notificationsToInsert = allUsers
      .filter(user => excludeUserId ? user.id !== excludeUserId : true)
      .map(user => ({
        userId: user.id,
        type,
        message,
        fromUserId: fromUserId || null,
        gbairaiId: gbairaiId || null,
        read: false
      }));

    if (notificationsToInsert.length > 0) {
      await db.insert(notifications).values(notificationsToInsert);
    }
  }

  async getNotifications(userId: number, limit: number = 20): Promise<any[]> {
    const userNotifications = await db
      .select({
        id: notifications.id,
        type: notifications.type,
        message: notifications.message,
        read: notifications.read,
        createdAt: notifications.createdAt,
        fromUser: {
          id: users.id,
          username: users.username
        },
        gbairai: {
          id: gbairais.id,
          content: gbairais.content,
          emotion: gbairais.emotion
        }
      })
      .from(notifications)
      .leftJoin(users, eq(notifications.fromUserId, users.id))
      .leftJoin(gbairais, eq(notifications.gbairaiId, gbairais.id))
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt))
      .limit(limit);

    return userNotifications;
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    const result = await db
      .update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, id));

    return result.rowCount > 0;
  }

  // Nouveaux filtres
  async getGbairaisFromFollowing(userId: number, limit: number = 20, offset: number = 0): Promise<GbairaiWithInteractions[]> {
    const gbairaisData = await db
      .select()
      .from(gbairais)
      .innerJoin(follows, eq(gbairais.userId, follows.followingId))
      .where(eq(follows.followerId, userId))
      .orderBy(desc(gbairais.createdAt))
      .limit(limit)
      .offset(offset);

    const result: GbairaiWithInteractions[] = [];
    for (const item of gbairaisData) {
      const gbairai = item.gbairais;
      const interactionsData = await this.getInteractionsByGbairai(gbairai.id);
      const user = gbairai.userId ? await this.getUser(gbairai.userId) : undefined;

      const likesCount = interactionsData.filter(i => i.type === 'like').length;
      const commentsCount = interactionsData.filter(i => i.type === 'comment').length;
      const sharesCount = interactionsData.filter(i => i.type === 'share').length;

      result.push({
        ...gbairai,
        interactions: interactionsData,
        user,
        likesCount,
        commentsCount,
        sharesCount
      });
    }

    return result;
  }

  async getGbairaisByRegion(region: string, limit: number = 20, offset: number = 0): Promise<GbairaiWithInteractions[]> {
    const gbairaisData = await db
      .select()
      .from(gbairais)
      .where(
        and(
          eq(gbairais.status, 'active'),
          sql`${gbairais.location}->>'region' = ${region}`
        )
      )
      .orderBy(desc(gbairais.createdAt))
      .limit(limit)
      .offset(offset);

    const result: GbairaiWithInteractions[] = [];
    for (const gbairai of gbairaisData) {
      const interactionsData = await this.getInteractionsByGbairai(gbairai.id);
      const user = gbairai.userId ? await this.getUser(gbairai.userId) : undefined;

      const likesCount = interactionsData.filter(i => i.type === 'like').length;
      const commentsCount = interactionsData.filter(i => i.type === 'comment').length;
      const sharesCount = interactionsData.filter(i => i.type === 'share').length;

      result.push({
        ...gbairai,
        interactions: interactionsData,
        user,
        likesCount,
        commentsCount,
        sharesCount
      });
    }

    return result;
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  async updateUserLastLogin(userId: number, location?: any): Promise<void> {
    try {
      await db
        .update(users)
        .set({
          lastLoginAt: new Date(),
          ...(location && { lastLocation: location })
        })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error('Erreur mise à jour dernière connexion:', error);
      // Ne pas faire échouer la connexion si la mise à jour échoue
    }
  }

  // Méthodes admin
  async getAllUsersWithStats(): Promise<any[]> {
    const usersData = await db
      .select()
      .from(users)
      .orderBy(desc(users.createdAt));

    const usersWithStats: any[] = [];

    for (const user of usersData) {
      const gbairaisCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(gbairais)
        .where(eq(gbairais.userId, user.id));

      const interactionsCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(interactions)
        .where(eq(interactions.userId, user.id));

      const messagesCountResult = await db
        .select({ count: sql<number>`count(*)` })
        .from(messages)
        .where(eq(messages.senderId, user.id));

      const gbairaisCount = gbairaisCountResult[0]?.count || 0;
      const interactionsCount = interactionsCountResult[0]?.count || 0;
      const messagesCount = messagesCountResult[0]?.count || 0;

      usersWithStats.push({
        ...user,
        stats: {
          gbairaisCount,
          interactionsCount,
          messagesCount
        }
      });
    }

    return usersWithStats;
  }

  async deleteUserCompletely(userId: number): Promise<boolean> {
    try {
      await db.transaction(async (tx) => {
        // Supprimer les notifications
        await tx.delete(notifications).where(eq(notifications.userId, userId));
        await tx.delete(notifications).where(eq(notifications.fromUserId, userId));

        // Supprimer les messages
        await tx.delete(messages).where(eq(messages.senderId, userId));

        // Supprimer les conversations où l'utilisateur est participant
        const userConversations = await tx
          .select({ id: conversations.id })
          .from(conversations)
          .where(sql`${userId} = ANY(${conversations.participants})`);

        for (const conv of userConversations) {
          await tx.delete(messages).where(eq(messages.conversationId, conv.id));
          await tx.delete(conversations).where(eq(conversations.id, conv.id));
        }

        // Supprimer les follows
        await tx.delete(follows).where(eq(follows.followerId, userId));
        await tx.delete(follows).where(eq(follows.followingId, userId));

        // Supprimer les interactions
        await tx.delete(interactions).where(eq(interactions.userId, userId));

        // Supprimer les gbairais
        await tx.delete(gbairais).where(eq(gbairais.userId, userId));

        // Supprimer l'utilisateur
        await tx.delete(users).where(eq(users.id, userId));
      });

      return true;
    } catch (error) {
      console.error('Erreur suppression complète utilisateur:', error);
      return false;
    }
  }

  async createAdminMessage(data: { recipientId: number; content: string; sentAt: Date }): Promise<any> {
    // Pour l'instant, on utilise une table simple pour les messages admin
    // En production, vous pourriez créer une table dédiée
    const adminMessage = {
      id: Date.now(), // Temporaire - utiliser un vrai ID en production
      recipientId: data.recipientId,
      content: data.content,
      sentAt: data.sentAt
    };

    console.log("Admin message created:", adminMessage);
    return adminMessage;
  }

  async getAdminMessages(): Promise<any[]> {
    // Récupérer les messages depuis les conversations où l'admin (ID 7) est participant
    const adminConversations = await db
      .select()
      .from(conversations)
      .where(sql`${conversations.participants} @> ${JSON.stringify([7])}`);

    const adminMessages: any[] = [];

    for (const conversation of adminConversations) {
      const messagesData = await db
        .select({
          id: messages.id,
          content: messages.content,
          createdAt: messages.createdAt,
          senderId: messages.senderId
        })
        .from(messages)
        .where(and(
          eq(messages.conversationId, conversation.id),
          eq(messages.senderId, 7) // Messages envoyés par l'admin
        ))
        .orderBy(desc(messages.createdAt));

      for (const message of messagesData) {
        const participants = conversation.participants as number[];
        const recipientId = participants.find(id => id !== 7);

        if (recipientId) {
          const recipient = await this.getUser(recipientId);
          adminMessages.push({
            id: message.id,
            content: message.content,
            recipientId,
            recipientUsername: recipient?.username || 'Utilisateur inconnu',
            sentAt: message.createdAt
          });
        }
      }
    }

    return adminMessages.sort((a, b) => new Date(b.sentAt).getTime() - new Date(a.sentAt).getTime());
  }

  async createReport(insertReport: InsertReport): Promise<Report> {
    // Vérifier si ce signalement existe déjà
    const [existingReport] = await db
      .select()
      .from(reports)
      .where(and(
        eq(reports.userId, insertReport.userId),
        eq(reports.type, insertReport.type),
        eq(reports.targetId, insertReport.targetId)
      ));

    if (existingReport) {
      throw new Error('Vous avez déjà signalé ce contenu');
    }

    const [report] = await db
      .insert(reports)
      .values(insertReport)
      .returning();

    // Enrichir avec les informations utilisateur
    const enrichedReport = await this.getReportById(report.id);
    return enrichedReport || report;
  }

  async getReports(): Promise<Report[]> {
    const reportsData = await db
      .select({
        id: reports.id,
        userId: reports.userId,
        type: reports.type,
        targetId: reports.targetId,
        reason: reports.reason,
        status: reports.status,
        adminNote: reports.adminNote,
        createdAt: reports.createdAt,
        processedAt: reports.processedAt,
        user: {
          id: users.id,
          username: users.username,
        },
      })
      .from(reports)
      .leftJoin(users, eq(reports.userId, users.id))
      .where(eq(reports.status, 'pending')) // Seulement les signalements en attente
      .orderBy(desc(reports.createdAt));

    const enrichedReports: Report[] = [];

    for (const report of reportsData) {
      // Vérifier si le gbairai existe encore (pas supprimé)
      if (report.type === 'gbairai') {
        const [gbairaiExists] = await db
          .select({ id: gbairais.id, status: gbairais.status })
          .from(gbairais)
          .where(eq(gbairais.id, report.targetId));

        // Si le gbairai n'existe plus ou est supprimé, marquer le signalement comme traité
        if (!gbairaiExists || gbairaiExists.status === 'deleted') {
          await db
            .update(reports)
            .set({ 
              status: 'resolved',
              adminNote: 'Contenu supprimé automatiquement',
              processedAt: new Date()
            })
            .where(eq(reports.id, report.id));
          continue; // Ne pas inclure ce signalement dans la liste
        }

        const [gbairaiData] = await db
          .select({
            id: gbairais.id,
            content: gbairais.content,
            status: gbairais.status,
            user: {
              id: users.id,
              username: users.username,
            }
          })
          .from(gbairais)
          .leftJoin(users, eq(gbairais.userId, users.id))
          .where(and(
            eq(gbairais.id, report.targetId),
            eq(gbairais.status, 'active')
          ));

        if (gbairaiData) {
          enrichedReports.push({
            ...report,
            user: report.user ? { username: report.user.username } : undefined,
            gbairai: {
              content: gbairaiData.content,
              user: gbairaiData.user ? { username: gbairaiData.user.username } : undefined
            }
          });
        }
      } else {
        enrichedReports.push({
          ...report,
          user: report.user ? { username: report.user.username } : undefined,
        });
      }
    }

    return enrichedReports;
  }

  private async getReportById(reportId: number): Promise<Report | null> {
    const [reportData] = await db
      .select({
        id: reports.id,
        userId: reports.userId,
        type: reports.type,
        targetId: reports.targetId,
        reason: reports.reason,
        status: reports.status,
        adminNote: reports.adminNote,
        createdAt: reports.createdAt,
        processedAt: reports.processedAt,
        user: {
          id: users.id,
          username: users.username,
        },
      })
      .from(reports)
      .leftJoin(users, eq(reports.userId, users.id))
      .where(eq(reports.id, reportId));

    if (!reportData) return null;

    let enrichedReport: any = {
      ...reportData,
      user: reportData.user ? { username: reportData.user.username } : undefined,
    };

    // Si c'est un signalement de gbairai, enrichir avec le contenu
    if (reportData.type === 'gbairai') {
      const [gbairaiData] = await db
        .select({
          id: gbairais.id,
          content: gbairais.content,
          user: {
            id: users.id,
            username: users.username,
          }
        })
        .from(gbairais)
        .leftJoin(users, eq(gbairais.userId, users.id))
        .where(eq(gbairais.id, reportData.targetId));

      if (gbairaiData) {
        enrichedReport.gbairai = {
          content: gbairaiData.content,
          user: gbairaiData.user ? { username: gbairaiData.user.username } : undefined
        };
      }
    }

    return enrichedReport;
  }

  async updateReportStatus(reportId: number, status: string, adminNote?: string): Promise<Report | null> {
    const updateData: any = { 
      status,
      processedAt: new Date()
    };

    if (adminNote) {
      updateData.adminNote = adminNote;
    }

    const [updatedReport] = await db
      .update(reports)
      .set(updateData)
      .where(eq(reports.id, reportId))
      .returning();

    if (!updatedReport) return null;

    return await this.getReportById(reportId);
  }
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private gbairais: Map<number, Gbairai>;
  private interactions: Map<number, Interaction>;
  private conversations: Map<number, Conversation>;
  private messages: Map<number, Message>;
  private currentUserId: number;
  private currentGbairaiId: number;
  private currentInteractionId: number;
  private currentConversationId: number;
  private currentMessageId: number;
  private currentAdminMessageId = 1;
  private adminMessages = new Map<number, AdminMessage>();
  private currentReportId = 1;
  private reports = new Map<number, Report>();
  sessionStore: any;

  constructor() {
    this.users = new Map();
    this.gbairais = new Map();
    this.interactions = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.currentUserId = 1;
    this.currentGbairaiId = 1;
    this.currentInteractionId = 1;
    this.currentConversationId = 1;
    this.currentMessageId = 1;

    this.sessionStore = new MemoryStore({
      checkPeriod: 86400000,
    });
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id, 
      role: 'user',
      createdAt: new Date(),
      isActive: true,
      profile: null
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updateUser: UpdateUser): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) return undefined;

    const updatedUser = { ...existingUser, ...updateUser };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async updateUserPassword(email: string, newPassword: string): Promise<boolean> {
    const user = Array.from(this.users.values()).find(u => u.email === email);
    if (!user) return false;

    user.password = newPassword;
    this.users.set(user.id, user);
    return true;
  }

  async createGbairai(insertGbairai: InsertGbairai): Promise<Gbairai> {
    const id = this.currentGbairaiId++;
    const gbairai: Gbairai = {
      ...insertGbairai,
      id,
      createdAt: new Date(),
      status: 'active',
      userId: insertGbairai.userId ?? null,
      location: insertGbairai.location ?? null,
      isAnonymous: insertGbairai.isAnonymous ?? true,
      metadata: insertGbairai.metadata ?? null
    };
    this.gbairais.set(id, gbairai);
    return gbairai;
  }

  async getGbairais(limit = 20, offset = 0): Promise<GbairaiWithInteractions[]> {
    const allGbairais = Array.from(this.gbairais.values())
      .filter(g => g.status === 'active')
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(offset, offset + limit);

    const result: GbairaiWithInteractions[] = [];

    for (const gbairai of allGbairais) {
      const interactionsData = await this.getInteractionsByGbairai(gbairai.id);
      const user = gbairai.userId ? await this.getUser(gbairai.userId) : undefined;

      const likesCount = interactionsData.filter(i => i.type === 'like').length;
      const commentsCount = interactionsData.filter(i => i.type === 'comment').length;
      const sharesCount = interactionsData.filter(i => i.type === 'share').length;

      result.push({
        ...gbairai,
        interactions: interactionsData,
        user,
        likesCount,
        commentsCount,
        sharesCount
      });
    }

    return result;
  }

  async getGbairaiById(id: number): Promise<GbairaiWithInteractions | undefined> {
    const gbairai = this.gbairais.get(id);
    if (!gbairai || gbairai.status !== 'active') return undefined;

    const interactionsData = await this.getInteractionsByGbairai(gbairai.id);
    const user = gbairai.userId ? await this.getUser(gbairai.userId) : undefined;

    const likesCount = interactionsData.filter(i => i.type === 'like').length;
    const commentsCount = interactionsData.filter(i => i.type === 'comment').length;
    const sharesCount = interactionsData.filter(i => i.type === 'share').length;

    return {
      ...gbairai,
      interactions: interactionsData,
      user,
      likesCount,
      commentsCount,
      sharesCount
    };
  }

  async getGbairaisByEmotion(emotion: string, limit = 20): Promise<GbairaiWithInteractions[]> {
    const filteredGbairais = Array.from(this.gbairais.values())
      .filter(g => g.status === 'active' && g.emotion === emotion)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);

    const result: GbairaiWithInteractions[] = [];

    for (const gbairai of filteredGbairais) {
      const interactionsData = await this.getInteractionsByGbairai(gbairai.id);
      const user = gbairai.userId ? await this.getUser(gbairai.userId) : undefined;

      const likesCount = interactionsData.filter(i => i.type === 'like').length;
      const commentsCount = interactionsData.filter(i => i.type === 'comment').length;
      const sharesCount = interactionsData.filter(i => i.type === 'share').length;

      result.push({
        ...gbairai,
        interactions: interactionsData,
        user,
        likesCount,
        commentsCount,
        sharesCount
      });
    }

    return result;
  }

  async getGbairaisByLocation(location: LocationData, radius: number, limit = 20): Promise<GbairaiWithInteractions[]> {
    const filteredGbairais = Array.from(this.gbairais.values())
      .filter(g => {
        if (g.status !== 'active' || !g.location) return false;
        const gbairaiLocation = g.location as any;
        if (!gbairaiLocation.latitude || !gbairaiLocation.longitude) return false;

        const distance = this.calculateDistance(
          location.latitude,
          location.longitude,
          gbairaiLocation.latitude,
          gbairaiLocation.longitude
        );
        return distance <= radius;
      })
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);

    const result: GbairaiWithInteractions[] = [];

    for (const gbairai of filteredGbairais) {
      const interactionsData = await this.getInteractionsByGbairai(gbairai.id);
      const user = gbairai.userId ? await this.getUser(gbairai.userId) : undefined;

      const likesCount = interactionsData.filter(i => i.type === 'like').length;
      const commentsCount = interactionsData.filter(i => i.type === 'comment').length;
      const sharesCount = interactionsData.filter(i => i.type === 'share').length;

      result.push({
        ...gbairai,
        interactions: interactionsData,
        user,
        likesCount,
        commentsCount,
        sharesCount
      });
    }

    return result;
  }

  async getUserGbairais(userId: number, limit = 20): Promise<GbairaiWithInteractions[]> {
    const userGbairais = Array.from(this.gbairais.values())
      .filter(g => g.status === 'active' && g.userId === userId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0))
      .slice(0, limit);

    const result: GbairaiWithInteractions[] = [];

    for (const gbairai of userGbairais) {
      const interactionsData = await this.getInteractionsByGbairai(gbairai.id);
      const user = await this.getUser(gbairai.userId!);

      const likesCount = interactionsData.filter(i => i.type === 'like').length;
      const commentsCount = interactionsData.filter(i => i.type === 'comment').length;
      const sharesCount = interactionsData.filter(i => i.type === 'share').length;

      result.push({
        ...gbairai,
        interactions: interactionsData,
        user,
        likesCount,
        commentsCount,
        sharesCount
      });
    }

    return result;
  }

  async deleteGbairai(id: number, userId: number): Promise<boolean> {
    const gbairai = this.gbairais.get(id);
    if (!gbairai || gbairai.userId !== userId) return false;

    gbairai.status = 'deleted';
    this.gbairais.set(id, gbairai);
    return true;
  }

  async createInteraction(insertInteraction: InsertInteraction): Promise<Interaction> {
    const id = this.currentInteractionId++;
    const interaction: Interaction = {
      ...insertInteraction,
      id,
      createdAt: new Date(),
      userId: insertInteraction.userId ?? null,
      gbairaiId: insertInteraction.gbairaiId ?? null,
      content: insertInteraction.content ?? null
    };
    this.interactions.set(id, interaction);
    return interaction;
  }

  async getInteractionsByGbairai(gbairaiId: number): Promise<Interaction[]> {
    return Array.from(this.interactions.values())
      .filter(i => i.gbairaiId === gbairaiId)
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  async getUserInteraction(userId: number, gbairaiId: number, type: string): Promise<Interaction | undefined> {
    return Array.from(this.interactions.values())
      .filter(i => i.userId === userId && i.gbairaiId === gbairaiId && i.type === type)[0];
  }

  async deleteInteraction(id: number, userId: number): Promise<boolean> {
    const interaction = this.interactions.get(id);
    if (!interaction || interaction.userId !== userId) return false;

    this.interactions.delete(id);
    return true;
  }

  async getRepliesByCommentId(commentId: number): Promise<Interaction[]> {
    return Array.from(this.interactions.values())
      .filter(i => i.parentCommentId === commentId && i.type === 'comment')
      .sort((a, b) => (b.createdAt?.getTime() || 0) - (a.createdAt?.getTime() || 0));
  }

  // Méthodes de messagerie pour MemStorage
  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values())
      .filter(u => u.isActive)
      .sort((a, b) => a.username.localeCompare(b.username));
  }

  async createConversation(conversation: InsertConversation): Promise<Conversation> {
    const id = this.currentConversationId++;
    const newConversation: Conversation = {
      ...conversation,
      id,
      createdAt: new Date(),
      lastMessageAt: new Date(),
      participants: conversation.participants || [],
      isEncrypted: conversation.isEncrypted || false,
    };
    this.conversations.set(id, newConversation);
    return newConversation;
  }

  async getConversationsByUserId(userId: number): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter(c => (c.participants as number[]).includes(userId))
      .sort((a, b) => (b.lastMessageAt?.getTime() || 0) - (a.lastMessageAt?.getTime() || 0));
  }

  async getConversationById(id: number): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getConversationByParticipants(participants: number[]): Promise<Conversation | undefined> {
    const sortedParticipants = participants.sort();
    return Array.from(this.conversations.values())
      .filter(c => {
        const conversationParticipants = (c.participants as number[]).sort();
        return JSON.stringify(conversationParticipants) === JSON.stringify(sortedParticipants);
      })[0];
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const id = this.currentMessageId++;
    const newMessage: Message = {
...message,
      id,
      createdAt: new Date(),
      senderId: message.senderId || 0,
      conversationId: message.conversationId || 0,
      content: message.content || '',
      type: message.type || 'text',
      replyToId: message.replyToId || null,
    };
    this.messages.set(id, newMessage);

    // Mettre à jour la dernière activité de la conversation
    if (message.conversationId) {
      const conversation = this.conversations.get(message.conversationId);
      if (conversation) {
        conversation.lastMessageAt = new Date();
        this.conversations.set(message.conversationId, conversation);

        // NOUVEAU: Restaurer automatiquement la conversation pour tous les participants qui l'avaient supprimée
        const participants = conversation.participants as number[];

        // Pour chaque participant, restaurer la conversation s'il l'avait supprimée
        for (const participantId of participants) {
          const isDeleted = await this.isConversationDeletedForUser(message.conversationId, participantId);
          if (isDeleted) {
            console.log(`Restauration automatique de la conversation ${message.conversationId} pour l'utilisateur ${participantId}`);
            await this.restoreConversationForUser(message.conversationId, participantId);
          }
        }
      }
    }

    return newMessage;
  }

  async getMessagesByConversationId(conversationId: number): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(m => m.conversationId === conversationId)
      .sort((a, b) => (a.createdAt?.getTime() || 0) - (b.createdAt?.getTime() || 0));
  }

  async getUnreadMessagesCount(conversationId: number, userId: number): Promise<number> {
    // Implémentation simplifiée pour MemStorage
    return Array.from(this.messages.values())
      .filter(m => m.conversationId === conversationId && m.senderId !== userId).length;
  }

  async markMessagesAsRead(conversationId: number, userId: number): Promise<void> {
      // Implémentation simplifiée pour MemStorage
      Array.from(this.messages.values())
          .filter(m => m.conversationId === conversationId && m.senderId !== userId)
          .forEach(m => {
            // @ts-ignore
              m.read = true;
          });
  }

  // Méthodes pour les profils et follows (implémentation simplifiée pour MemStorage)
  async getUserProfile(userId: number): Promise<UserWithStats | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;

    const stats = await this.getUserStats(userId);
    return {
      ...user,
      ...stats,
    };
  }

  async updateUserProfile(userId: number, profile: UserProfile): Promise<User | undefined> {
    const user = this.users.get(userId);
    if (!user) return undefined;

    const updatedUser = { ...user, profile };
    this.users.set(userId, updatedUser);
    return updatedUser;
  }

  async followUser(followerId: number, followingId: number): Promise<Follow> {
    // Implémentation simplifiée pour MemStorage
    const follow: Follow = {
      id: Date.now(),
      followerId,
      followingId,
      createdAt: new Date(),
    };
    return follow;
  }

  async unfollowUser(followerId: number, followingId: number): Promise<boolean> {
    // Implémentation simplifiée pour MemStorage
    return true;
  }

  async isFollowing(followerId: number, followingId: number): Promise<boolean> {
    // Implémentation simplifiée pour MemStorage
    return false;
  }

  async getUserFollowers(userId: number): Promise<User[]> {
    // Implémentation simplifiée pour MemStorage
    return [];
  }

  async getUserFollowing(userId: number): Promise<User[]> {
    // Implémentation simplifiée pour MemStorage
    return [];
  }

  async getUserStats(userId: number): Promise<{ followersCount: number; followingCount: number; gbairaisCount: number; }> {
    const gbairaisCount = Array.from(this.gbairais.values())
      .filter(g => g.userId === userId && g.status === 'active').length;

    return {
      followersCount: 0,
      followingCount: 0,
      gbairaisCount,
    };
  }

  async searchUsers(query: string, currentUserId?: number): Promise<UserWithStats[]> {
    const users = Array.from(this.users.values())
      .filter(user => 
        user.isActive && 
        user.username.toLowerCase().includes(query.toLowerCase())
      )
      .slice(0, 20);

    const usersWithStats: UserWithStats[] = [];
    for (const user of users) {
      const stats = await this.getUserStats(user.id);
      usersWithStats.push({
        ...user,
        ...stats,
        isFollowing: false,
      });
    }

    return usersWithStats;
  }

  // Méthodes pour les notifications (implémentation simplifiée pour MemStorage)
  async createNotification(userId: number, type: string, message: string, fromUserId?: number, gbairaiId?: number): Promise<void> {
    // Implémentation simplifiée pour MemStorage - ne stocke pas réellement
    console.log(`Notification pour utilisateur ${userId}: ${message}`);
  }

  async createNotificationForAllUsers(type: string, message: string, fromUserId?: number, gbairaiId?: number, excludeUserId?: number): Promise<void> {
    // Implémentation simplifiée pour MemStorage - ne stocke pas réellement
    console.log(`Notification globale: ${message}`);
  }

  async getNotifications(userId: number, limit: number = 20): Promise<any[]> {
    // Implémentation simplifiée pour MemStorage - retourne un tableau vide
    return [];
  }

  async markNotificationAsRead(id: number): Promise<boolean> {
    // Implémentation simplifiée pour MemStorage
    return true;
  }

  // Nouveaux filtres (implémentation simplifiée pour MemStorage)
  async getGbairaisFromFollowing(userId: number, limit: number = 20, offset: number = 0): Promise<GbairaiWithInteractions[]> {
    // Implémentation simplifiée - retourne un tableau vide
    return [];
  }

  async getGbairaisByRegion(region: string, limit: number = 20, offset: number = 0): Promise<GbairaiWithInteractions[]> {
    // Implémentation simplifiée - retourne un tableau vide
    return [];
  }

  private calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  async updateUserLastLogin(userId: number, location?: any): Promise<void> {
    // Implémentation simplifiée pour MemStorage
    console.log(`Mise à jour de la dernière connexion de l'utilisateur ${userId} avec la location:`, location);
  }

  async getAllUsersWithStats(): Promise<any[]> {
    return [];
  }
  async deleteUserCompletely(userId: number): Promise<boolean> {
    return true;
  }
  async createAdminMessage(data: { recipientId: number; content: string; sentAt: Date; }): Promise<any> {
    const id = this.currentAdminMessageId++;
    const recipient = this.users.get(data.recipientId);

    const adminMessage: AdminMessage = {
      id,
      recipientId: data.recipientId,
      recipientUsername: recipient?.username || 'Utilisateur inconnu',
      content: data.content,
      sentAt: data.sentAt
    };

    this.adminMessages.set(id, adminMessage);
    return adminMessage;
  }

  async getAdminMessages(): Promise<any[]> {
    return Array.from(this.adminMessages.values())
      .sort((a, b) => b.sentAt.getTime() - a.sentAt.getTime());
  }

  async createReport(insertReport: InsertReport): Promise<Report> {
    // Vérifier si ce signalement existe déjà
    const existingReport = Array.from(this.reports.values()).find(r => 
      r.userId === insertReport.userId && 
      r.type === insertReport.type && 
      r.targetId === insertReport.targetId
    );

    if (existingReport) {
      throw new Error('Vous avez déjà signalé ce contenu');
    }

    const id = this.currentReportId++;
    const report: Report = {
      ...insertReport,
      id,
      createdAt: new Date()
    };

    // Enrichir avec les informations utilisateur
    const user = this.users.get(insertReport.userId);
    if (user) {
      report.user = { username: user.username };
    }

    // Si c'est un signalement de gbairai, enrichir avec le contenu
    if (insertReport.type === 'gbairai') {
      const gbairai = this.gbairais.get(insertReport.targetId);
      if (gbairai) {
        const gbairaiUser = this.users.get(gbairai.userId || 0);
        report.gbairai = {
          content: gbairai.content,
          user: gbairaiUser ? { username: gbairaiUser.username } : undefined
        };
      }
    }

    this.reports.set(id, report);
    return report;
  }

  async getReports(): Promise<Report[]> {
    return Array.from(this.reports.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async updateReportStatus(reportId: number, status: string, adminNote?: string): Promise<Report | null> {
    const report = this.reports.get(reportId);
    if (!report) return null;

    report.status = status;
    if (adminNote) {
      report.adminNote = adminNote;
    }

    this.reports.set(reportId, report);
    return report;
  }

    // Blocages d'utilisateurs
    async blockUser(blockerId: number, blockedId: number) {
      // Implémentation simplifiée pour MemStorage
      console.log(`Utilisateur ${blockerId} bloque utilisateur ${blockedId}`);
  }

  async unblockUser(blockerId: number, blockedId: number): Promise<boolean> {
      // Implémentation simplifiée pour MemStorage
      console.log(`Utilisateur ${blockerId} débloque utilisateur ${blockedId}`);
      return true;
  }

  async isBlocked(userId1: number, userId2: number): Promise<boolean> {
      // Implémentation simplifiée pour MemStorage
      return false;
  }

  async getBlockedUsers(userId: number): Promise<any[]> {
      // Implémentation simplifiée pour MemStorage
      return [];
  }

  // Suppression de conversations
  async deleteConversationForUser(conversationId: number, userId: number) {
      // Implémentation simplifiée pour MemStorage
      console.log(`Utilisateur ${userId} supprime la conversation ${conversationId}`);
  }

  async isConversationDeletedForUser(conversationId: number, userId: number): Promise<boolean> {
      // Implémentation simplifiée pour MemStorage
      return false;
  }

  async restoreConversationForUser(conversationId: number, userId: number): Promise<boolean> {
      // Implémentation simplifiée pour MemStorage
      console.log(`Utilisateur ${userId} restaure la conversation ${conversationId}`);
      return true;
  }

  // Suppression de messages
  async deleteMessageForUser(messageId: number, userId: number): Promise<boolean> {
      // Implémentation simplifiée pour MemStorage
      console.log(`Utilisateur ${userId} supprime le message ${messageId} pour lui-même`);
      return true;
  }

  async deleteMessageForEveryone(messageId: number, userId: number): Promise<boolean> {
      // Implémentation simplifiée pour MemStorage
      const message = this.messages.get(messageId);
      if (!message || message.senderId !== userId) return false;

      message.content = 'Ce message a été supprimé';
      this.messages.set(messageId, message);
      console.log(`Utilisateur ${userId} supprime le message ${messageId} pour tout le monde`);
      return true;
  }

  async isMessageDeletedForUser(messageId: number, userId: number): Promise<boolean> {
      // Implémentation simplifiée pour MemStorage
      return false;
  }

  // Notifications
  async createNotification(userId: number, type: string, message: string, fromUserId?: number, gbairaiId?: number, conversationId?: number): Promise<void> {
      // Implémentation simplifiée pour MemStorage
      console.log(`Notification pour utilisateur ${userId}: ${message}`);
  }
}

export const storage = process.env.DATABASE_URL ? new DatabaseStorage() : new MemStorage();