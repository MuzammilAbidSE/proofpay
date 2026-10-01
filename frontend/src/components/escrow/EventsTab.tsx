"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { BlockchainEvent } from "@/lib/types";

export function EventsTab({ onChainId }: { onChainId: number }) {
  const { data, isLoading, error } = useQuery<BlockchainEvent[]>({
    queryKey: ["events", onChainId],
    queryFn: () => api.listEvents(onChainId),
  });

  return (
    <div className="card">
      <p className="card-title">Indexed contract events</p>
      <p className="text-muted text-small" style={{ marginTop: -8, marginBottom: 14 }}>
        Captured by the background indexer directly from chain logs — the source of truth independent of any API call.
      </p>
      {isLoading && <div className="empty-state">Loading…</div>}
      {error && <div className="error-banner">{error instanceof Error ? error.message : "Failed to load events"}</div>}
      {data && data.length === 0 && <div className="empty-state">No events indexed yet.</div>}
      {data?.map((ev) => (
        <div key={ev.id} className="list-row" style={{ display: "block" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>{ev.eventName}</strong>
            <span className="text-faint text-small">block {ev.blockNumber}</span>
          </div>
          <p className="mono text-faint" style={{ margin: "4px 0" }}>
            {JSON.stringify(ev.args)}
          </p>
          <p className="mono text-faint" style={{ margin: 0 }}>
            {ev.txHash}
          </p>
        </div>
      ))}
    </div>
  );
}
