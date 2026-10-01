import { Matches } from "class-validator";

export class SyncTxDto {
  @Matches(/^0x[0-9a-fA-F]{64}$/, { message: "txHash must be a 32-byte hex string" })
  txHash!: string;
}
