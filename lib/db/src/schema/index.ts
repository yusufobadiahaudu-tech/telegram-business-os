import {
  boolean,
  jsonb,
  numeric,
  pgTable,
  text,
  timestamp,
  uuid,
  bigint,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const workspacesTable = pgTable("workspaces", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  plan: text("plan").notNull().default("Growth"),
  whopCompanyId: text("whop_company_id").notNull().default("biz_demo_01"),
  botConnected: boolean("bot_connected").notNull().default(true),
  webhookConnected: boolean("webhook_connected").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const membersTable = pgTable("members", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
  telegramId: bigint("telegram_id", { mode: "number" }).notNull(),
  username: text("username").notNull(),
  tier: text("tier").notNull(),
  status: text("status").notNull().default("active"),
  joinDate: timestamp("join_date", { withTimezone: true }).notNull().defaultNow(),
  expiryDate: timestamp("expiry_date", { withTimezone: true }).notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
});

export const paymentsTable = pgTable("payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
  memberId: uuid("member_id").notNull().references(() => membersTable.id, { onDelete: "cascade" }),
  memberUsername: text("member_username").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  fee: numeric("fee", { precision: 10, scale: 2 }).notNull().default("0"),
  currency: text("currency").notNull().default("USD"),
  status: text("status").notNull().default("confirmed"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const botEventsTable = pgTable("bot_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
  telegramId: bigint("telegram_id", { mode: "number" }).notNull(),
  memberUsername: text("member_username").notNull(),
  eventType: text("event_type").notNull(),
  status: text("status").notNull().default("pending"),
  retryCount: bigint("retry_count", { mode: "number" }).notNull().default(0),
  lastError: text("last_error"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activityTable = pgTable("activity", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().defaultNow(),
  status: text("status").notNull(),
});

export const workspaceSettingsTable = pgTable("workspace_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }).unique(),
  defaultTier: text("default_tier").notNull().default("Pro"),
  notifications: jsonb("notifications").$type<{ failedEvents: boolean; dailySummary: boolean }>().notNull().default({
    failedEvents: true,
    dailySummary: true,
  }),
});

export const outboxEventsTable = pgTable("outbox_events", {
  id: uuid("id").defaultRandom().primaryKey(),
  workspaceId: uuid("workspace_id").notNull().references(() => workspacesTable.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
  idempotencyKey: text("idempotency_key").notNull().unique(),
  processed: boolean("processed").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const insertWorkspaceSchema = createInsertSchema(workspacesTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertMemberSchema = createInsertSchema(membersTable).omit({ id: true });
export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({ id: true, createdAt: true });
export const insertBotEventSchema = createInsertSchema(botEventsTable).omit({ id: true, createdAt: true, updatedAt: true });
export const insertActivitySchema = createInsertSchema(activityTable).omit({ id: true, timestamp: true });
export const insertWorkspaceSettingsSchema = createInsertSchema(workspaceSettingsTable).omit({ id: true });

export type Workspace = z.infer<typeof insertWorkspaceSchema>;
export type Member = z.infer<typeof insertMemberSchema>;
export type Payment = z.infer<typeof insertPaymentSchema>;
export type WorkspaceRow = typeof workspacesTable.$inferSelect;
export type MemberRow = typeof membersTable.$inferSelect;
export type PaymentRow = typeof paymentsTable.$inferSelect;
export type BotEventRow = typeof botEventsTable.$inferSelect;