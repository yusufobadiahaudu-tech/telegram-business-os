import { db } from "@workspace/db";
import {
  activityTable,
  botEventsTable,
  membersTable,
  paymentsTable,
  workspaceSettingsTable,
  workspacesTable,
} from "@workspace/db";
import { eq } from "drizzle-orm";

export async function seedWorkspace(): Promise<void> {
  const [existing] = await db.select({ id: workspacesTable.id }).from(workspacesTable).limit(1);
  if (existing) return;

  const [workspace] = await db
    .insert(workspacesTable)
    .values({
      name: "Creator Circle",
      plan: "Growth",
      whopCompanyId: "biz_creator_circle",
      botConnected: true,
      webhookConnected: true,
    })
    .returning();

  if (!workspace) throw new Error("Failed to seed workspace");

  const now = Date.now();
  const day = 86_400_000;
  const [maya, jordan, lina, sam] = await db
    .insert(membersTable)
    .values([
      { workspaceId: workspace.id, telegramId: 17422109, username: "@maya.studio", tier: "Pro", status: "active", joinDate: new Date(now - 18 * day), expiryDate: new Date(now + 12 * day), amount: "49", currency: "USD" },
      { workspaceId: workspace.id, telegramId: 28476112, username: "@jordanwrites", tier: "Pro", status: "active", joinDate: new Date(now - 9 * day), expiryDate: new Date(now + 21 * day), amount: "49", currency: "USD" },
      { workspaceId: workspace.id, telegramId: 38290551, username: "@lina.codes", tier: "Starter", status: "grace", joinDate: new Date(now - 35 * day), expiryDate: new Date(now - 1 * day), amount: "19", currency: "USD" },
      { workspaceId: workspace.id, telegramId: 49112008, username: "@sam.builds", tier: "Pro", status: "active", joinDate: new Date(now - 4 * day), expiryDate: new Date(now + 26 * day), amount: "49", currency: "USD" },
    ])
    .returning();

  if (!maya || !jordan || !lina || !sam) throw new Error("Failed to seed members");

  await db.insert(paymentsTable).values([
    { workspaceId: workspace.id, memberId: maya.id, memberUsername: maya.username, amount: "49", fee: "2.12", currency: "USD", status: "confirmed", createdAt: new Date(now - 1 * day) },
    { workspaceId: workspace.id, memberId: jordan.id, memberUsername: jordan.username, amount: "49", fee: "2.12", currency: "USD", status: "confirmed", createdAt: new Date(now - 2 * day) },
    { workspaceId: workspace.id, memberId: sam.id, memberUsername: sam.username, amount: "49", fee: "2.12", currency: "USD", status: "confirmed", createdAt: new Date(now - 4 * day) },
    { workspaceId: workspace.id, memberId: lina.id, memberUsername: lina.username, amount: "19", fee: "1.04", currency: "USD", status: "refunded", createdAt: new Date(now - 8 * day) },
  ]);

  await db.insert(botEventsTable).values([
    { workspaceId: workspace.id, telegramId: maya.telegramId, memberUsername: maya.username, eventType: "invite", status: "completed", retryCount: 0, lastError: null, createdAt: new Date(now - 1 * day), updatedAt: new Date(now - 1 * day) },
    { workspaceId: workspace.id, telegramId: jordan.telegramId, memberUsername: jordan.username, eventType: "invite", status: "processing", retryCount: 0, lastError: null, createdAt: new Date(now - 2 * day), updatedAt: new Date(now - 20 * 60_000) },
    { workspaceId: workspace.id, telegramId: lina.telegramId, memberUsername: lina.username, eventType: "remove", status: "failed", retryCount: 5, lastError: "Telegram API returned 429: retry after 30 seconds", createdAt: new Date(now - 3 * day), updatedAt: new Date(now - 34 * 60_000) },
    { workspaceId: workspace.id, telegramId: sam.telegramId, memberUsername: sam.username, eventType: "invite", status: "pending", retryCount: 0, lastError: null, createdAt: new Date(now - 8 * 60_000), updatedAt: new Date(now - 8 * 60_000) },
  ]);

  await db.insert(activityTable).values([
    { workspaceId: workspace.id, type: "payment", title: "Payment received", description: "@maya.studio renewed Pro access", timestamp: new Date(now - 1 * day), status: "success" },
    { workspaceId: workspace.id, type: "bot", title: "Invite link delivered", description: "Telegram invite sent to @jordanwrites", timestamp: new Date(now - 2 * day), status: "success" },
    { workspaceId: workspace.id, type: "warning", title: "Bot event failed", description: "Remove access for @lina.codes needs attention", timestamp: new Date(now - 34 * 60_000), status: "warning" },
    { workspaceId: workspace.id, type: "member", title: "New member joined", description: "@sam.builds joined through Whop", timestamp: new Date(now - 4 * day), status: "success" },
  ]);

  await db.insert(workspaceSettingsTable).values({
    workspaceId: workspace.id,
    defaultTier: "Pro",
    notifications: { failedEvents: true, dailySummary: true },
  });

  await db.update(workspacesTable).set({ updatedAt: new Date() }).where(eq(workspacesTable.id, workspace.id));
}