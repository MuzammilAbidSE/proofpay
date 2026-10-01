"use client";

import { useState } from "react";
import { hashFile, hashText } from "@/lib/hash";

/**
 * Spec section 6: the contract only ever stores a hash, never the file. To verify
 * delivery, re-hash a later download (or paste the same text) and compare it here —
 * entirely client-side, nothing is uploaded anywhere.
 */
export function ProofVerifier({ proofHash }: { proofHash: string }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [computed, setComputed] = useState<string | null>(null);

  async function verifyText() {
    setComputed(await hashText(text));
  }

  async function verifyFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setComputed(await hashFile(file));
  }

  const match = computed !== null && computed.toLowerCase() === proofHash.toLowerCase();

  if (!open) {
    return (
      <button className="link small" onClick={() => setOpen(true)}>
        Verify proof-of-delivery
      </button>
    );
  }

  return (
    <div className="verify-box">
      <label>Paste the same content, or pick the downloaded file, to re-hash and compare</label>
      <input value={text} onChange={(e) => setText(e.target.value)} placeholder="delivered-work.zip" />
      <div className="button-row">
        <button className="small" onClick={verifyText} disabled={!text}>
          Hash text
        </button>
        <input type="file" onChange={verifyFile} style={{ width: "auto" }} />
      </div>
      {computed && (
        <>
          <p className="mono text-faint" style={{ marginTop: 8 }}>
            computed: {computed}
          </p>
          <p className={`verify-result ${match ? "match" : "mismatch"}`}>
            {match ? "Match — content is untampered" : "Mismatch — this does not match the recorded proof"}
          </p>
        </>
      )}
    </div>
  );
}
