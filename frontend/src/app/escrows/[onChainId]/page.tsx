"use client";

import { useState } from "react";
import { useParams } from "next/navigation";
import { useAccount } from "wagmi";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { roleFor, type Escrow } from "@/lib/types";
import { MilestonesTab } from "@/components/escrow/MilestonesTab";
import { DisputesTab } from "@/components/escrow/DisputesTab";
import { TransactionsTab } from "@/components/escrow/TransactionsTab";
import { EventsTab } from "@/components/escrow/EventsTab";
import { ActivityTab } from "@/components/escrow/ActivityTab";

const TABS = ["Milestones", "Disputes", "Transactions", "Events", "Activity"] as const;
type Tab = (typeof TABS)[number];

export default function EscrowDetailPage() {
  const params = useParams<{ onChainId: string }>();
  const onChainId = Number(params.onChainId);
  const { address } = useAccount();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("Milestones");

  const { data: escrow, isLoading, error } = useQuery<Escrow>({
    queryKey: ["escrow", onChainId],
    queryFn: () => api.getEscrow(onChainId),
    enabled: Number.isFinite(onChainId),
  });

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: ["escrow", onChainId] });
    queryClient.invalidateQueries({ queryKey: ["transactions", onChainId] });
    queryClient.invalidateQueries({ queryKey: ["events", onChainId] });
    queryClient.invalidateQueries({ queryKey: ["audit-logs", onChainId] });
    if (escrow) queryClient.invalidateQueries({ queryKey: ["disputes", escrow.id] });
  };

  if (isLoading) return <div className="empty-state">Loading escrow…</div>;
  if (error || !escrow) {
    return <div className="error-banner">{error instanceof Error ? error.message : "Escrow not found"}</div>;
  }

  const role = roleFor(escrow, address);
  const disputedCount = escrow.milestones.filter((m) => m.status === "DISPUTED").length;

  return (
    <>
      <div className="page-header page-header-row">
        <div>
          <h1 className="page-title">Escrow #{escrow.onChainId}</h1>
          <p className="page-subtitle mono">{escrow.contractAddress}</p>
        </div>
        <span className="badge-role">viewing as {role}</span>
      </div>

      <div className="card" style={{ display: "flex", gap: 24, flexWrap: "wrap" }}>
        <RoleField label="Client" address={escrow.client.walletAddress} highlight={role === "client"} />
        <RoleField label="Freelancer" address={escrow.freelancer.walletAddress} highlight={role === "freelancer"} />
        <RoleField label="Arbitrator" address={escrow.arbitratorAddr} highlight={role === "arbitrator"} />
      </div>

      <div className="tabs">
        {TABS.map((t) => (
          <button key={t} className={`tab${tab === t ? " active" : ""}`} onClick={() => setTab(t)}>
            {t}
            {t === "Disputes" && disputedCount > 0 && ` (${disputedCount})`}
          </button>
        ))}
      </div>

      {tab === "Milestones" && <MilestonesTab escrow={escrow} refresh={refresh} />}
      {tab === "Disputes" && <DisputesTab escrow={escrow} />}
      {tab === "Transactions" && <TransactionsTab onChainId={onChainId} />}
      {tab === "Events" && <EventsTab onChainId={onChainId} />}
      {tab === "Activity" && <ActivityTab onChainId={onChainId} />}
    </>
  );
}

function RoleField({ label, address, highlight }: { label: string; address: string; highlight: boolean }) {
  return (
    <div>
      <label style={{ marginBottom: 2 }}>{label}</label>
      <p className={`mono ${highlight ? "" : "text-muted"}`} style={{ margin: 0 }}>
        {address}
      </p>
    </div>
  );
}
