import { BadRequestException, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { verifyMessage } from "ethers";
import { PrismaService } from "../prisma/prisma.service";
import { UsersService } from "../users/users.service";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly users: UsersService,
    private readonly jwt: JwtService,
  ) {}

  private challengeMessage(nonce: string) {
    return `Sign this message to authenticate with ProofPay.\nNonce: ${nonce}`;
  }

  async requestNonce(address: string) {
    const user = await this.users.findOrCreateByAddress(address);
    return { message: this.challengeMessage(user.nonce) };
  }

  async verify(address: string, signature: string) {
    const walletAddress = address.toLowerCase();
    const user = await this.prisma.user.findUnique({ where: { walletAddress } });
    if (!user) throw new BadRequestException("Request a nonce first");

    const recovered = verifyMessage(this.challengeMessage(user.nonce), signature);
    if (recovered.toLowerCase() !== walletAddress) {
      throw new BadRequestException("Signature does not match wallet address");
    }

    // Rotate the nonce so the signature can't be replayed.
    await this.prisma.user.update({ where: { id: user.id }, data: { nonce: crypto.randomUUID() } });

    const accessToken = await this.jwt.signAsync({ sub: walletAddress });
    return { accessToken };
  }
}
