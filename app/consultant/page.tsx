import { PageTemplate } from "@/components/page-template";
import { consultantService } from "@/services";

export default function ConsultantPage() {
  return <PageTemplate message={consultantService.pageMessage} />;
}
