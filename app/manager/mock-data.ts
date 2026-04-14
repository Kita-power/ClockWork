export type TimesheetEntry = {
  dayLabel: string;
  date: string;
  hours: number;
  description: string;
};

export type ManagerTimesheetSummary = {
  id: string;
  consultantName: string;
  projectName?: string;
  projectCode: string;
  weekStart: string;
  weekEnd: string;
  totalHours: number;
  status:
    | "Overdue"
    | "Submitted"
    | "Submitted Late"
    | "Approved"
    | "Approved Late"
    | "Rejected"
    | "Processed";
  submittedAt: string;
  entries?: TimesheetEntry[];
};

export type ManagerLeaveRequestSummary = {
  id: string;
  consultantName: string;
  leaveType: "Annual Leave" | "Sick Leave" | "Unpaid Leave" | "Other";
  startDate: string;
  endDate: string;
  durationDays: number;
  status: "Pending" | "Approved" | "Rejected";
  submittedAt: string;
};

export const managerMockTimesheets: ManagerTimesheetSummary[] = [
  {
    id: "TS-1001",
    consultantName: "Jane Doe",
    projectCode: "PROJ-ALPHA",
    weekStart: "2026-03-23",
    weekEnd: "2026-03-29",
    totalHours: 40,
    status: "Submitted",
    submittedAt: "2026-03-29T17:12:00Z",
    entries: [],
  },
  {
    id: "TS-1002",
    consultantName: "Sam Lee",
    projectCode: "PROJ-BETA",
    weekStart: "2026-03-23",
    weekEnd: "2026-03-29",
    totalHours: 37.5,
    status: "Submitted Late",
    submittedAt: "2026-03-30T09:05:00Z",
    entries: [],
  },
  {
    id: "TS-1003",
    consultantName: "Amina Khan",
    projectCode: "PROJ-GAMMA",
    weekStart: "2026-03-16",
    weekEnd: "2026-03-22",
    totalHours: 40,
    status: "Overdue",
    submittedAt: "2026-03-23T10:00:00Z",
    entries: [],
  },
  {
    id: "TS-1004",
    consultantName: "Chris Park",
    projectCode: "PROJ-ALPHA",
    weekStart: "2026-03-16",
    weekEnd: "2026-03-22",
    totalHours: 40,
    status: "Approved",
    submittedAt: "2026-03-22T17:30:00Z",
    entries: [],
  },
  {
    id: "TS-1005",
    consultantName: "Nora Ali",
    projectCode: "PROJ-DELTA",
    weekStart: "2026-03-09",
    weekEnd: "2026-03-15",
    totalHours: 39,
    status: "Approved Late",
    submittedAt: "2026-03-16T09:15:00Z",
    entries: [],
  },
  {
    id: "TS-1006",
    consultantName: "Leo Rivera",
    projectCode: "PROJ-BETA",
    weekStart: "2026-03-09",
    weekEnd: "2026-03-15",
    totalHours: 36,
    status: "Rejected",
    submittedAt: "2026-03-15T18:00:00Z",
    entries: [],
  },
  {
    id: "TS-1007",
    consultantName: "Maya Chen",
    projectCode: "PROJ-GAMMA",
    weekStart: "2026-03-02",
    weekEnd: "2026-03-08",
    totalHours: 40,
    status: "Processed",
    submittedAt: "2026-03-08T16:45:00Z",
    entries: [],
  },
];

export const managerMockLeaveRequests: ManagerLeaveRequestSummary[] = [
  {
    id: "LR-2001",
    consultantName: "Jane Doe",
    leaveType: "Annual Leave",
    startDate: "2026-04-10",
    endDate: "2026-04-12",
    durationDays: 3,
    status: "Pending",
    submittedAt: "2026-04-01T08:30:00Z",
  },
  {
    id: "LR-2002",
    consultantName: "Sam Lee",
    leaveType: "Sick Leave",
    startDate: "2026-04-03",
    endDate: "2026-04-04",
    durationDays: 2,
    status: "Approved",
    submittedAt: "2026-04-01T09:15:00Z",
  },
  {
    id: "LR-2003",
    consultantName: "Amina Khan",
    leaveType: "Unpaid Leave",
    startDate: "2026-04-20",
    endDate: "2026-04-22",
    durationDays: 3,
    status: "Rejected",
    submittedAt: "2026-04-01T10:00:00Z",
  },
  {
    id: "LR-2004",
    consultantName: "Chris Park",
    leaveType: "Other",
    startDate: "2026-04-15",
    endDate: "2026-04-15",
    durationDays: 1,
    status: "Pending",
    submittedAt: "2026-04-01T11:00:00Z",
  },
];