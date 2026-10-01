"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { BlockchainTransaction } from "@/lib/types";

export function TransactionsTab({ onChainId }: { onChainId: number }) {
  const { data, isLoading, error } = useQuery<BlockchainTransaction[]>({
    queryKey: ["transactions", onChainId],
    queryFn: () => api.listTransactions(onChainId),
  });

  return (
    <div className="card">
      <p className="card-title">Transaction history</p>
      {isLoading && <div className="empty-state">Loading…</div>}
      {error && <div className="error-banner">{error instanceof Error ? error.message : "Failed to load transactions"}</div>}
      {data && data.length === 0 && <div className="empty-state">No transactions synced yet.</div>}
      {data?.map((tx) => (
        <div key={tx.id} className="list-row">
          <div>
            <div>
              <strong>{tx.type.replaceAll("_", " ").toLowerCase()}</strong>{" "}
              <span className={`status ${tx.status === "CONFIRMED" ? "released" : tx.status === "FAILED" ? "disputed" : "pending"}`}>
                {tx.status}
              </span>
            </div>
            <p className="mono text-faint" style={{ margin: "4px 0 0" }}>
              {tx.txHash}
            </p>
          </div>
          <div className="text-faint text-small" style={{ textAlign: "right", flexShrink: 0 }}>
            {tx.blockNumber != null && <div>block {tx.blockNumber}</div>}
            <div>{new Date(tx.createdAt).toLocaleString()}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
