import { Injectable } from "@nestjs/common";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { ActionStatus, UserResponseLog } from "../../domain/types.js";
import { ActionsService } from "./actions.service.js";

interface SetStatusInput {
  userId: string;
  actionItemId: string;
  status: ActionStatus;
}

@Injectable()
export class ResponseLogService {
  private readonly storagePath = join(process.cwd(), "server", "storage", "user-response-logs.json");

  constructor(private readonly actionsService: ActionsService) {}

  async listByUser(userId: string) {
    const logs = await this.readLogs();
    return logs
      .filter((log) => log.userId === userId)
      .map((log) => ({
        ...log,
        action: this.actionsService.getActionById(log.actionItemId),
      }));
  }

  async setStatus(input: SetStatusInput): Promise<UserResponseLog> {
    this.actionsService.getActionById(input.actionItemId);

    const logs = await this.readLogs();
    const now = new Date().toISOString();
    const existing = logs.find(
      (log) => log.userId === input.userId && log.actionItemId === input.actionItemId,
    );

    if (existing != null) {
      existing.status = input.status;
      existing.completedAt = input.status === "done" ? now : null;
      await this.writeLogs(logs);
      return existing;
    }

    const next: UserResponseLog = {
      userId: input.userId,
      actionItemId: input.actionItemId,
      status: input.status,
      createdAt: now,
      completedAt: input.status === "done" ? now : null,
    };

    logs.push(next);
    await this.writeLogs(logs);
    return next;
  }

  private async readLogs(): Promise<UserResponseLog[]> {
    try {
      const raw = await readFile(this.storagePath, "utf8");
      return JSON.parse(raw) as UserResponseLog[];
    } catch (error) {
      if (error instanceof Error && "code" in error && error.code === "ENOENT") {
        return [];
      }
      throw error;
    }
  }

  private async writeLogs(logs: UserResponseLog[]): Promise<void> {
    await mkdir(dirname(this.storagePath), { recursive: true });
    await writeFile(this.storagePath, `${JSON.stringify(logs, null, 2)}\n`, "utf8");
  }
}

