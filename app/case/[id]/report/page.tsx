import { Report } from "@/components/Report";

export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Report caseId={decodeURIComponent(id)} />;
}
