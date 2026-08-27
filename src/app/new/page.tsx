import { Suspense } from "react";
import { ReviewWizard } from "@/components/review-wizard";

export default function NewReviewPage() {
  return (
    <div className="page-shell">
      <Suspense fallback={<div className="card min-h-32" aria-hidden="true" />}>
        <ReviewWizard />
      </Suspense>
    </div>
  );
}
