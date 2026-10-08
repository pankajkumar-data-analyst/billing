/**
 * Seed script (spec §51). Creates:
 *  - Roles + permissions (always; idempotent)
 *  - Company settings singleton
 *  - Bootstrap Super Admin (from SEED_ADMIN_* env)
 *  - DEMO DATA (only when SEED_DEMO=1): 3 employees, 5 clients, 5 jobs,
 *    15 candidates, 5 placements, 5 invoices, payments, attendance, payroll.
 *
 * ALL demo data is fictional. No real candidate/client/employee information.
 * Demo clients are named "DEMO ..." so they are easy to spot and delete.
 */
import { PrismaClient, Prisma } from "@prisma/client";
import argon2 from "argon2";
import { Decimal } from "decimal.js";
import {
  ALL_PERMISSIONS, RECRUITER_PERMISSIONS, PERMISSION_DESCRIPTIONS, ROLES,
} from "../src/lib/rbac";

const prisma = new PrismaClient();

async function hash(pw: string) {
  return argon2.hash(pw, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });
}

function money(n: number): Prisma.Decimal {
  return new Prisma.Decimal(new Decimal(n).toFixed(2));
}

async function seedRolesAndPermissions() {
  // Permissions
  for (const key of ALL_PERMISSIONS) {
    await prisma.permission.upsert({
      where: { key },
      update: { description: PERMISSION_DESCRIPTIONS[key] },
      create: { key, description: PERMISSION_DESCRIPTIONS[key] },
    });
  }
  const allPerms = await prisma.permission.findMany();
  const byKey = new Map(allPerms.map((p) => [p.key, p.id]));

  const admin = await prisma.role.upsert({
    where: { name: ROLES.SUPER_ADMIN },
    update: {},
    create: { name: ROLES.SUPER_ADMIN, description: "Owner — full access", isSystem: true },
  });
  const recruiter = await prisma.role.upsert({
    where: { name: ROLES.RECRUITER },
    update: {},
    create: { name: ROLES.RECRUITER, description: "Recruiter / Employee", isSystem: true },
  });

  // Admin gets all permissions
  for (const key of ALL_PERMISSIONS) {
    const pid = byKey.get(key)!;
    await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: admin.id, permissionId: pid } }, update: {}, create: { roleId: admin.id, permissionId: pid } });
  }
  // Recruiter gets the restricted subset
  for (const key of RECRUITER_PERMISSIONS) {
    const pid = byKey.get(key)!;
    await prisma.rolePermission.upsert({ where: { roleId_permissionId: { roleId: recruiter.id, permissionId: pid } }, update: {}, create: { roleId: recruiter.id, permissionId: pid } });
  }
  return { admin, recruiter };
}

async function seedSettings() {
  await prisma.companySettings.upsert({
    where: { id: "singleton" },
    update: {},
    create: {
      id: "singleton",
      companyName: "One2Infinite Recruitment Solutions",
      address: "[Add your office address in Settings]",
      phone: "[Add phone]",
      email: "[Add email]",
      website: "https://one2infinite.com",
      bankName: "[Add bank name]",
      bankAccount: "[Add account number]",
      bankIfsc: "[Add IFSC]",
      upiId: "[Add UPI]",
      invoicePrefix: "OI",
      nextInvoiceSeq: 1,
      invoiceSeqPadding: 4,
      gstEnabled: false,
      gstRate: money(18),
      defaultPaymentDays: 15,
      defaultReplacementDays: 90,
      defaultFeePercent: new Prisma.Decimal("8.33"),
      invoiceFooter: "Thank you for your business.",
      invoiceEmailTemplate:
        "Dear [Client Name],\n\nPlease find attached our recruitment invoice for the successful placement of [Candidate Name] for the position of [Job Title].\n\nInvoice No: [Invoice Number]\nAmount: [Amount]\nDue Date: [Due Date]\n\nKindly process the payment as per the agreed terms.\n\nRegards,\nOne2Infinite Recruitment Solutions",
      officeStartTime: "10:00",
      officeEndTime: "18:00",
      graceMinutes: 15,
      halfDayHours: money(4),
      fullDayHours: money(7),
      workingDaysPerWeek: 5,
      weeklyOff: "Sat,Sun",
    },
  });
}

async function seedAdmin(adminRoleId: string) {
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@one2infinite.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "ChangeMe!2026";
  const name = process.env.SEED_ADMIN_NAME ?? "Owner";

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    console.log(`Admin ${email} already exists — skipping.`);
    return;
  }
  // The User<->Employee relation is owned by Employee (employee.userId),
  // so create the User first, then the Employee linked to it.
  const user = await prisma.user.create({
    data: { email, passwordHash: await hash(password), roleId: adminRoleId },
  });
  await prisma.employee.create({
    data: {
      name, employeeCode: "OI-001", designation: "Founder / Owner", department: "Management",
      status: "ACTIVE", joiningDate: new Date("2024-01-01"), userId: user.id,
    },
  });
  console.log(`Created Super Admin: ${email} (password from SEED_ADMIN_PASSWORD).`);
}

