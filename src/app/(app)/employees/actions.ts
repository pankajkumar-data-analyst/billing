"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { assertPermission, assertAdmin } from "@/lib/auth/guards";
import { PERMISSIONS, ROLES } from "@/lib/rbac";
import { hashPassword, validatePasswordStrength } from "@/lib/auth/password";
import { toDbString } from "@/lib/money";
import { writeAudit, AUDIT } from "@/lib/auth/audit";
import { z } from "zod";

type ActionState = { error?: string; fieldErrors?: Record<string, string> };

const employeeSchema = z.object({
  name: z.string().trim().min(2, "Name required"),
  employeeCode: z.string().trim().min(1, "Employee code required"),
  phone: z.string().optional(),
  designation: z.string().optional(),
  department: z.string().optional(),
  joiningDate: z.coerce.date().optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]).default("FULL_TIME"),
  monthlySalary: z.coerce.number().nonnegative().optional(),
  bankName: z.string().optional(),
  bankAccount: z.string().optional(),
  bankIfsc: z.string().optional(),
  pan: z.string().optional(),
  address: z.string().optional(),
  emergencyContact: z.string().optional(),
  status: z.enum(["ACTIVE", "INACTIVE", "ON_NOTICE", "EXITED"]).default("ACTIVE"),
  // Optional login account
  createLogin: z.string().optional(),
  email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  password: z.string().optional(),
  roleName: z.enum(["SUPER_ADMIN", "RECRUITER"]).default("RECRUITER"),
});

function flatten(err: z.ZodError) {
  const o: Record<string, string> = {};
  for (const i of err.issues) if (!o[i.path.join(".")]) o[i.path.join(".")] = i.message;
  return o;
}

export async function createEmployee(_prev: ActionState, formData: FormData): Promise<ActionState> {
  // Employee creation requires EMPLOYEE_MANAGE; creating a LOGIN requires admin.
  const admin = await assertPermission(PERMISSIONS.EMPLOYEE_MANAGE);
  const parsed = employeeSchema.safeParse(Object.fromEntries(formData.entries()));
  if (!parsed.success) return { error: "Please fix the highlighted fields.", fieldErrors: flatten(parsed.error) };
  const d = parsed.data;
  const wantsLogin = d.createLogin === "on";

  // Salary is sensitive — only an Admin may set it.
  if (d.monthlySalary != null) await assertAdmin();

  if (wantsLogin) {
    await assertAdmin(); // only Super Admin can provision user accounts (spec §4)
    if (!d.email) return { error: "Email is required to create a login.", fieldErrors: { email: "Required" } };
    const pwdError = d.password ? validatePasswordStrength(d.password) : "Password is required to create a login.";
    if (pwdError) return { error: pwdError, fieldErrors: { password: pwdError } };
    const existing = await prisma.user.findUnique({ where: { email: d.email.toLowerCase() } });
    if (existing) return { error: "A user with that email already exists.", fieldErrors: { email: "Email in use" } };
  }

  const role = wantsLogin
    ? await prisma.role.findUnique({ where: { name: d.roleName } })
    : null;

  const employee = await prisma.employee.create({
    data: {
      name: d.name, employeeCode: d.employeeCode, phone: d.phone, designation: d.designation,
      department: d.department, joiningDate: d.joiningDate, employmentType: d.employmentType,
      monthlySalary: d.monthlySalary != null ? toDbString(d.monthlySalary) : null,
      bankName: d.bankName, bankAccount: d.bankAccount, bankIfsc: d.bankIfsc, pan: d.pan,
      address: d.address, emergencyContact: d.emergencyContact, status: d.status,
      user: wantsLogin && role && d.email && d.password
        ? { create: { email: d.email.toLowerCase(), passwordHash: await hashPassword(d.password), roleId: role.id } }
        : undefined,
    },
  });

  await writeAudit({ userId: admin.id, action: AUDIT.EMPLOYEE_CREATE, entity: "Employee", entityId: employee.id, after: { name: d.name, hasLogin: wantsLogin } });
  revalidatePath("/employees");
  redirect(`/employees/${employee.id}`);
}
