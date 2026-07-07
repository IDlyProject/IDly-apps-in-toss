import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const TOSS_API_BASE = "https://apps-in-toss-api.toss.im";

interface TokenResponse {
  tokenType: string;
  accessToken: string;
  refreshToken: string;
  expiresIn: string;
  scope: string;
}

interface LoginMeResponse {
  userKey: string;
  name?: string;
  phone?: string;
  birthday?: string;
}

@Injectable()
export class TossAuthService {
  private readonly clientId: string;
  private readonly clientSecret: string;

  constructor(private readonly config: ConfigService) {
    this.clientId = config.get<string>("TOSS_CLIENT_ID", "");
    this.clientSecret = config.get<string>("TOSS_CLIENT_SECRET", "");
  }

  async login(authorizationCode: string, referrer: string): Promise<{ userId: string }> {
    const token = await this.generateToken(authorizationCode, referrer);
    const userInfo = await this.getLoginMe(token.accessToken);
    return { userId: userInfo.userKey };
  }

  private async generateToken(authorizationCode: string, referrer: string): Promise<TokenResponse> {
    const credentials = Buffer.from(`${this.clientId}:${this.clientSecret}`).toString("base64");

    const response = await fetch(
      `${TOSS_API_BASE}/api-partner/v1/apps-in-toss/user/oauth2/generate-token`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Basic ${credentials}`,
        },
        body: JSON.stringify({ authorizationCode, referrer }),
      },
    );

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new UnauthorizedException(
        (error as { error?: string }).error ?? "토스 토큰 발급 실패",
      );
    }

    return response.json() as Promise<TokenResponse>;
  }

  private async getLoginMe(accessToken: string): Promise<LoginMeResponse> {
    const response = await fetch(
      `${TOSS_API_BASE}/api-partner/v1/apps-in-toss/user/oauth2/login-me`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      },
    );

    if (!response.ok) {
      throw new UnauthorizedException("사용자 정보 조회 실패");
    }

    return response.json() as Promise<LoginMeResponse>;
  }
}
