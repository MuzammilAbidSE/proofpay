"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { hashText } from "@/lib/hash";
import { useAuth } from "@/lib/auth-context";
import type { Dispute, Escrow } from "@/lib/types";

export function DisputesTab({ escrow }: { escrow: Escrow }) {
  const { authed } = useAuth();
  const queryClient = useQueryClient();

  const { data: disputes, isLoading, error } = useQuery<Dispute[]>({
    queryKey: ["disputes", escrow.id],
    queryFn: () => api.listDisputes(escrow.id),
  });

  const disputedMilestones = escrow.milestones.filter((m) => m.status === "DISPUTED");

  const [milestoneId, setMilestoneId] = useState("");
  const [note, setNote] = useState("");
  const [evidenceText, setEvidenceText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  async function submitEvidence() {
    if (!milestoneId) return;
    setSubmitError(null);
    setSubmitting(true);
    try {
      const fileHash = evidenceText ? await hashText(evidenceText) : undefined;
      await api.submitEvidence(milestoneId, note || undefined, fileHash);
      setNote("");
      setEvidenceText("");
      queryClient.invalidateQueries({ queryKey: ["disputes", escrow.id] });
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Failed to submit evidence");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <>
      {disputedMilestones.length === 0 && (!disputes || disputes.length === 0) && (
        <div className="empty-state">
          No disputes on this escrow. Open one from the Milestones tab if there's a disagreement over a submitted or
          approved milestone.
        </div>
      )}

      {disputedMilestones.length > 0 && (
        <div className="card">
          <p className="card-title">Submit evidence</p>
          <div className="field">
            <label>Milestone</label>
            <select value={milestoneId} onChange={(e) => setMilestoneId(e.target.value)}>
              <option value="">Select a disputed milestone…</option>
              {disputedMilestones.map((m) => (
                <option key={m.id} value={m.id}>
                  Milestone #{m.onChainId}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Note</label>
            <textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Explain your side of the dispute…" />
          </div>
          <div className="field">
            <label>Evidence content to hash (optional — proves you held this content, without uploading it)</label>
            <input value={evidenceText} onChange={(e) => setEvidenceText(e.target.value)} placeholder="e.g. delivery-log.txt contents" />
          </div>
          {submitError && <div className="error-banner">{submitError}</div>}
          <button onClick={submitEvidence} disabled={!authed || !milestoneId || submitting || (!note && !evidenceText)}>
            {submitting ? "Submitting…" : "Submit evidence"}
          </button>
          {!authed && <p className="field-hint">Sign in from the header to submit evidence.</p>}
        </div>
      )}

      {isLoading && <div className="empty-state">Loading disputes…</div>}
      {error && <div className="error-banner">{error instanceof Error ? error.message : "Failed to load disputes"}</div>}

      {disputes?.map((dispute) => (
        <div key={dispute.id} className="card">
          <p className="card-title">
            Dispute — Milestone #{dispute.milestone.onChainId}
            {dispute.resolution && (
              <span className={`status ${dispute.resolution === "RELEASED_TO_FREELANCER" ? "released" : "refunded"}`}>
                {dispute.resolution === "RELEASED_TO_FREELANCER" ? "Resolved: released" : "Resolved: refunded"}
              </span>
            )}
          </p>
          <p className="text-muted text-small">
            Opened by <span className="mono">{dispute.openedByAddr}</span>
          </p>
          <hr className="divider" />
          {dispute.evidence.length === 0 && <p className="text-faint text-small">No evidence submitted yet.</p>}
          {dispute.evidence.map((e) => (
            <div key={e.id} className="list-row" style={{ display: "block" }}>
              <p className="text-small" style={{ margin: "0 0 4px" }}>
                <span className="mono">{e.submittedByAddr}</span> <span className="text-faint">{new Date(e.createdAt).toLocaleString()}</span>
              </p>
              {e.note && <p style={{ margin: "0 0 4px" }}>{e.note}</p>}
              {e.fileHash && <p className="mono text-faint">{e.fileHash}</p>}
            </div>
          ))}
        </div>
      ))}

      {disputedMilestones.length > 0 && (
        <div className="callout warn">
          The arbitrator resolves a dispute from the Milestones tab — release pays the freelancer, refund returns
          funds to the client.
        </div>
      )}
    </>
  );
}
