import { BadRequestException, Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Contract, JsonRpcProvider, ZeroAddress } from "ethers";
import abi from "./ProofPayEscrow.abi.json";

/**
 * Read-only chain access. The backend never holds a signer or private key:
 * the smart contract is the sole custodian of escrowed funds, and every
 * state-changing call is signed by the client/freelancer/arbitrator's own
 * wallet in the frontend.
 */
@Injectable()
export class ContractService {
  readonly provider: JsonRpcProvider;
  readonly contract: Contract;
  readonly address: string;

  constructor(config: ConfigService) {
    this.provider = new JsonRpcProvider(config.get<string>("RPC_URL"));
    this.address = config.get<string>("CONTRACT_ADDRESS") ?? "";
    // An empty string isn't a valid address, so ethers would treat it as an
    // ENS name and eagerly try to resolve it against the RPC provider.
    // Fall back to the zero address until CONTRACT_ADDRESS is actually set.
    this.contract = new Contract(this.address || ZeroAddress, abi, this.provider);
  }

  async getEscrow(onChainId: number) {
    return this.contract.escrows(onChainId);
  }

  async getMilestones(onChainId: number) {
    return this.contract.getMilestones(onChainId);
  }

  /**
   * Waits for a transaction to confirm and decodes the named event from its
   * receipt. Endpoints use this instead of trusting client-supplied data:
   * the confirmed on-chain log is the only source of truth for what happened.
   */
  async getConfirmedEvent(txHash: string, eventName: string) {
    const receipt = await this.provider.waitForTransaction(txHash, 1, 60_000);
    if (!receipt || receipt.status !== 1) {
      throw new BadRequestException(`Transaction ${txHash} did not confirm successfully`);
    }

    for (const log of receipt.logs) {
      if (log.address.toLowerCase() !== this.address.toLowerCase()) continue;
      const parsed = this.contract.interface.parseLog(log);
      if (parsed?.name === eventName) {
        const args = Object.fromEntries(
          parsed.fragment.inputs.map((input, i) => [
            input.name,
            typeof parsed.args[i] === "bigint" ? (parsed.args[i] as bigint).toString() : parsed.args[i],
          ]),
        );
        return { args, blockNumber: receipt.blockNumber, from: receipt.from };
      }
    }

    throw new BadRequestException(`Transaction ${txHash} does not contain a ${eventName} event`);
  }
}
