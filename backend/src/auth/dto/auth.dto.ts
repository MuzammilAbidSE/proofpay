import { IsEthereumAddress, IsString } from "class-validator";

export class NonceDto {
  @IsEthereumAddress()
  address!: string;
}

export class VerifyDto {
  @IsEthereumAddress()
  address!: string;

  @IsString()
  signature!: string;
}
