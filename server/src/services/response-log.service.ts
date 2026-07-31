import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool } from "pg";

import type { ActionStatus, UserResponseLog } from "../../domain/types.js";
import { ActionsService } from "./actions.service.js";

interface SetStatusInput {
  userId: string;
  actionItemId: string;
  status: ActionStatus;
  incidentId: string;
  incidentTitle: string;
}

interface StoredLog {
  userId: string;
  actionItemId: string;
  status: ActionStatus;
  createdAt: string;
  completedAt: string | null;
  incidentId: string;
  incidentTitle: string;
}

const RETENTION_MS = 31 * 24 * 60 * 60 * 1000;

@Injectable()
export class ResponseLogService implements OnModuleDestroy {
  private readonly pool: Pool | null;
  // DATABASE_URL이 없는 로컬 개발 환경을 위한 폴백 저장소. 서버 재시작 시 초기화돼요.
  private readonly memoryStore = new Map<string, StoredLog>();

  constructor(
    private readonly actionsService: ActionsService,
    config: ConfigService,
  ) {
    const connectionString = config.get<string>("DATABASE_URL");

    if (connectionString == null || connectionString.length === 0) {
      this.pool = null;
      console.warn(
        "[ResponseLogService] DATABASE_URL이 설정되지 않아 대응 상태를 메모리에만 저장해요. 서버를 재시작하면 초기화됩니다.",
      );
      return;
    }

    this.pool = new Pool({
      connectionString,
      ssl: { rejectUnauthorized: false },
    });
  }

  async onModuleDestroy() {
    await this.pool?.end();
  }

  async listByUser(userId: string) {
    if (this.pool == null) {
      const cutoff = Date.now() - RETENTION_MS;
      for (const [key, row] of this.memoryStore.entries()) {
        if (new Date(row.createdAt).getTime() < cutoff) {
          this.memoryStore.delete(key);
        }
      }

      return [...this.memoryStore.values()]
        .filter((row) => row.userId === userId)
        .map((row) => ({
          actionItemId: row.actionItemId,
          status: row.status,
          createdAt: row.createdAt,
          completedAt: row.completedAt,
          incidentId: row.incidentId,
          incidentTitle: row.incidentTitle,
          action: this.actionsService.getActionById(row.actionItemId),
        }));
    }

    const { rows } = await this.pool.query<{
      user_id: string;
      action_item_id: string;
      status: string;
      created_at: string;
      completed_at: string | null;
      incident_id: string;
      incident_title: string;
    }>(
      `SELECT user_id, action_item_id, status, created_at, completed_at, incident_id, incident_title
       FROM user_response_logs
       WHERE user_id = $1 AND created_at >= NOW() - INTERVAL '31 days'`,
      [userId],
    );

    return rows.map((row) => ({
      actionItemId: row.action_item_id,
      status: row.status as ActionStatus,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      incidentId: row.incident_id,
      incidentTitle: row.incident_title,
      action: this.actionsService.getActionById(row.action_item_id),
    }));
  }

  async setStatus(input: SetStatusInput): Promise<UserResponseLog> {
    this.actionsService.getActionById(input.actionItemId);

    const now = new Date().toISOString();

    if (this.pool == null) {
      const key = `${input.userId}:${input.actionItemId}`;
      const existing = this.memoryStore.get(key);
      const stored: StoredLog = {
        userId: input.userId,
        actionItemId: input.actionItemId,
        status: input.status,
        createdAt: existing?.createdAt ?? now,
        completedAt: input.status === "done" ? now : null,
        incidentId: input.incidentId,
        incidentTitle: input.incidentTitle,
      };
      this.memoryStore.set(key, stored);

      return {
        actionItemId: stored.actionItemId,
        status: stored.status,
        createdAt: stored.createdAt,
        completedAt: stored.completedAt,
        incidentId: stored.incidentId,
        incidentTitle: stored.incidentTitle,
      };
    }

    const { rows } = await this.pool.query<{
      user_id: string;
      action_item_id: string;
      status: string;
      created_at: string;
      completed_at: string | null;
      incident_id: string;
      incident_title: string;
    }>(
      `INSERT INTO user_response_logs (user_id, action_item_id, status, created_at, completed_at, incident_id, incident_title)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (user_id, action_item_id) DO UPDATE
         SET status = EXCLUDED.status,
             completed_at = EXCLUDED.completed_at,
             incident_id = EXCLUDED.incident_id,
             incident_title = EXCLUDED.incident_title
       RETURNING *`,
      [
        input.userId,
        input.actionItemId,
        input.status,
        now,
        input.status === "done" ? now : null,
        input.incidentId,
        input.incidentTitle,
      ],
    );

    const row = rows[0]!;
    return {
      actionItemId: row.action_item_id,
      status: row.status as ActionStatus,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      incidentId: row.incident_id,
      incidentTitle: row.incident_title,
    };
  }
}
