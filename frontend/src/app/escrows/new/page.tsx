"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAccount, useWriteContract } from "wagmi";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { escrowContract } from "@/lib/contract";

export default function NewEscrowPage() {
  const router = useRouter();
  const { isConnected } = useAccount();
  const { authed } = useAuth();
  const { writeContractAsync } = useWriteContract();

  const [freelancer, setFreelancer] = useState("");
  const [arbitrator, setArbitrator] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createEscrow() {
    setError(null);
    setBusy(true);
    try {
      const hash = await writeContractAsync({
        ...escrowContract,
        functionName: "createEscrow",
        args: [freelancer, arbitrator],
      });
      const created = await api.createEscrow(hash);
      router.push(`/escrows/${created.onChainId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create escrow");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-header">
        <h1 className="page-title">New escrow</h1>
        <p className="page-subtitle">
          Deploys a new escrow on the smart contract with you as the client. You'll add milestones and deposit funds
          on the next screen.
        </p>
      </div>

      {(!isConnected || !authed) && (
        <div className="callout info">Connect and sign in with your wallet (see header) before creating an escrow.</div>
      )}

      <div className="card" style={{ maxWidth: 480 }}>
        <p className="card-title">Participants</p>
        <div className="field">
          <label>Freelancer address</label>
          <input value={freelancer} onChange={(e) => setFreelancer(e.target.value)} placeholder="0x..." />
        </div>
        <div className="field">
          <label>Arbitrator address</label>
          <input value={arbitrator} onChange={(e) => setArbitrator(e.target.value)} placeholder="0x..." />
          <p className="field-hint">Resolves disputes by calling releasePayment (freelancer wins) or refund (client wins).</p>
        </div>
        {error && <div className="error-banner">{error}</div>}
        <button onClick={createEscrow} disabled={busy || !authed || !freelancer || !arbitrator}>
          {busy ? "Creating…" : "Create escrow"}
        </button>
      </div>
    </>
  );
}
