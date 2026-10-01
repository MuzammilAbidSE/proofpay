"use client";

import { useCallback, useState } from "react";

/** Shared busy/error bookkeeping around a wallet transaction + backend sync call. */
export function useTxRunner() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async (fn: () => Promise<void>) => {
    setError(null);
    setBusy(true);
    try {
      await fn();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Action failed");
    } finally {
      setBusy(false);
    }
  }, []);

  return { busy, error, run, setError };
}
