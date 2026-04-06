import { Suspense } from "react";
import ManagerTimesheetsContent from "./timesheets-content";

export default function ManagerTimesheetsPage() {
  return (
    <Suspense fallback={<div className="p-4 text-sm text-muted-foreground">Loading…</div>}>
      <ManagerTimesheetsContent />
    </Suspense>
  );
}