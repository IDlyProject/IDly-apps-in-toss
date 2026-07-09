import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";

import { ActionsController } from "./controllers/actions.controller.js";
import { ChatController } from "./controllers/chat.controller.js";
import { HealthController } from "./controllers/health.controller.js";
import { ActionsService } from "./services/actions.service.js";
import { AnalyzeService } from "./services/analyze.service.js";
import { ResponseLogService } from "./services/response-log.service.js";
import { UpstageService } from "./services/upstage.service.js";

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: [".env.local", ".env"],
    }),
  ],
  controllers: [HealthController, ActionsController, ChatController],
  providers: [ActionsService, AnalyzeService, ResponseLogService, UpstageService],
})
export class AppModule {}

