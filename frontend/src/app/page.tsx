"use client";

import Link from "next/link";
import { useAccount } from "wagmi";
import { formatEther } from "viem";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { roleFor, type Escrow } from "@/lib/types";
import { StatusBadge } from "@/components/StatusBadge";

export default function Dashboard() {
  const { address, isConnected } = useAccount();
  const { authed, signIn, signingIn } = useAuth();

  const { data: escrows, isLoading, error } = useQuery<Escrow[]>({
    queryKey: ["my-escrows"],
    queryFn: () => api.listMyEscrows(),
    enabled: authed,
  });

  return (
    <>
      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Escrows where your wallet is the client, freelancer, or arbitrator.</p>
        </div>
        {authed && (
          <Link href="/escrows/new">
            <button>New escrow</button>
          </Link>
        )}
      </div>

      {!isConnected && (
        <div className="callout info">Connect a wallet from the header to see your escrows and create new ones.</div>
      )}

      {isConnected && !authed && (
        <div className="callout info">
          Wallet connected as <span className="mono">{address}</span>. Sign in to load your escrows.
          <div style={{ marginTop: 10 }}>
            <button onClick={signIn} disabled={signingIn}>
              {signingIn ? "Signing…" : "Sign in with wallet"}
            </button>
          </div>
        </div>
      )}

      {authed && (
        <div className="card">
          <p className="card-title">My escrows</p>
          {isLoading && <div className="empty-state">Loading…</div>}
          {error && <div className="error-banner">{error instanceof Error ? error.message : "Failed to load escrows"}</div>}
          {escrows && escrows.length === 0 && (
            <div className="empty-state">
              No escrows yet.{" "}
              <Link href="/escrows/new">
                <button className="link">Create your first one</button>
              </Link>
              .
            </div>
          )}
          {escrows && escrows.length > 0 && (
            <div className="card-grid">
              {escrows.map((escrow) => {
                const role = roleFor(escrow, address);
                const disputed = escrow.milestones.filter((m) => m.status === "DISPUTED").length;
                const totalWei = escrow.milestones.reduce((sum, m) => sum + BigInt(m.amountWei), 0n);
                return (
                  <Link key={escrow.id} href={`/escrows/${escrow.onChainId}`} className="escrow-card">
                    <div className="escrow-card-top">
                      <span className="escrow-card-id">Escrow #{escrow.onChainId}</span>
                      <span className="badge-role">{role}</span>
                    </div>
                    <p className="text-muted text-small" style={{ margin: "0 0 8px" }}>
                      {escrow.milestones.length} milestone{escrow.milestones.length === 1 ? "" : "s"} · {formatEther(totalWei)} ETH
                    </p>
                    <div className="button-row" style={{ flexWrap: "wrap" }}>
                      {disputed > 0 && <span className="status disputed">{disputed} disputed</span>}
                      {escrow.milestones.slice(0, 4).map((m) => (
                        <StatusBadge key={m.id} status={m.status} />
                      ))}
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      )}
    </>
  );
}
