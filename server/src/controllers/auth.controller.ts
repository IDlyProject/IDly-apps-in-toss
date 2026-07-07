import { Body, Controller, Post } from "@nestjs/common";

import { TossAuthService } from "../services/toss-auth.service.js";

@Controller("auth")
export class AuthController {
  constructor(private readonly tossAuthService: TossAuthService) {}

  @Post("toss/login")
  async tossLogin(@Body() body: { authorizationCode: string; referrer: string }) {
    return this.tossAuthService.login(body.authorizationCode, body.referrer);
  }
}
