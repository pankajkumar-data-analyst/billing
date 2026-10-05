import { prisma } from "@/lib/prisma";
import { headers } from "next/headers";

/**
 * Audit logging (spec §28). Records sensitive actions with optional
 * before/after snapshots. Writes are best-effort and must never throw into the
 * calling action (an audit failure should not break a legitimate operation),
 * but failures are logged to the server console.
 */

export const AUDIT = {
  LOGIN: "LOGIN",
  LOGOUT: "LOGOUT",
  LOGIN_FAILED: "LOGIN_FAILED",
  INVOICE_CREATE: "INVOICE_CREATE",
  INVOICE_UPDATE: "INVOICE_UPDATE",
  INVOICE_CANCEL: "INVOICE_CANCEL",
  INVOICE_SENT: "INVOICE_SENT",
  PAYMENT_RECORD: "PAYMENT_RECORD",
  PAYMENT_REVERSE: "PAYMENT_REVERSE",
  PAYROLL_GENERATE: "PAYROLL_GENERATE",
  PAYROLL_APPROVE: "PAYROLL_APPROVE",
  PAYROLL_PAID: "PAYROLL_PAID",
  SALARY_UPDATE: "SALARY_UPDATE",
  EMPLOYEE_CREATE: "EMPLOYEE_CREATE",
  EMPLOYEE_UPDATE: "EMPLOYEE_UPDATE",
  USER_CREATE: "USER_CREATE",
  USER_UPDATE: "USER_UPDATE",
  ROLE_CHANGE: "ROLE_CHANGE",
  ATTENDANCE_CORRECTION: "ATTENDANCE_CORRECTION",
  LEAVE_DECISION: "LEAVE_DECISION",
  CLIENT_CREATE: "CLIENT_CREATE",
  CLIENT_UPDATE: "CLIENT_UPDATE",
  PLACEMENT_CREATE: "PLACEMENT_CREATE",
  PLACEMENT_UPDATE: "PLACEMENT_UPDATE",
  SETTINGS_UPDATE: "SETTINGS_UPDATE",
} as const;

export type AuditAction = (typeof AUDIT)[keyof typeof AUDIT];

interface AuditParams {
  userId?: string | null;
  action: AuditAction | string;
  entity?: string;
  entityId?: string;
  before?: unknown;
  after?: unknown;
}

export async function writeAudit(params: AuditParams): Promise<void> {
  try {
    let ip: string | undefined;
    let userAgent: string | undefined;
    try {
      const h = headers();
      ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? undefined;
      userAgent = h.get("user-agent") ?? undefined;
    } catch {
      // headers() only available in request scope; ignore otherwise.
    }
    await prisma.auditLog.create({
      data: {
        userId: params.userId ?? undefined,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        before: params.before === undefined ? undefined : (params.before as object),
        after: params.after === undefined ? undefined : (params.after as object),
        ip,
        userAgent,
      },
    });
  } catch (err) {
    console.error("[audit] failed to write audit log:", err);
  }
}
