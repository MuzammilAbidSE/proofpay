"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { formatEther } from "viem";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { roleFor, type Escrow } from "@/lib/types";

export default function DisputesOverviewPage() {
  const { address } = useAccount();
  const { authed } = useAuth();

  const { data: escrows, isLoading, error } = useQuery<Escrow[]>({
    queryKey: ["my-escrows"],
    queryFn: () => api.listMyEscrows(),
    enabled: authed,
  });

  const disputed = (escrows ?? [])
    .flatMap((escrow) => escrow.milestones.filter((m) => m.status === "DISPUTED").map((milestone) => ({ escrow, milestone })))
    .sort((a, b) => a.escrow.onChainId - b.escrow.onChainId);

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">Disputes</h1>
        <p className="page-subtitle">Every milestone currently in a disputed state across your escrows.</p>
      </div>

      {!authed && <div className="callout info">Connect and sign in to see disputes across your escrows.</div>}

      {authed && isLoading && <div className="empty-state">Loading…</div>}
      {authed && error && <div className="error-banner">{error instanceof Error ? error.message : "Failed to load disputes"}</div>}

      {authed && disputed.length === 0 && !isLoading && (
        <div className="card">
          <div className="empty-state">No open disputes. Nice.</div>
        </div>
      )}

      {disputed.map(({ escrow, milestone }) => {
        const role = roleFor(escrow, address);
        return (
          <Link key={milestone.id} href={`/escrows/${escrow.onChainId}`} className="escrow-card" style={{ marginBottom: 14 }}>
            <div className="escrow-card-top">
              <span className="escrow-card-id">
                Escrow #{escrow.onChainId} · Milestone #{milestone.onChainId}
              </span>
              <span className="badge-role">{role}</span>
            </div>
            <p className="text-muted text-small" style={{ margin: 0 }}>
              {formatEther(BigInt(milestone.amountWei))} ETH at stake · arbitrator{" "}
              <span className="mono">{escrow.arbitratorAddr}</span>
            </p>
          </Link>
        );
      })}
    </>
  );
}
