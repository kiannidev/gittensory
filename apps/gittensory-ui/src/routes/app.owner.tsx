import { createFileRoute } from "@tanstack/react-router";

import { OwnerPanel } from "@/components/site/app-panels/owner-panel";
import { PageHeader } from "@/components/site/primitives";

export const Route = createFileRoute("/app/owner")({
  component: OwnerRoute,
});

function OwnerRoute() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Owner"
        title="Registration workspace"
        description="Guided registration workflow with bucketed remediation for policy, data quality, queue health, docs, and maintainer capacity."
      />
      <OwnerPanel />
    </div>
  );
}
