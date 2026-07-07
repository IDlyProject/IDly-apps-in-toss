import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";

import type { ActionStatus } from "../../domain/types.js";
import { ActionsService } from "../services/actions.service.js";
import { ResponseLogService } from "../services/response-log.service.js";

@Controller()
export class ActionsController {
  constructor(
    private readonly actionsService: ActionsService,
    private readonly responseLogService: ResponseLogService,
  ) {}

  @Get("breach-types")
  getBreachTypes() {
    return this.actionsService.getBreachTypes();
  }

  @Get("providers")
  getProviders(@Query("breachTypeId") breachTypeId?: string) {
    return this.actionsService.getProviders(breachTypeId);
  }

  @Get("actions")
  getActions(@Query("breachTypeId") breachTypeId?: string) {
    return this.actionsService.getActions(breachTypeId);
  }

  @Get("me/actions")
  async getMyActions(@Query("userId") userId = "local-demo") {
    return this.responseLogService.listByUser(userId);
  }

  @Post("actions/:actionId/status")
  async setActionStatus(
    @Param("actionId") actionId: string,
    @Body() body: { userId?: string; status?: ActionStatus },
  ) {
    return this.responseLogService.setStatus({
      userId: body.userId ?? "local-demo",
      actionItemId: actionId,
      status: body.status ?? "pending",
    });
  }
}

