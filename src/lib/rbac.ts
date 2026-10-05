/**
 * RBAC catalog.
 *
 * Permissions are table-driven (stored in `permissions` + `role_permissions`),
 * but the canonical list of permission KEYS and the two seed roles live here so
 * code can reference them type-safely. Adding a granular role later is just a
 * matter of seeding a new Role with a subset of these keys — no code changes to
 * the authorization layer.
 *
 * SECURITY: these keys are enforced server-side on every mutation/read of
 * sensitive data (see lib/auth/guards.ts). Frontend hiding is cosmetic only.
 */

export const PERMISSIONS = {
  // Dashboard / finance visibility
  DASHBOARD_ADMIN_VIEW: "dashboard.admin.view", // company-wide KPIs, revenue, profit
  DASHBOARD_SELF_VIEW: "dashboard.self.view", // personal dashboard only

  // Clients
  CLIENT_VIEW: "client.view",
  CLIENT_MANAGE: "client.manage",

  // Jobs
  JOB_VIEW: "job.view",
  JOB_VIEW_ASSIGNED: "job.view.assigned",
  JOB_MANAGE: "job.manage",

  // Candidates
  CANDIDATE_VIEW: "candidate.view",
  CANDIDATE_MANAGE: "candidate.manage",

  // Placements
  PLACEMENT_VIEW: "placement.view",
  PLACEMENT_MANAGE: "placement.manage",

  // Invoices (Admin-only in Phase 1)
  INVOICE_VIEW: "invoice.view",
  INVOICE_CREATE: "invoice.create",
  INVOICE_MANAGE: "invoice.manage", // edit, send, cancel
  INVOICE_NUMBERING: "invoice.numbering", // change numbering config

  // Payments (Admin-only)
  PAYMENT_VIEW: "payment.view",
  PAYMENT_MANAGE: "payment.manage",

  // Expenses (Admin-only)
  EXPENSE_VIEW: "expense.view",
  EXPENSE_MANAGE: "expense.manage",

  // Employees / HR
  EMPLOYEE_VIEW: "employee.view",
  EMPLOYEE_MANAGE: "employee.manage",
  SALARY_VIEW: "salary.view", // view any employee salary (Admin)
  SALARY_MANAGE: "salary.manage", // edit salary (Admin)

  // Attendance
  ATTENDANCE_SELF: "attendance.self", // clock in/out, view own
  ATTENDANCE_MANAGE: "attendance.manage", // view all, approve corrections

  // Leave
  LEAVE_SELF: "leave.self", // apply/cancel own
  LEAVE_MANAGE: "leave.manage", // approve/reject

  // Payroll (Admin-only)
  PAYROLL_VIEW: "payroll.view",
  PAYROLL_PROCESS: "payroll.process",
  PAYSLIP_SELF_VIEW: "payslip.self.view", // view own payslips

  // Reports (financial exports Admin-only)
  REPORT_VIEW: "report.view",
  REPORT_EXPORT_FINANCIAL: "report.export.financial",

  // Documents
  DOCUMENT_VIEW: "document.view",
  DOCUMENT_MANAGE: "document.manage",

  // Admin-only system
  SETTINGS_MANAGE: "settings.manage",
  USER_MANAGE: "user.manage",
  ROLE_MANAGE: "role.manage",
  AUDIT_VIEW: "audit.view",
} as const;

export type PermissionKey = (typeof PERMISSIONS)[keyof typeof PERMISSIONS];

export const ROLES = {
  SUPER_ADMIN: "SUPER_ADMIN",
  RECRUITER: "RECRUITER",
} as const;

export type RoleName = (typeof ROLES)[keyof typeof ROLES];

/** Every permission — Super Admin gets all of these. */
export const ALL_PERMISSIONS: PermissionKey[] = Object.values(PERMISSIONS);

/**
 * Recruiter/employee permission set. Deliberately excludes:
 * company-wide financials, salaries, payroll processing, settings, users,
 * audit logs, invoice/payment/expense management.
 */
