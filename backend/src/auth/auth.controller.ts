import { Body, Controller, Post } from "@nestjs/common";
import { AuthService } from "./auth.service";
import { NonceDto, VerifyDto } from "./dto/auth.dto";

@Controller("auth")
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post("nonce")
  requestNonce(@Body() dto: NonceDto) {
    return this.auth.requestNonce(dto.address);
  }

  @Post("verify")
  verify(@Body() dto: VerifyDto) {
    return this.auth.verify(dto.address, dto.signature);
  }
}
