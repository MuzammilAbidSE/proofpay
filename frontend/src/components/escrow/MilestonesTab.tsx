"use client";

import { useState } from "react";
import { useAccount, useWriteContract } from "wagmi";
import { formatEther, parseEther } from "viem";
import { escrowContract } from "@/lib/contract";
import { api } from "@/lib/api";
import { hashText } from "@/lib/hash";
import { useTxRunner } from "@/lib/use-tx-runner";
import { roleFor, type Escrow, type Milestone } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";
import { ProofVerifier } from "./ProofVerifier";

export function MilestonesTab({ escrow, refresh }: { escrow: Escrow; refresh: () => void }) {
  const { address } = useAccount();
  const { writeContractAsync } = useWriteContract();
  const { busy, error, run } = useTxRunner();

  const [depositAmount, setDepositAmount] = useState("0.1");
  const [milestoneAmount, setMilestoneAmount] = useState("0.1");
  const [proofText, setProofText] = useState("delivered-work.zip");

  const role = roleFor(escrow, address);
  const isClient = role === "client";
  const isFreelancer = role === "freelancer";
  const isArbitrator = role === "arbitrator";
  const isParty = isClient || isFreelancer;

  async function deposit() {
    await run(async () => {
      await writeContractAsync({
        ...escrowContract,
        functionName: "deposit",
        args: [BigInt(escrow.onChainId)],
        value: parseEther(depositAmount),
      });
      refresh();
    });
  }

  async function addMilestone() {
    await run(async () => {
      const hash = await writeContractAsync({
        ...escrowContract,
        functionName: "addMilestone",
        args: [BigInt(escrow.onChainId), parseEther(milestoneAmount)],
      });
      await api.addMilestone(escrow.onChainId, hash);
      refresh();
    });
  }

  async function submitMilestone(milestone: Milestone) {
    await run(async () => {
      const proofHash = await hashText(proofText);
      const hash = await writeContractAsync({
        ...escrowContract,
        functionName: "submitMilestone",
        args: [BigInt(escrow.onChainId), BigInt(milestone.onChainId), proofHash],
      });
      await api.submitMilestone(milestone.id, hash);
      refresh();
    });
  }

  async function approveMilestone(milestone: Milestone) {
    await run(async () => {
      const hash = await writeContractAsync({
        ...escrowContract,
        functionName: "approveMilestone",
        args: [BigInt(escrow.onChainId), BigInt(milestone.onChainId)],
      });
      await api.approveMilestone(milestone.id, hash);
      refresh();
    });
  }

  async function openDispute(milestone: Milestone) {
    await run(async () => {
      const hash = await writeContractAsync({
        ...escrowContract,
        functionName: "openDispute",
        args: [BigInt(escrow.onChainId), BigInt(milestone.onChainId)],
      });
      await api.disputeMilestone(milestone.id, hash);
      refresh();
    });
  }

  async function releasePayment(milestone: Milestone) {
    await run(async () => {
      const hash = await writeContractAsync({
        ...escrowContract,
        functionName: "releasePayment",
        args: [BigInt(escrow.onChainId), BigInt(milestone.onChainId)],
      });
      await api.releaseMilestone(milestone.id, hash);
      refresh();
    });
  }

  async function refund(milestone: Milestone) {
    await run(async () => {
      const hash = await writeContractAsync({
        ...escrowContract,
        functionName: "refund",
        args: [BigInt(escrow.onChainId), BigInt(milestone.onChainId)],
      });
      await api.refundMilestone(milestone.id, hash);
      refresh();
    });
  }

  return (
    <>
      {isClient && (
        <div className="card">
          <p className="card-title">Fund escrow</p>
          <div className="form-row">
            <div className="field">
              <label>Deposit amount (ETH)</label>
              <input value={depositAmount} onChange={(e) => setDepositAmount(e.target.value)} />
            </div>
            <div className="field">
              <label>New milestone amount (ETH)</label>
              <input value={milestoneAmount} onChange={(e) => setMilestoneAmount(e.target.value)} />
            </div>
          </div>
          <div className="button-row">
            <button onClick={deposit} disabled={busy}>
              Deposit
            </button>
            <button className="secondary" onClick={addMilestone} disabled={busy}>
              Add milestone
            </button>
          </div>
        </div>
      )}

      {isFreelancer && (
        <div className="card">
          <p className="card-title">Proof of delivery</p>
          <div className="field">
            <label>Content to hash (never uploaded — only the keccak256 hash is submitted on-chain)</label>
            <input value={proofText} onChange={(e) => setProofText(e.target.value)} />
          </div>
        </div>
      )}

      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <p className="card-title">Milestones ({escrow.milestones.length})</p>
        {escrow.milestones.length === 0 && <div className="empty-state">No milestones yet.</div>}
        {escrow.milestones.map((milestone) => (
          <div key={milestone.id} className="list-row" style={{ display: "block", padding: "14px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <strong>
                Milestone #{milestone.onChainId} · {formatEther(BigInt(milestone.amountWei))} ETH
              </strong>
              <StatusBadge status={milestone.status} />
            </div>
            <p className="mono text-faint" style={{ margin: "6px 0" }}>
              {milestone.proofHash ?? "no proof submitted yet"}
            </p>
            {milestone.proofHash && <ProofVerifier proofHash={milestone.proofHash} />}
            <div className="button-row" style={{ marginTop: 8 }}>
              {isFreelancer && (
                <button className="small" onClick={() => submitMilestone(milestone)} disabled={busy || milestone.status !== "PENDING"}>
                  Submit
                </button>
              )}
              {isClient && (
                <button className="small" onClick={() => approveMilestone(milestone)} disabled={busy || milestone.status !== "SUBMITTED"}>
                  Approve
                </button>
              )}
              <button
                className="small"
                onClick={() => releasePayment(milestone)}
                disabled={
                  busy ||
                  !(milestone.status === "APPROVED" || (milestone.status === "DISPUTED" && isArbitrator))
                }
              >
                {milestone.status === "DISPUTED" ? "Resolve: release to freelancer" : "Release payment"}
              </button>
              {isArbitrator && (
                <button
                  className="small danger"
                  onClick={() => refund(milestone)}
                  disabled={busy || milestone.status !== "DISPUTED"}
                >
                  Resolve: refund client
                </button>
              )}
              {isParty && (
                <button
                  className="small secondary"
                  onClick={() => openDispute(milestone)}
                  disabled={busy || !(milestone.status === "SUBMITTED" || milestone.status === "APPROVED")}
                >
                  Open dispute
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
