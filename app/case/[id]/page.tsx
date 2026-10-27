import { Workbench } from "@/components/Workbench";

export default async function CasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <Workbench caseId={decodeURIComponent(id)} />;
}
