import { BadRequestException, Body, Controller, Get, Param, Post, Query, Req, Res } from "@nestjs/common";
import type { Request, Response } from "express";

import type { ActionStatus } from "../../domain/types.js";
import { RateLimitService } from "../security/rate-limit.js";
import { SessionService } from "../security/session.js";
import { ActionsService } from "../services/actions.service.js";
import { ResponseLogService } from "../services/response-log.service.js";

@Controller()
export class ActionsController {
  constructor(
    private readonly actionsService: ActionsService,
    private readonly rateLimitService: RateLimitService,
    private readonly responseLogService: ResponseLogService,
    private readonly sessionService: SessionService,
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
  async getMyActions(@Req() request: Request, @Res({ passthrough: true }) response: Response) {
    const userId = this.sessionService.getOrCreateSessionUserId(request, response);
    return this.responseLogService.listByUser(userId);
  }

  @Post("actions/:actionId/status")
  async setActionStatus(
    @Param("actionId") actionId: string,
    @Body() body: { status?: ActionStatus },
    @Req() request: Request,
    @Res({ passthrough: true }) response: Response,
  ) {
    this.rateLimitService.assertAllowed({
      key: this.getClientIp(request),
      scope: "action-status",
      maxRequests: 60,
      windowMs: 60_000,
    });

    if (body.status !== "pending" && body.status !== "done") {
      throw new BadRequestException("알 수 없는 처리 상태예요.");
    }

    const userId = this.sessionService.getOrCreateSessionUserId(request, response);
    return this.responseLogService.setStatus({
      userId,
      actionItemId: actionId,
      status: body.status ?? "pending",
    });
  }

  private getClientIp(request: Request): string {
    const forwardedFor = request.headers["x-forwarded-for"];
    if (typeof forwardedFor === "string" && forwardedFor.length > 0) {
      return forwardedFor.split(",")[0]!.trim();
    }
    return request.ip ?? "unknown";
  }
}
