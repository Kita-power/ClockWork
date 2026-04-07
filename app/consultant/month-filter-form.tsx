"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";

type MonthOption = {
  value: string;
  label: string;
};

type MonthFilterFormProps = {
  selectedMonth: string;
  availableMonths: MonthOption[];
};

export function MonthFilterForm({
  selectedMonth,
  availableMonths,
}: MonthFilterFormProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const handleMonthChange = (month: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (month) {
      params.set("month", month);
    } else {
      params.delete("month");
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  const clearMonthFilter = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("month");
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  };

  return (
    <div className="flex flex-wrap items-end gap-2">
      <div className="grid gap-1">
        <label className="text-xs font-medium text-muted-foreground" htmlFor="month-filter">
          Filter by month
        </label>
        <select
          id="month-filter"
          name="month"
          value={selectedMonth}
          onChange={(event) => handleMonthChange(event.target.value)}
          className="h-9 w-[220px] rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm"
        >
          <option value="">All months</option>
          {availableMonths.map((month) => (
            <option key={month.value} value={month.value}>
              {month.label}
            </option>
          ))}
        </select>
      </div>
      {selectedMonth ? (
        <Button type="button" variant="ghost" size="sm" onClick={clearMonthFilter}>
          Clear
        </Button>
      ) : null}
    </div>
  );
}
