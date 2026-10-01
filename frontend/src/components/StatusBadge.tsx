import type { MilestoneStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: MilestoneStatus }) {
  return <span className={`status ${status.toLowerCase()}`}>{status}</span>;
}
