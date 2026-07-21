import type { ApprovalDecision } from "@fraym-ai/driver";

import { Button } from "./elements/button";
import type { ThreadApproval } from "./thread-state";

export interface ApprovalCardProps {
  approval: ThreadApproval;
  onRespond?: (decision: ApprovalDecision) => void;
}

export function ApprovalCard({ approval, onRespond }: ApprovalCardProps) {
  if (approval.decision !== null) {
    return (
      <div className="fraym-approval fraym-approval--resolved" role="status">
        <span className="fraym-approval__eyebrow">Approval</span>
        <span>{approval.decision}</span>
      </div>
    );
  }

  return (
    <section aria-label="Approval required" className="fraym-approval">
      <span className="fraym-approval__eyebrow">Approval</span>
      <p className="fraym-approval__prompt">{approval.prompt}</p>
      <div className="fraym-approval__actions">
        <Button onClick={() => onRespond?.("rejected")} size="sm" variant="ghost">
          Reject
        </Button>
        <Button onClick={() => onRespond?.("approved")} size="sm" variant="default">
          Approve
        </Button>
      </div>
    </section>
  );
}
