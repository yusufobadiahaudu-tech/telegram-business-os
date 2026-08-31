import { desc, eq } from "drizzle-orm";
import { db, workspacesTable, workspaceSettingsTable } from "@workspace/db";

export async function getWorkspace() {
  const [workspace] = await db
    .select()
    .from(workspacesTable)
    .orderBy(desc(workspacesTable.createdAt))
    .limit(1);

  if (!workspace) {
    throw new Error("Workspace is not initialized");
  }

  return workspace;
}

export async function getWorkspaceSettings(workspaceId: string) {
  const [settings] = await db
    .select()
    .from(workspaceSettingsTable)
    .where(eq(workspaceSettingsTable.workspaceId, workspaceId))
    .limit(1);

  if (!settings) {
    throw new Error("Workspace settings are not initialized");
  }

  return settings;
}