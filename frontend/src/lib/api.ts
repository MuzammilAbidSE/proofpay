import { API_URL } from "./contract";

function authHeaders(): Record<string, string> {
  const token = typeof window !== "undefined" ? window.localStorage.getItem("proofpay_token") : null;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(path: string, options: RequestInit = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders(),
      ...options.headers,
    },
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.message ?? `${path} failed with ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

export const api = {
  // auth
  requestNonce: (address: string) => request("/auth/nonce", { method: "POST", body: JSON.stringify({ address }) }),
  verify: (address: string, signature: string) =>
    request("/auth/verify", { method: "POST", body: JSON.stringify({ address, signature }) }),

  // escrows
  createEscrow: (txHash: string) => request("/escrows", { method: "POST", body: JSON.stringify({ txHash }) }),
  listMyEscrows: () => request("/escrows"),
  getEscrow: (onChainId: number) => request(`/escrows/${onChainId}`),
  listTransactions: (onChainId: number) => request(`/escrows/${onChainId}/transactions`),
  listEvents: (onChainId: number) => request(`/blockchain/events/${onChainId}`),
  listAuditLogs: (onChainId: number) => request(`/escrows/${onChainId}/audit-logs`),

  // milestones
  addMilestone: (onChainId: number, txHash: string) =>
    request(`/escrows/${onChainId}/milestones`, { method: "POST", body: JSON.stringify({ txHash }) }),
  submitMilestone: (milestoneId: string, txHash: string) =>
    request(`/milestones/${milestoneId}/submit`, { method: "POST", body: JSON.stringify({ txHash }) }),
  approveMilestone: (milestoneId: string, txHash: string) =>
    request(`/milestones/${milestoneId}/approve`, { method: "POST", body: JSON.stringify({ txHash }) }),
  disputeMilestone: (milestoneId: string, txHash: string) =>
    request(`/milestones/${milestoneId}/dispute`, { method: "POST", body: JSON.stringify({ txHash }) }),
  releaseMilestone: (milestoneId: string, txHash: string) =>
    request(`/milestones/${milestoneId}/release`, { method: "POST", body: JSON.stringify({ txHash }) }),
  refundMilestone: (milestoneId: string, txHash: string) =>
    request(`/milestones/${milestoneId}/refund`, { method: "POST", body: JSON.stringify({ txHash }) }),

  // disputes
  listDisputes: (escrowId: string) => request(`/disputes/escrows/${escrowId}`),
  submitEvidence: (milestoneId: string, note: string | undefined, fileHash: string | undefined) =>
    request(`/disputes/milestones/${milestoneId}/evidence`, { method: "POST", body: JSON.stringify({ note, fileHash }) }),
};
