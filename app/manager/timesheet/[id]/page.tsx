import { notFound } from "next/navigation";
import { managerService } from "@/services/manager-service";
import { ManagerTimesheetDetailClient } from "../../manager-timesheet-detail-client";

type ManagerTimesheetDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function ManagerTimesheetDetailPage({
  params,
}: ManagerTimesheetDetailPageProps) {
  const { id } = await params;

  try {
    const timesheet = await managerService.getTimesheetById(id);
    return <ManagerTimesheetDetailClient timesheet={timesheet} />;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load timesheet";
    if (message === "Timesheet not found") {
      notFound();
    }
    throw error;
  }
}
