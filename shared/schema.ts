import { pgTable, text, serial, timestamp, boolean, jsonb, integer, real, varchar } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("user"),
  createdAt: timestamp("created_at").defaultNow(),
  isActive: boolean("is_active").default(true),
  profile: jsonb("profile"),
});

export const gbairais = pgTable("gbairais", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  content: text("content").notNull(),
  emotion: text("emotion").notNull(),
  location: jsonb("location"),
  isAnonymous: boolean("is_anonymous").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  status: text("status").default("active"),
  metadata: jsonb("metadata"),
});

export const interactions = pgTable("interactions", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  gbairaiId: integer("gbairai_id").references(() => gbairais.id),
  type: text("type").notNull(), // like, comment, share
  content: text("content"),
  parentCommentId: integer("parent_comment_id").references(() => interactions.id), // Pour les réponses
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversations = pgTable("conversations", {
  id: serial("id").primaryKey(),
  participants: jsonb("participants").notNull(),
  isEncrypted: boolean("is_encrypted").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  lastMessageAt: timestamp("last_message_at"),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id),
  senderId: integer("sender_id").references(() => users.id),
  content: text("content").notNull(),
  type: text("type").default("text"), // text, image, audio, file
  deletedForEveryone: boolean("deleted_for_everyone").default(false),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  replyToId: integer("reply_to_id").references(() => messages.id),
});

