import crypto from "node:crypto";
import { Router, type IRouter } from "express";
import { db, outboxEventsTable } from "@workspace/db";
import { getWorkspace } from "../lib/workspace";

const router: IRouter = Router();

function signaturesMatch(rawBody: Buffer, signature: string, secret: string): boolean {
  const expected = `v1,${crypto.createHmac("sha256", secret).update(rawBody).digest("base64")}`;
  const provided = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expected);
  return provided.length === expectedBuffer.length && crypto.timingSafeEqual(provided, expectedBuffer);
}

router.post("/webhooks/whop", async (req, res): Promise<void> => {
  const startedAt = Date.now();
  const secret = process.env.WHOP_WEBHOOK_SECRET;
  const signature = req.header("webhook-signature") ?? req.header("x-whop-signature");
  const rawBody = (req as typeof req & { rawBody?: Buffer }).rawBody;

  if (!secret) {
    req.log.error("Whop webhook secret is not configured");
    res.status(503).json({ error: "Webhook ingestion is not configured" });
    return;
  }
  if (!signature || !rawBody || !signaturesMatch(rawBody, signature, secret)) {
    req.log.warn("Rejected webhook with invalid signature");
    res.status(401).json({ error: "Invalid webhook signature" });
    return;
  }

  if (!req.body || typeof req.body !== "object" || Array.isArray(req.body)) {
    res.status(400).json({ error: "Webhook payload must be a JSON object" });
    return;
  }

  const payload = req.body as Record<string, unknown>;
  const workspaceIdValue =
    payload.workspace_id ??
    (typeof payload.data === "object" && payload.data !== null
      ? (payload.data as Record<string, unknown>).workspace_id
      : undefined);
  const workspaceId =
    typeof workspaceIdValue === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(workspaceIdValue)
      ? workspaceIdValue
      : null;
  if (!workspaceId) {
    res.status(400).json({ error: "Missing workspace_id context" });
    return;
  }

  const eventType = typeof payload.action === "string" ? payload.action : typeof payload.event === "string" ? payload.event : "payment.succeeded";
  const idempotencyKey = typeof payload.id === "string" ? payload.id : crypto.createHash("sha256").update(rawBody).digest("hex");
  const workspace = await getWorkspace();
  if (workspace.id !== workspaceId) {
    res.status(404).json({ error: "Workspace not found" });
    return;
  }

  const [queued] = await db
    .insert(outboxEventsTable)
    .values({ workspaceId, eventType, payload, idempotencyKey })
    .onConflictDoNothing({ target: outboxEventsTable.idempotencyKey })
    .returning({ id: outboxEventsTable.id });

  req.log.info({ eventType, duplicate: !queued, latencyMs: Date.now() - startedAt }, "Whop webhook accepted");
  res.status(200).json({ status: "queued", duplicate: !queued, outbox_id: queued?.id ?? null });
});

export default router;