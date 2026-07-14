import "reflect-metadata";

import { NestFactory } from "@nestjs/core";
import { ConfigService } from "@nestjs/config";
import type { NextFunction, Request, Response } from "express";

import { AppModule } from "./src/app.module.js";

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: false });
  const config = app.get(ConfigService);
  const origins = config
    .get<string>("CORS_ORIGINS", "http://localhost:5173")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  app.enableCors({
    origin: origins,
    credentials: true,
    allowedHeaders: ["Content-Type", "X-IDLY-Client"],
    methods: ["GET", "POST", "OPTIONS"],
  });
  app.use((_request: Request, response: Response, next: NextFunction) => {
    response.setHeader("X-Content-Type-Options", "nosniff");
    response.setHeader("Referrer-Policy", "no-referrer");
    response.setHeader("Cache-Control", "no-store");
    next();
  });

  const port = config.get<number>("PORT", 3001);
  const host = config.get<string>("HOST", "0.0.0.0");
  await app.listen(port, host);
  console.log(`IDly API listening on http://${host}:${port}`);
}

void bootstrap();
