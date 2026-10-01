import { Module } from "@nestjs/common";
import { IndexerService } from "./indexer.service";
import { BlockchainModule } from "../blockchain/blockchain.module";
import { EscrowsModule } from "../escrows/escrows.module";
import { MilestonesModule } from "../milestones/milestones.module";

@Module({
  imports: [BlockchainModule, EscrowsModule, MilestonesModule],
  providers: [IndexerService],
})
export class IndexerModule {}
