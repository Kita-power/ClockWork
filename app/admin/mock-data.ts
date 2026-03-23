export const managedUsers = [
  {
    name: "Amelia Rogers",
    email: "amelia.rogers@clockwork.io",
    role: "Administrator",
    status: "Active",
  },
  {
    name: "Tyson Shah",
    email: "tyson.shah@clockwork.io",
    role: "Manager",
    status: "Active",
  },
  {
    name: "Leah Chen",
    email: "leah.chen@clockwork.io",
    role: "Consultant",
    status: "Active",
  },
  {
    name: "Eric Voss",
    email: "eric.voss@clockwork.io",
    role: "Finance",
    status: "Deactivated",
  },
];

export const projects = [
  {
    name: "Northwind Audit Refresh",
    identifier: "PRJ-2407-NWR",
    tasks: 12,
    assigned: "2 Managers / 5 Consultants",
    status: "Active",
  },
  {
    name: "Morrison ERP Controls",
    identifier: "PRJ-2411-MEC",
    tasks: 8,
    assigned: "1 Manager / 3 Consultants",
    status: "Planning",
  },
  {
    name: "Helios Year-End Close",
    identifier: "PRJ-2501-HYC",
    tasks: 16,
    assigned: "2 Managers / 7 Consultants",
    status: "Deactivated",
  },
];

export const auditRows = [
  {
    actor: "Amelia Rogers",
    action: "Role Assignment",
    target: "Leah Chen -> Consultant",
    timestamp: "2026-03-23 09:15",
    details: "Role updated from Manager to Consultant",
  },
  {
    actor: "Tyson Shah",
    action: "Timesheet Approval",
    target: "Week 12 / Project PRJ-2407-NWR",
    timestamp: "2026-03-22 17:42",
    details: "Approved 14.5 hours",
  },
  {
    actor: "Finance Bot",
    action: "Finance Processing",
    target: "Timesheet Batch #89",
    timestamp: "2026-03-22 18:05",
    details: "Processed on time (SLA: 4 business days)",
  },
  {
    actor: "Tyson Shah",
    action: "Timesheet Rejection",
    target: "Week 12 / Project PRJ-2411-MEC",
    timestamp: "2026-03-21 11:24",
    details: "Rejected: missing task comments",
  },
];

export const actionTypeFilters = [
  "All Actions",
  "Account Changes",
  "Project Changes",
  "Role Assignments",
  "Timesheet Submission",
  "Timesheet Approval",
  "Timesheet Rejection",
  "Timesheet Export",
  "Finance Processing",
];