export const messageDeletions = pgTable("message_deletions", {
  id: serial("id").primaryKey(),
  messageId: integer("message_id").references(() => messages.id).notNull(),
  userId: integer("user_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const follows = pgTable("follows", {
  id: serial("id").primaryKey(),
  followerId: integer("follower_id").references(() => users.id).notNull(),
  followingId: integer("following_id").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  type: text("type").notNull(), // 'like', 'comment', 'follow', 'message'
  message: text("message").notNull(),
  fromUserId: integer("from_user_id").references(() => users.id),
  gbairaiId: integer("gbairai_id").references(() => gbairais.id),
  conversationId: integer("conversation_id").references(() => conversations.id),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  type: varchar("type", { length: 50 }).notNull(), // 'gbairai', 'user', etc.
  targetId: integer("target_id").notNull(), // ID de l'élément signalé
  reason: text("reason").notNull(),
  status: varchar("status", { length: 20 }).default("pending").notNull(), // 'pending', 'approved', 'rejected'
  adminNote: text("admin_note").default(null),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  processedAt: timestamp("processed_at"),
});

export const blocks = pgTable("blocks", {
  id: serial("id").primaryKey(),
  blockerId: integer("blocker_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  blockedId: integer("blocked_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const conversationDeletions = pgTable("conversation_deletions", {
  id: serial("id").primaryKey(),
  conversationId: integer("conversation_id").references(() => conversations.id, { onDelete: "cascade" }).notNull(),
  userId: integer("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  deletedAt: timestamp("deleted_at").defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }): Record<string, any> => ({
  gbairais: many(gbairais),
  interactions: many(interactions),
  messages: many(messages),
  notifications: many(notifications),
  following: many(follows, {
    relationName: 'following',
  }),
  followers: many(follows, {
    relationName: 'followers',
  }),
}));

export const gbairaisRelations = relations(gbairais, ({ one, many }): Record<string, any> => ({
  user: one(users, {
    fields: [gbairais.userId],
    references: [users.id],
  }),
  interactions: many(interactions),
}));

export const interactionsRelations = relations(interactions, ({ one, many }): Record<string, any> => ({
  user: one(users, {
    fields: [interactions.userId],
    references: [users.id],
  }),
  gbairai: one(gbairais, {
    fields: [interactions.gbairaiId],
    references: [gbairais.id],
  }),
  parentComment: one(interactions, {
    fields: [interactions.parentCommentId],
    references: [interactions.id],
  }),
  replies: many(interactions),
}));

export const conversationsRelations = relations(conversations, ({ many }) => ({
  messages: many(messages),
}));

export const messagesRelations = relations(messages, ({ one }) => ({
  conversation: one(conversations, {
    fields: [messages.conversationId],
    references: [conversations.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
  }),
}));

export const followsRelations = relations(follows, ({ one }) => ({
  follower: one(users, {
    fields: [follows.followerId],
    references: [users.id],
    relationName: 'followers',
  }),
  following: one(users, {
    fields: [follows.followingId],
    references: [users.id],
    relationName: 'following',
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
  fromUser: one(users, {
    fields: [notifications.fromUserId],
    references: [users.id],
  }),
  gbairai: one(gbairais, {
    fields: [notifications.gbairaiId],
    references: [gbairais.id],
  }),
  conversation: one(conversations, {
    fields: [notifications.conversationId],
    references: [conversations.id],
  }),
}));

export const blocksRelations = relations(blocks, ({ one }) => ({
  blocker: one(users, {
    fields: [blocks.blockerId],
    references: [users.id],
  }),
  blocked: one(users, {
    fields: [blocks.blockedId],
    references: [users.id],
  }),
}));

export const conversationDeletionsRelations = relations(conversationDeletions, ({ one }) => ({
  conversation: one(conversations, {
    fields: [conversationDeletions.conversationId],
    references: [conversations.id],
  }),
  user: one(users, {
    fields: [conversationDeletions.userId],
    references: [users.id],
  }),
}));

// Schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
});

export const updateUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
}).partial();

export const userProfileSchema = z.object({
  bio: z.string().max(200).optional(),
  location: z.string().max(100).optional(),
  website: z.string().url().optional(),
  avatar: z.string().url().optional(),
});

export const insertFollowSchema = createInsertSchema(follows).omit({
  id: true,
  createdAt: true,
});

export const insertGbairaiSchema = createInsertSchema(gbairais).omit({
  id: true,
  createdAt: true,
  status: true,
});

export const insertInteractionSchema = createInsertSchema(interactions).omit({
  id: true,
  createdAt: true,
});

export const insertConversationSchema = createInsertSchema(conversations).omit({
  id: true,
  createdAt: true,
  lastMessageAt: true,
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});

export const insertBlockSchema = createInsertSchema(blocks).omit({
  id: true,
  createdAt: true,
});

export const insertConversationDeletionSchema = createInsertSchema(conversationDeletions).omit({
  id: true,
  deletedAt: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type Gbairai = typeof gbairais.$inferSelect;
export type InsertGbairai = z.infer<typeof insertGbairaiSchema>;
export type Interaction = typeof interactions.$inferSelect;
export type InsertInteraction = z.infer<typeof insertInteractionSchema>;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Follow = typeof follows.$inferSelect;
export type InsertFollow = z.infer<typeof insertFollowSchema>;
export type Notification = typeof notifications.$inferSelect;
export type Block = typeof blocks.$inferSelect;
export type InsertBlock = z.infer<typeof insertBlockSchema>;
export type ConversationDeletion = typeof conversationDeletions.$inferSelect;
export type InsertConversationDeletion = z.infer<typeof insertConversationDeletionSchema>;

// Extended types for UI
export type GbairaiWithInteractions = Gbairai & {
  interactions: Interaction[];
  user?: User;
  likesCount: number;
  commentsCount: number;
  sharesCount: number;
};

export type UserWithStats = User & {
  followersCount: number;
  followingCount: number;
  gbairaisCount: number;
  isFollowing?: boolean;
};

export type LocationData = {
  latitude: number;
  longitude: number;
  city: string;
  region: string;
  country: string;
};

export type EmotionSuggestion = {
  emotion: string;
  confidence: number;
  reasoning: string;
};

export type EmotionAnalysisResult = {
  emotion: string;
  confidence: number;
  localTerms: string[];
  suggestions: EmotionSuggestion[];
};