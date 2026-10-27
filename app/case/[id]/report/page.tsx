import { Report } from "@/components/Report";
import { SAMPLE_CASE_ID } from "@/lib/caseOps";

export function generateStaticParams() {
  return [{ id: SAMPLE_CASE_ID }];
}

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Report caseId={decodeURIComponent(id)} />;
}
