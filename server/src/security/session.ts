import { createHash, randomBytes } from "node:crypto";

import { ForbiddenException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const PRODUCTION_SESSION_COOKIE = "__Host-idly_session";
const DEVELOPMENT_SESSION_COOKIE = "idly_session";
const CLIENT_HEADER = "x-idly-client";
const SESSION_BYTES = 32;
const MAX_COOKIE_AGE_SECONDS = 60 * 60 * 24 * 30;

interface CookieResponse {
  setHeader(name: string, value: string | string[]): void;
  getHeader(name: string): number | string | string[] | undefined;
}

interface HeaderRequest {
  headers: Record<string, string | string[] | undefined>;
}

@Injectable()
export class SessionService {
  private readonly allowedOrigins: Set<string>;
  private readonly isProduction: boolean;
  private readonly sessionCookie: string;

  constructor(config: ConfigService) {
    this.allowedOrigins = new Set(
      config
        .get<string>("CORS_ORIGINS", "")
        .split(",")
        .map((origin) => origin.trim())
        .filter(Boolean),
    );
    this.isProduction = config.get<string>("NODE_ENV") === "production";
    this.sessionCookie = this.isProduction ? PRODUCTION_SESSION_COOKIE : DEVELOPMENT_SESSION_COOKIE;
  }

  getOrCreateSessionUserId(request: HeaderRequest, response: CookieResponse): string {
    this.assertTrustedBrowserRequest(request);

    const cookieHeader = this.getHeader(request, "cookie");
    const existingSession = this.parseCookie(cookieHeader)[this.sessionCookie];
    const sessionId = this.isValidSession(existingSession)
      ? existingSession
      : this.createSession(response);

    return `session:${this.hashSession(sessionId)}`;
  }

  private assertTrustedBrowserRequest(request: HeaderRequest) {
    const clientHeader = this.getHeader(request, CLIENT_HEADER);
    if (clientHeader !== "web") {
      throw new ForbiddenException("요청을 확인할 수 없어요.");
    }

    const origin = this.getHeader(request, "origin");
    if (origin != null && this.allowedOrigins.size > 0 && !this.allowedOrigins.has(origin)) {
      throw new ForbiddenException("허용되지 않은 출처의 요청이에요.");
    }
  }

  private createSession(response: CookieResponse): string {
    const sessionId = randomBytes(SESSION_BYTES).toString("base64url");
    this.appendSetCookie(response, this.serializeCookie(sessionId));
    return sessionId;
  }

  private serializeCookie(sessionId: string): string {
    const parts = [
      `${this.sessionCookie}=${sessionId}`,
      "Path=/",
      "HttpOnly",
      `Max-Age=${MAX_COOKIE_AGE_SECONDS}`,
    ];

    if (this.isProduction) {
      parts.push("Secure", "SameSite=None");
    } else {
      parts.push("SameSite=Lax");
    }

    return parts.join("; ");
  }

  private appendSetCookie(response: CookieResponse, cookie: string) {
    const current = response.getHeader("Set-Cookie");
    if (Array.isArray(current)) {
      response.setHeader("Set-Cookie", [...current, cookie]);
      return;
    }
    if (typeof current === "string") {
      response.setHeader("Set-Cookie", [current, cookie]);
      return;
    }
    response.setHeader("Set-Cookie", cookie);
  }

  private parseCookie(cookieHeader: string | undefined): Record<string, string> {
    if (cookieHeader == null) {
      return {};
    }

    return Object.fromEntries(
      cookieHeader
        .split(";")
        .map((part) => part.trim())
        .filter(Boolean)
        .map((part) => {
          const index = part.indexOf("=");
          if (index === -1) {
            return [part, ""];
          }
          return [part.slice(0, index), part.slice(index + 1)];
        }),
    );
  }

  private isValidSession(value: string | undefined): value is string {
    return value != null && /^[A-Za-z0-9_-]{32,128}$/.test(value);
  }

  private hashSession(sessionId: string): string {
    return createHash("sha256").update(sessionId).digest("base64url");
  }

  private getHeader(request: HeaderRequest, name: string): string | undefined {
    const value = request.headers[name];
    if (Array.isArray(value)) {
      return value[0];
    }
    return value;
  }
}
