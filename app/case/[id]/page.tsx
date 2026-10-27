import { Workbench } from "@/components/Workbench";
import { SAMPLE_CASE_ID } from "@/lib/caseOps";

/** Static export needs the known case routes up front; imported cases are handled by app/not-found.tsx. */
export function generateStaticParams() {
  return [{ id: SAMPLE_CASE_ID }];
}

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Workbench caseId={decodeURIComponent(id)} />;
}