async function seedDemo(recruiterRoleId: string) {
  if (process.env.SEED_DEMO !== "1") {
    console.log("SEED_DEMO != 1 — skipping demo data.");
    return;
  }
  if (await prisma.client.findFirst({ where: { name: { startsWith: "DEMO" } } })) {
    console.log("Demo data already present — skipping.");
    return;
  }
  console.log("Seeding DEMO data (fictional)…");

  // 3 employees (2 recruiters with logins + the admin already created)
  const recNames = ["Demo Recruiter A", "Demo Recruiter B"];
  const recruiters = [];
  for (let i = 0; i < recNames.length; i++) {
    const emp = await prisma.employee.create({
      data: {
        name: recNames[i], employeeCode: `OI-10${i + 1}`, designation: "Recruiter", department: "Recruitment",
        status: "ACTIVE", joiningDate: new Date("2025-04-01"), monthlySalary: money(25000 + i * 5000),
        user: { create: { email: `recruiter${i + 1}@one2infinite.demo`, passwordHash: await hash("DemoPass!2026"), roleId: recruiterRoleId } },
      },
    });
    recruiters.push(emp);
  }

  // 5 clients with varied fee terms
  const clientSpecs = [
    { name: "DEMO ABC Pvt Ltd", feeType: "PERCENT" as const, percent: 6, city: "Gurugram" },
    { name: "DEMO Zenith Tech", feeType: "FIXED" as const, fixed: 15000, city: "Noida" },
    { name: "DEMO Orbit Logistics", feeType: "PERCENT" as const, percent: 8.33, city: "Delhi" },
    { name: "DEMO Nova Finance", feeType: "PERCENT" as const, percent: 7, city: "Faridabad" },
    { name: "DEMO Peak Retail", feeType: "FIXED" as const, fixed: 12000, city: "Delhi" },
  ];
  const clients = [];
  for (const c of clientSpecs) {
    const client = await prisma.client.create({
      data: {
        name: c.name, status: "ACTIVE", industry: "Various", city: c.city, state: "Delhi NCR",
        billingAddress: `${c.city}, Delhi NCR`,
        contacts: { create: { name: "Demo Contact", designation: "HR Manager", email: "hr@example.com", phone: "+91-90000-00000", isPrimary: true } },
        terms: {
          create: {
            feeType: c.feeType,
            percent: c.feeType === "PERCENT" ? new Prisma.Decimal(String(c.percent)) : null,
            fixedAmount: c.feeType === "FIXED" ? money(c.fixed!) : null,
            paymentDueDays: 15, replacementDays: c.name.includes("ABC") ? 30 : 90,
          },
        },
      },
      include: { terms: true },
    });
    clients.push(client);
  }

  // 5 jobs
  const jobTitles = ["Data Analyst", "Backend Engineer", "Operations Lead", "Finance Executive", "Store Manager"];
  const jobs = [];
  for (let i = 0; i < 5; i++) {
    const job = await prisma.job.create({
      data: {
        clientId: clients[i].id, title: jobTitles[i], location: clients[i].city, openings: 2,
        salaryMin: money(500000), salaryMax: money(700000), expMin: 2, expMax: 5,
        recruiterId: recruiters[i % recruiters.length].id, status: "ACTIVE", priority: "HIGH",
      },
    });
    jobs.push(job);
  }

  // 15 candidates
  const candidates = [];
  for (let i = 0; i < 15; i++) {
    const cand = await prisma.candidate.create({
      data: {
        fullName: `Demo Candidate ${i + 1}`, mobile: `+91-9${String(100000000 + i).slice(0, 9)}`,
        email: `candidate${i + 1}@example.com`, location: "Delhi NCR",
        currentCompany: "Demo Corp", currentDesignation: "Associate",
        totalExperience: new Prisma.Decimal(String(2 + (i % 5))), currentCtc: money(400000 + i * 20000),
        expectedCtc: money(600000 + i * 10000), noticePeriod: "30 days", skills: "SQL, Excel, Communication",
        source: ["Naukri", "LinkedIn", "Referral"][i % 3], recruiterId: recruiters[i % recruiters.length].id,
      },
    });
    candidates.push(cand);
  }

  // Applications: spread candidates across jobs, varied stages
  const stages = ["SOURCED", "SUBMITTED", "INTERVIEW", "SELECTED", "JOINED"] as const;
  const applications = [];
  for (let i = 0; i < candidates.length; i++) {
    const job = jobs[i % jobs.length];
    const app = await prisma.candidateApplication.create({
      data: { candidateId: candidates[i].id, jobId: job.id, stage: stages[i % stages.length], recruiterId: job.recruiterId },
    });
    applications.push({ app, job, candidate: candidates[i] });
  }

  // 5 placements from the first 5 "JOINED-able" applications
  const joinedApps = applications.filter((a) => true).slice(0, 5);
  const placements = [];
  for (let i = 0; i < joinedApps.length; i++) {
    const { app, job, candidate } = joinedApps[i];
    const client = clients.find((c) => c.id === job.clientId)!;
    const annual = 600000 + i * 50000;
    const terms = client.terms!;
    let fee = 0;
    if (terms.feeType === "PERCENT") fee = Math.round((annual * Number(terms.percent)) / 100);
    else fee = Number(terms.fixedAmount);

    const joiningDate = new Date();
    joiningDate.setDate(joiningDate.getDate() - (i * 7 + 3));
    const guaranteeEnd = new Date(joiningDate);
    guaranteeEnd.setDate(guaranteeEnd.getDate() + terms.replacementDays);

    await prisma.candidateApplication.update({ where: { id: app.id }, data: { stage: "JOINED" } });
    const placement = await prisma.placement.create({
      data: {
        candidateId: candidate.id, clientId: client.id, jobId: job.id, applicationId: app.id,
        joiningDate, offeredCtc: money(annual), annualCtc: money(annual),
        feeType: terms.feeType, feePercent: terms.percent, fixedFee: terms.fixedAmount,
        calculatedFee: money(fee), guaranteeStart: joiningDate, guaranteeEnd, guaranteeDays: terms.replacementDays,
        replacementStatus: "WITHIN_GUARANTEE", status: "JOINED",
      },
    });
    placements.push({ placement, client, candidate, job, fee, annual, joiningDate });
  }

  // 5 invoices (one per placement), some paid/partial
  for (let i = 0; i < placements.length; i++) {
    const { placement, client, candidate, job, fee, annual, joiningDate } = placements[i];
    const dueDate = new Date(joiningDate); dueDate.setDate(dueDate.getDate() + 15);
    const seqRow = await prisma.companySettings.update({ where: { id: "singleton" }, data: { nextInvoiceSeq: { increment: 1 } } });
    const seq = seqRow.nextInvoiceSeq - 1;
    const number = `OI-${joiningDate.getFullYear()}-${String(seq).padStart(4, "0")}`;

    const invoice = await prisma.invoice.create({
      data: {
        number, status: "SENT", placementId: placement.id, clientId: client.id,
        invoiceDate: joiningDate, dueDate,
        clientNameSnapshot: client.name, clientAddressSnapshot: client.billingAddress,
        contactPerson: "Demo Contact", subtotal: money(fee), taxRate: money(0), taxAmount: money(0), total: money(fee),
        amountPaid: money(0), paymentTerms: "Payment due within 15 days", sentAt: new Date(),
        items: { create: { description: `Recruitment fee - ${candidate.fullName} as ${job.title}`, candidateName: candidate.fullName, jobTitle: job.title, joiningDate, ctc: money(annual), feeType: placement.feeType, amount: money(fee) } },
      },
    });

    // First two invoices fully paid, third partially paid
    if (i === 0 || i === 1) {
      await prisma.payment.create({ data: { invoiceId: invoice.id, clientId: client.id, amount: money(fee), paymentDate: new Date(), mode: "BANK_TRANSFER", reference: `DEMO-UTR-${i}`, recordedById: (await adminUserId()) } });
      await prisma.invoice.update({ where: { id: invoice.id }, data: { amountPaid: money(fee), status: "PAID" } });
    } else if (i === 2) {
      const part = Math.round(fee / 2);
      await prisma.payment.create({ data: { invoiceId: invoice.id, clientId: client.id, amount: money(part), paymentDate: new Date(), mode: "UPI", reference: `DEMO-UPI-${i}`, recordedById: (await adminUserId()) } });
      await prisma.invoice.update({ where: { id: invoice.id }, data: { amountPaid: money(part), status: "PARTIALLY_PAID" } });
    }
  }

  // Sample attendance for recruiters (last 5 days)
  for (const rec of recruiters) {
    for (let d = 1; d <= 5; d++) {
      const date = new Date(); date.setDate(date.getDate() - d); date.setHours(0, 0, 0, 0);
      if (date.getDay() === 0) continue; // skip Sunday
      const inT = new Date(date); inT.setHours(10, 2, 0, 0);
      const outT = new Date(date); outT.setHours(19, 5, 0, 0);
      await prisma.attendance.create({
        data: { employeeId: rec.id, date, clockIn: inT, clockOut: outT, workedMinutes: 543, status: "PRESENT" },
      });
    }
  }

  // Sample expenses
  for (const [cat, amt] of [["Naukri", 8000], ["LinkedIn", 6000], ["Office", 3500]] as const) {
    await prisma.expense.create({ data: { expenseDate: new Date(), category: cat, amount: money(amt), vendor: `${cat} Vendor` } });
  }

  console.log(`Demo data seeded: ${clients.length} clients, ${jobs.length} jobs, ${candidates.length} candidates, ${placements.length} placements.`);
}

let _adminId: string | null = null;
async function adminUserId(): Promise<string> {
  if (_adminId) return _adminId;
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@one2infinite.com").toLowerCase();
  const u = await prisma.user.findUnique({ where: { email } });
  _adminId = u!.id;
  return _adminId;
}

async function main() {
  const { admin, recruiter } = await seedRolesAndPermissions();
  await seedSettings();
  await seedAdmin(admin.id);
  await seedDemo(recruiter.id);
  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
