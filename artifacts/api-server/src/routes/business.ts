import { and, desc, eq, ilike } from "drizzle-orm";
import { Router, type IRouter } from "express";
import {
  GetActivityResponse,
  GetBotEventsQueryParams,
  GetBotEventsResponse,
  GetDashboardResponse,
  GetMembersQueryParams,
  GetMembersResponse,
  GetPaymentsQueryParams,
  GetPaymentsResponse,
  GetSettingsResponse,
  RetryBotEventParams,
  RetryBotEventResponse,
  UpdateMemberBody,
  UpdateMemberParams,
  UpdateMemberResponse,
  UpdateSettingsBody,
  UpdateSettingsResponse,
} from "@workspace/api-zod";
import { db } from "@workspace/db";
import {
  activityTable,
  botEventsTable,
  membersTable,
  paymentsTable,
  workspaceSettingsTable,
  workspacesTable,
} from "@workspace/db";
import { getWorkspace, getWorkspaceSettings } from "../lib/workspace";

const router: IRouter = Router();
const asNumber = (value: string | number | null | undefined) => Number(value ?? 0);

function mapMember(member: typeof membersTable.$inferSelect) {
  return {
    id: member.id,
    telegramId: member.telegramId,
    username: member.username,
    tier: member.tier,
    status: member.status,
    joinDate: member.joinDate,
    expiryDate: member.expiryDate,
    amount: asNumber(member.amount),
    currency: member.currency,
  };
}

function mapPayment(payment: typeof paymentsTable.$inferSelect) {
  const amount = asNumber(payment.amount);
  const fee = asNumber(payment.fee);
  return {
    id: payment.id,
    memberId: payment.memberId,
    memberUsername: payment.memberUsername,
    amount,
    fee,
    net: amount - fee,
    currency: payment.currency,
    status: payment.status,
    createdAt: payment.createdAt,
  };
}

function mapBotEvent(event: typeof botEventsTable.$inferSelect) {
  return {
    id: event.id,
    telegramId: event.telegramId,
    memberUsername: event.memberUsername,
    eventType: event.eventType,
    status: event.status,
    retryCount: event.retryCount,
    lastError: event.lastError,
    createdAt: event.createdAt,
    updatedAt: event.updatedAt,
  };
}

router.get("/dashboard", async (_req, res): Promise<void> => {
  const workspace = await getWorkspace();
  const [members, payments, botEvents, activity] = await Promise.all([
    db.select().from(membersTable).where(eq(membersTable.workspaceId, workspace.id)),
    db.select().from(paymentsTable).where(eq(paymentsTable.workspaceId, workspace.id)).orderBy(desc(paymentsTable.createdAt)),
    db.select().from(botEventsTable).where(eq(botEventsTable.workspaceId, workspace.id)),
    db.select().from(activityTable).where(eq(activityTable.workspaceId, workspace.id)).orderBy(desc(activityTable.timestamp)).limit(1),
  ]);

  const activeMembers = members.filter((member) => member.status === "active").length;
  const monthlyRevenue = payments
    .filter((payment) => payment.status === "confirmed" && payment.createdAt.getTime() > Date.now() - 30 * 86_400_000)
    .reduce((total, payment) => total + asNumber(payment.amount), 0);
  const queue = {
    pending: botEvents.filter((event) => event.status === "pending").length,
    processing: botEvents.filter((event) => event.status === "processing").length,
    completed: botEvents.filter((event) => event.status === "completed").length,
    failed: botEvents.filter((event) => event.status === "failed").length,
  };
  const now = new Date();
  const revenue = Array.from({ length: 6 }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - 5 + index, 1);
    const label = date.toLocaleDateString("en-US", { month: "short" });
    const amount = payments
      .filter((payment) => payment.status === "confirmed" && payment.createdAt.getMonth() === date.getMonth() && payment.createdAt.getFullYear() === date.getFullYear())
      .reduce((total, payment) => total + asNumber(payment.amount), 0);
    return { label, amount };
  });

  const data = {
    workspace: { name: workspace.name, plan: workspace.plan, connected: workspace.botConnected && workspace.webhookConnected },
    metrics: { activeMembers, membersDelta: 8.4, monthlyRevenue, revenueDelta: 12.8, pendingEvents: queue.pending + queue.processing, failedEvents: queue.failed },
    revenue,
    queue,
    health: {
      status: queue.failed > 0 ? "attention" : "healthy",
      webhookLatency: 184,
      lastWebhook: activity[0]?.timestamp ?? new Date(),
      workerStatus: workspace.botConnected ? "online" : "offline",
    },
  };

  res.json(GetDashboardResponse.parse(data));
});

router.get("/activity", async (_req, res): Promise<void> => {
  const workspace = await getWorkspace();
  const rows = await db.select().from(activityTable).where(eq(activityTable.workspaceId, workspace.id)).orderBy(desc(activityTable.timestamp)).limit(20);
  res.json(GetActivityResponse.parse(rows));
});

