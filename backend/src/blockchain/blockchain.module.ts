import { Module } from "@nestjs/common";
import { ContractService } from "./contract.service";
import { BlockchainController } from "./blockchain.controller";

@Module({
  controllers: [BlockchainController],
  providers: [ContractService],
  exports: [ContractService],
})
export class BlockchainModule {}
