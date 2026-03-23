import { PageTemplate } from "@/components/page-template";
import { managerService } from "@/services";

export default function ManagerPage() {
  return <PageTemplate message={managerService.pageMessage} />;
}
