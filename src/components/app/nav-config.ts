import { PERMISSIONS, type PermissionKey } from "@/lib/rbac";
import {
  LayoutDashboard,
  Building2,
  Briefcase,
  Users,
  UserCheck,
  FileText,
  Wallet,
  Receipt,
  Contact,
  CalendarClock,
  CalendarOff,
  Banknote,
  BarChart3,
  FolderLock,
  Settings,
  UserCircle,
  type LucideIcon,
} from "lucide-react";

/**
 * Sidebar navigation. Each item declares the permission(s) that reveal it.
 * The sidebar hides items the user can't use — but this is cosmetic; the
 * destination pages still enforce authorization server-side.
 */
export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  /** Visible if the user has ANY of these permissions. */
  anyOf: PermissionKey[];
}

export const NAV_ITEMS: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, anyOf: [PERMISSIONS.DASHBOARD_ADMIN_VIEW, PERMISSIONS.DASHBOARD_SELF_VIEW] },
  { label: "Clients", href: "/clients", icon: Building2, anyOf: [PERMISSIONS.CLIENT_VIEW] },
  { label: "Jobs", href: "/jobs", icon: Briefcase, anyOf: [PERMISSIONS.JOB_VIEW, PERMISSIONS.JOB_VIEW_ASSIGNED] },
  { label: "Candidates", href: "/candidates", icon: Users, anyOf: [PERMISSIONS.CANDIDATE_VIEW] },
  { label: "Placements", href: "/placements", icon: UserCheck, anyOf: [PERMISSIONS.PLACEMENT_VIEW] },
  { label: "Invoices", href: "/invoices", icon: FileText, anyOf: [PERMISSIONS.INVOICE_VIEW] },
  { label: "Payments", href: "/payments", icon: Wallet, anyOf: [PERMISSIONS.PAYMENT_VIEW] },
  { label: "Expenses", href: "/expenses", icon: Receipt, anyOf: [PERMISSIONS.EXPENSE_VIEW] },
  { label: "Employees", href: "/employees", icon: Contact, anyOf: [PERMISSIONS.EMPLOYEE_VIEW] },
  { label: "Attendance", href: "/attendance", icon: CalendarClock, anyOf: [PERMISSIONS.ATTENDANCE_SELF, PERMISSIONS.ATTENDANCE_MANAGE] },
  { label: "Leave", href: "/leave", icon: CalendarOff, anyOf: [PERMISSIONS.LEAVE_SELF, PERMISSIONS.LEAVE_MANAGE] },
  { label: "Payroll", href: "/payroll", icon: Banknote, anyOf: [PERMISSIONS.PAYROLL_VIEW, PERMISSIONS.PAYSLIP_SELF_VIEW] },
  { label: "Reports", href: "/reports", icon: BarChart3, anyOf: [PERMISSIONS.REPORT_VIEW] },
  { label: "Documents", href: "/documents", icon: FolderLock, anyOf: [PERMISSIONS.DOCUMENT_VIEW] },
  { label: "Settings", href: "/settings", icon: Settings, anyOf: [PERMISSIONS.SETTINGS_MANAGE] },
  { label: "My Profile", href: "/profile", icon: UserCircle, anyOf: [PERMISSIONS.DASHBOARD_SELF_VIEW, PERMISSIONS.DASHBOARD_ADMIN_VIEW] },
];

export function visibleNav(permissions: string[]): NavItem[] {
  return NAV_ITEMS.filter((item) => item.anyOf.some((p) => permissions.includes(p)));
}
