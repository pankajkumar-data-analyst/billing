import { z } from "zod";

/**
 * Zod schemas for all mutating inputs (spec §29: server-side input validation).
 * Server actions parse FormData/JSON through these before touching the DB.
 */

const optionalString = z.string().trim().optional().or(z.literal("").transform(() => undefined));
const money = z
  .union([z.string(), z.number()])
  .transform((v) => (v === "" ? undefined : Number(v)))
  .pipe(z.number().nonnegative().optional());

export const clientSchema = z.object({
  name: z.string().trim().min(2, "Company name is required"),
  type: optionalString,
  industry: optionalString,
  website: optionalString,
  address: optionalString,
  city: optionalString,
  state: optionalString,
  gstin: optionalString,
  pan: optionalString,
  billingAddress: optionalString,
  agreementStatus: optionalString,
  notes: optionalString,
  status: z.enum(["ACTIVE", "INACTIVE", "PROSPECT"]).default("PROSPECT"),
  // Primary contact
  contactName: optionalString,
  contactDesignation: optionalString,
  contactEmail: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  contactPhone: optionalString,
  contactWhatsapp: optionalString,
  // Recruitment terms
  feeType: z.enum(["FIXED", "PERCENT", "TIERED", "CUSTOM"]).default("PERCENT"),
  percent: money,
  fixedAmount: money,
  paymentDueDays: z.coerce.number().int().min(0).default(15),
  replacementDays: z.coerce.number().int().min(0).default(90),
  agreementRef: optionalString,
});

export const jobSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  title: z.string().trim().min(2, "Job title is required"),
  location: optionalString,
  department: optionalString,
  openings: z.coerce.number().int().min(1).default(1),
  salaryMin: money,
  salaryMax: money,
  expMin: z.coerce.number().int().min(0).optional(),
  expMax: z.coerce.number().int().min(0).optional(),
  employmentType: z.enum(["FULL_TIME", "PART_TIME", "CONTRACT", "INTERN"]).default("FULL_TIME"),
  requiredSkills: optionalString,
  preferredSkills: optionalString,
  jd: optionalString,
  recruiterId: optionalString,
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  status: z
    .enum(["NEW", "ACTIVE", "ON_HOLD", "SUBMITTED", "INTERVIEWING", "FILLED", "CLOSED", "CANCELLED"])
    .default("NEW"),
});

export const candidateSchema = z.object({
  fullName: z.string().trim().min(2, "Candidate name is required"),
  mobile: optionalString,
  email: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  location: optionalString,
  currentCompany: optionalString,
  currentDesignation: optionalString,
  totalExperience: z.coerce.number().min(0).optional(),
  currentCtc: money,
  expectedCtc: money,
  noticePeriod: optionalString,
  skills: optionalString,
  source: optionalString,
  recruiterId: optionalString,
  notes: optionalString,
});

export const applicationSchema = z.object({
  candidateId: z.string().min(1),
  jobId: z.string().min(1),
  stage: z
    .enum([
      "SOURCED", "SCREENED", "SHORTLISTED", "SUBMITTED", "INTERVIEW", "SELECTED",
      "OFFER", "JOINED", "REJECTED", "DROPPED", "REPLACEMENT_REQUIRED", "REPLACED",
    ])
    .default("SOURCED"),
  note: optionalString,
});

export const placementSchema = z.object({
  applicationId: z.string().min(1, "Application is required"),
  joiningDate: z.coerce.date(),
  offeredCtc: z.coerce.number().positive("Offered CTC must be greater than 0"),
  annualCtc: z.coerce.number().positive("Annual CTC must be greater than 0"),
  feeType: z.enum(["FIXED", "PERCENT", "TIERED", "CUSTOM"]),
  feePercent: money,
  fixedFee: money,
  customFee: money,
  guaranteeDays: z.coerce.number().int().min(0).default(90),
  notes: optionalString,
});

export const invoiceSchema = z.object({
  clientId: z.string().min(1, "Client is required"),
  placementId: optionalString,
  invoiceDate: z.coerce.date(),
  dueDate: z.coerce.date(),
  clientNameSnapshot: z.string().trim().min(1, "Client name is required"),
  clientAddressSnapshot: optionalString,
  contactPerson: optionalString,
  contactEmail: z.string().email().optional().or(z.literal("").transform(() => undefined)),
  contactPhone: optionalString,
  // single line (Phase 1 — one placement per invoice)
  description: z.string().trim().min(1, "Description is required"),
  candidateName: optionalString,
  jobTitle: optionalString,
  joiningDate: z.coerce.date().optional(),
  ctc: money,
  feeType: z.enum(["FIXED", "PERCENT", "TIERED", "CUSTOM"]).optional(),
  feePercent: money,
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  taxRate: z.coerce.number().min(0).default(0),
  paymentTerms: optionalString,
  replacementTerms: optionalString,
  bankDetailsSnapshot: optionalString,
  notes: optionalString,
});

export const paymentSchema = z.object({
  invoiceId: z.string().min(1),
  amount: z.coerce.number().positive("Amount must be greater than 0"),
  paymentDate: z.coerce.date(),
  mode: z.enum(["BANK_TRANSFER", "UPI", "CASH", "CHEQUE", "OTHER"]).default("BANK_TRANSFER"),
  reference: optionalString,
  notes: optionalString,
});

export const leaveSchema = z.object({
  type: z.enum(["CASUAL", "SICK", "PAID", "UNPAID", "OTHER"]),
  fromDate: z.coerce.date(),
  toDate: z.coerce.date(),
  reason: optionalString,
});

export type ClientInput = z.infer<typeof clientSchema>;
export type JobInput = z.infer<typeof jobSchema>;
export type CandidateInput = z.infer<typeof candidateSchema>;
export type PlacementInput = z.infer<typeof placementSchema>;
export type InvoiceInput = z.infer<typeof invoiceSchema>;
export type PaymentInput = z.infer<typeof paymentSchema>;
