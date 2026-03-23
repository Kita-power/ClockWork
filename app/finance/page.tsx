import { PageTemplate } from "@/components/page-template";
import { financeService } from "@/services";

export default function FinancePage() {
  return <PageTemplate message={financeService.pageMessage} />;
}
