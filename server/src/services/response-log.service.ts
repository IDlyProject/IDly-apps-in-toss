import { Injectable, OnModuleDestroy } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Pool } from "pg";

import type { ActionStatus, UserResponseLog } from "../../domain/types.js";
import { ActionsService } from "./actions.service.js";

interface SetStatusInput {
  userId: string;
  actionItemId: string;
  status: ActionStatus;
}

@Injectable()
export class ResponseLogService implements OnModuleDestroy {
  private readonly pool: Pool;

  constructor(
    private readonly actionsService: ActionsService,
    config: ConfigService,
  ) {
    this.pool = new Pool({
      connectionString: config.get<string>("DATABASE_URL"),
      ssl: { rejectUnauthorized: false },
    });
  }

  async onModuleDestroy() {
    await this.pool.end();
  }

  async listByUser(userId: string) {
    const { rows } = await this.pool.query<{
      user_id: string;
      action_item_id: string;
      status: string;
      created_at: string;
      completed_at: string | null;
    }>(
      `SELECT user_id, action_item_id, status, created_at, completed_at
       FROM user_response_logs
       WHERE user_id = $1`,
      [userId],
    );

    return rows.map((row) => ({
      actionItemId: row.action_item_id,
      status: row.status as ActionStatus,
      createdAt: row.created_at,
      completedAt: row.completed_at,
      action: this.actionsService.getActionById(row.action_item_id),
    }));
  }

  async setStatus(input: SetStatusInput): Promise<UserResponseLog> {
    this.actionsService.getActionById(input.actionItemId);

    const now = new Date().toISOString();

    const { rows } = await this.pool.query<{
      user_id: string;
      action_item_id: string;
      status: string;
      created_at: string;
      completed_at: string | null;
    }>(
      `INSERT INTO user_response_logs (user_id, action_item_id, status, created_at, completed_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (user_id, action_item_id) DO UPDATE
         SET status = EXCLUDED.status,
             completed_at = EXCLUDED.completed_at
       RETURNING *`,
      [
        input.userId,
        input.actionItemId,
        input.status,
        now,
        input.status === "done" ? now : null,
      ],
    );

    const row = rows[0]!;
    return {
      actionItemId: row.action_item_id,
      status: row.status as ActionStatus,
      createdAt: row.created_at,
      completedAt: row.completed_at,
    };
  }
}