router.get("/members", async (req, res): Promise<void> => {
  const parsed = GetMembersQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const workspace = await getWorkspace();
  const { search, status } = parsed.data;
  const conditions = [eq(membersTable.workspaceId, workspace.id)];
  if (search) conditions.push(ilike(membersTable.username, `%${search}%`));
  if (status && status !== "all") conditions.push(eq(membersTable.status, status));
  const rows = await db.select().from(membersTable).where(and(...conditions)).orderBy(desc(membersTable.joinDate));
  res.json(GetMembersResponse.parse(rows.map(mapMember)));
});

router.patch("/members/:id", async (req, res): Promise<void> => {
  const params = UpdateMemberParams.safeParse(req.params);
  const body = UpdateMemberBody.safeParse(req.body);
  if (!params.success || !body.success) {
    const message = !params.success ? params.error.message : "Invalid member update";
    res.status(400).json({ error: message });
    return;
  }
  const workspace = await getWorkspace();
  const [updated] = await db.update(membersTable).set(body.data).where(and(eq(membersTable.id, params.data.id), eq(membersTable.workspaceId, workspace.id))).returning();
  if (!updated) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  res.json(UpdateMemberResponse.parse(mapMember(updated)));
});

router.delete("/members/:id", async (req, res): Promise<void> => {
  const params = UpdateMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const workspace = await getWorkspace();
  const deleted = await db.delete(membersTable).where(and(eq(membersTable.id, params.data.id), eq(membersTable.workspaceId, workspace.id))).returning({ id: membersTable.id });
  if (!deleted[0]) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/payments", async (req, res): Promise<void> => {
  const parsed = GetPaymentsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const workspace = await getWorkspace();
  const conditions = [eq(paymentsTable.workspaceId, workspace.id)];
  if (parsed.data.status && parsed.data.status !== "all") conditions.push(eq(paymentsTable.status, parsed.data.status));
  const rows = await db.select().from(paymentsTable).where(and(...conditions)).orderBy(desc(paymentsTable.createdAt));
  res.json(GetPaymentsResponse.parse(rows.map(mapPayment)));
});

router.get("/bot-events", async (req, res): Promise<void> => {
  const parsed = GetBotEventsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const workspace = await getWorkspace();
  const conditions = [eq(botEventsTable.workspaceId, workspace.id)];
  if (parsed.data.status && parsed.data.status !== "all") conditions.push(eq(botEventsTable.status, parsed.data.status));
  const rows = await db.select().from(botEventsTable).where(and(...conditions)).orderBy(desc(botEventsTable.updatedAt));
  res.json(GetBotEventsResponse.parse(rows.map(mapBotEvent)));
});

router.post("/bot-events/:id/retry", async (req, res): Promise<void> => {
  const params = RetryBotEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const workspace = await getWorkspace();
  const [updated] = await db.update(botEventsTable).set({ status: "pending", retryCount: 0, lastError: null, updatedAt: new Date() }).where(and(eq(botEventsTable.id, params.data.id), eq(botEventsTable.workspaceId, workspace.id))).returning();
  if (!updated) {
    res.status(404).json({ error: "Bot event not found" });
    return;
  }
  res.json(RetryBotEventResponse.parse(mapBotEvent(updated)));
});

router.get("/settings", async (_req, res): Promise<void> => {
  const workspace = await getWorkspace();
  const settings = await getWorkspaceSettings(workspace.id);
  const data = {
    workspaceName: workspace.name,
    whopCompanyId: workspace.whopCompanyId,
    defaultTier: settings.defaultTier,
    botConnected: workspace.botConnected,
    webhookConnected: workspace.webhookConnected,
    notifications: settings.notifications,
  };
  res.json(GetSettingsResponse.parse(data));
});

router.patch("/settings", async (req, res): Promise<void> => {
  const body = UpdateSettingsBody.safeParse(req.body);
  if (!body.success) {
    res.status(400).json({ error: body.error.message });
    return;
  }
  const workspace = await getWorkspace();
  const current = await getWorkspaceSettings(workspace.id);
  if (body.data.workspaceName !== undefined) {
    await db.update(workspacesTable).set({ name: body.data.workspaceName, updatedAt: new Date() }).where(eq(workspacesTable.id, workspace.id));
  }
  await db.update(workspaceSettingsTable).set({
    defaultTier: body.data.defaultTier ?? current.defaultTier,
    notifications: body.data.notifications ? { ...current.notifications, ...body.data.notifications } : current.notifications,
  }).where(eq(workspaceSettingsTable.workspaceId, workspace.id));
  const updatedWorkspace = await getWorkspace();
  const updatedSettings = await getWorkspaceSettings(workspace.id);
  res.json(UpdateSettingsResponse.parse({
    workspaceName: updatedWorkspace.name,
    whopCompanyId: updatedWorkspace.whopCompanyId,
    defaultTier: updatedSettings.defaultTier,
    botConnected: updatedWorkspace.botConnected,
    webhookConnected: updatedWorkspace.webhookConnected,
    notifications: updatedSettings.notifications,
  }));
});

export default router;