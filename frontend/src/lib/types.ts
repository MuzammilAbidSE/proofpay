export type MilestoneStatus = "PENDING" | "SUBMITTED" | "APPROVED" | "RELEASED" | "DISPUTED" | "REFUNDED";

export type Milestone = {
  id: string;
  onChainId: number;
  amountWei: string;
  status: MilestoneStatus;
  proofHash: string | null;
  submittedAt?: string | null;
  approvedAt?: string | null;
  releasedAt?: string | null;
};

export type User = {
  id: string;
  walletAddress: string;
};

export type Escrow = {
  id: string;
  onChainId: number;
  contractAddress: string;
  arbitratorAddr: string;
  createdAt: string;
  client: User;
  freelancer: User;
  milestones: Milestone[];
};

export type BlockchainTransaction = {
  id: string;
  txHash: string;
  blockNumber: number | null;
  type: string;
  status: string;
  fromAddress: string;
  createdAt: string;
};

export type BlockchainEvent = {
  id: string;
  eventName: string;
  blockNumber: number;
  txHash: string;
  logIndex: number;
  args: Record<string, unknown>;
  processedAt: string;
};

export type DisputeEvidence = {
  id: string;
  submittedByAddr: string;
  note: string | null;
  fileHash: string | null;
  createdAt: string;
};

export type Dispute = {
  id: string;
  escrowId: string;
  milestoneId: string;
  openedByAddr: string;
  resolution: "RELEASED_TO_FREELANCER" | "REFUNDED_TO_CLIENT" | null;
  resolvedAt: string | null;
  createdAt: string;
  evidence: DisputeEvidence[];
  milestone: Milestone;
};

export type AuditLog = {
  id: string;
  actorAddr: string | null;
  action: string;
  entityType: string;
  entityId: string;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

export type Role = "client" | "freelancer" | "arbitrator" | "viewer";

export function roleFor(escrow: Escrow, address?: string): Role {
  if (!address) return "viewer";
  const a = address.toLowerCase();
  if (escrow.client.walletAddress.toLowerCase() === a) return "client";
  if (escrow.freelancer.walletAddress.toLowerCase() === a) return "freelancer";
  if (escrow.arbitratorAddr.toLowerCase() === a) return "arbitrator";
  return "viewer";
}