export const RECRUITER_PERMISSIONS: PermissionKey[] = [
  PERMISSIONS.DASHBOARD_SELF_VIEW,
  PERMISSIONS.CLIENT_VIEW, // assigned clients only (scoped in queries)
  PERMISSIONS.JOB_VIEW_ASSIGNED,
  PERMISSIONS.CANDIDATE_VIEW,
  PERMISSIONS.CANDIDATE_MANAGE,
  PERMISSIONS.PLACEMENT_VIEW,
  PERMISSIONS.ATTENDANCE_SELF,
  PERMISSIONS.LEAVE_SELF,
  PERMISSIONS.PAYSLIP_SELF_VIEW,
  PERMISSIONS.DOCUMENT_VIEW,
];

export const ROLE_PERMISSION_MAP: Record<RoleName, PermissionKey[]> = {
  SUPER_ADMIN: ALL_PERMISSIONS,
  RECRUITER: RECRUITER_PERMISSIONS,
};

/** Human-readable descriptions for seeding the permissions table. */
export const PERMISSION_DESCRIPTIONS: Record<string, string> = {
  [PERMISSIONS.DASHBOARD_ADMIN_VIEW]: "View company-wide dashboard and financials",
  [PERMISSIONS.DASHBOARD_SELF_VIEW]: "View personal dashboard",
  [PERMISSIONS.CLIENT_VIEW]: "View clients",
  [PERMISSIONS.CLIENT_MANAGE]: "Create/edit clients and terms",
  [PERMISSIONS.JOB_VIEW]: "View all jobs",
  [PERMISSIONS.JOB_VIEW_ASSIGNED]: "View assigned jobs",
  [PERMISSIONS.JOB_MANAGE]: "Create/edit jobs",
  [PERMISSIONS.CANDIDATE_VIEW]: "View candidates",
  [PERMISSIONS.CANDIDATE_MANAGE]: "Create/edit candidates and pipeline",
  [PERMISSIONS.PLACEMENT_VIEW]: "View placements",
  [PERMISSIONS.PLACEMENT_MANAGE]: "Create/edit placements",
  [PERMISSIONS.INVOICE_VIEW]: "View invoices",
  [PERMISSIONS.INVOICE_CREATE]: "Create invoices",
  [PERMISSIONS.INVOICE_MANAGE]: "Edit/send/cancel invoices",
  [PERMISSIONS.INVOICE_NUMBERING]: "Change invoice numbering",
  [PERMISSIONS.PAYMENT_VIEW]: "View payments",
  [PERMISSIONS.PAYMENT_MANAGE]: "Record/reverse payments",
  [PERMISSIONS.EXPENSE_VIEW]: "View expenses",
  [PERMISSIONS.EXPENSE_MANAGE]: "Manage expenses",
  [PERMISSIONS.EMPLOYEE_VIEW]: "View employees",
  [PERMISSIONS.EMPLOYEE_MANAGE]: "Create/edit employees",
  [PERMISSIONS.SALARY_VIEW]: "View employee salaries",
  [PERMISSIONS.SALARY_MANAGE]: "Edit employee salaries",
  [PERMISSIONS.ATTENDANCE_SELF]: "Clock in/out and view own attendance",
  [PERMISSIONS.ATTENDANCE_MANAGE]: "Manage all attendance",
  [PERMISSIONS.LEAVE_SELF]: "Apply/cancel own leave",
  [PERMISSIONS.LEAVE_MANAGE]: "Approve/reject leave",
  [PERMISSIONS.PAYROLL_VIEW]: "View payroll",
  [PERMISSIONS.PAYROLL_PROCESS]: "Process payroll",
  [PERMISSIONS.PAYSLIP_SELF_VIEW]: "View own payslips",
  [PERMISSIONS.REPORT_VIEW]: "View reports",
  [PERMISSIONS.REPORT_EXPORT_FINANCIAL]: "Export financial reports",
  [PERMISSIONS.DOCUMENT_VIEW]: "View documents",
  [PERMISSIONS.DOCUMENT_MANAGE]: "Upload/manage documents",
  [PERMISSIONS.SETTINGS_MANAGE]: "Manage company settings",
  [PERMISSIONS.USER_MANAGE]: "Manage users",
  [PERMISSIONS.ROLE_MANAGE]: "Manage roles",
  [PERMISSIONS.AUDIT_VIEW]: "View audit logs",
};
