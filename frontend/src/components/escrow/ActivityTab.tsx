"use client";

import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AuditLog } from "@/lib/types";

export function ActivityTab({ onChainId }: { onChainId: number }) {
  const { data, isLoading, error } = useQuery<AuditLog[]>({
    queryKey: ["audit-logs", onChainId],
    queryFn: () => api.listAuditLogs(onChainId),
  });

  return (
    <div className="card">
      <p className="card-title">Activity log</p>
      {isLoading && <div className="empty-state">Loading…</div>}
      {error && <div className="error-banner">{error instanceof Error ? error.message : "Failed to load activity"}</div>}
      {data && data.length === 0 && <div className="empty-state">No off-chain activity recorded yet.</div>}
      {data?.map((log) => (
        <div key={log.id} className="list-row">
          <div>
            <strong>{log.action.replaceAll(".", " → ")}</strong>
            <p className="mono text-faint" style={{ margin: "2px 0 0" }}>
              {log.actorAddr ?? "system"}
            </p>
          </div>
          <span className="text-faint text-small">{new Date(log.createdAt).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}
