import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatINR } from "@/lib/money";
import { ensureFonts, nl, LogoMark, sharedStyles as sh, NAVY, MUTED } from "./shared";

/**
 * Monthly payslip PDF (spec §21). Reuses the shared navy-header/logo/font
 * helpers. Earnings and deductions are driven by data; net pay is computed by
 * the payroll service, never here.
 */

const MONTHS = [
  "", "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const s = StyleSheet.create({
  label: { fontSize: 8, color: MUTED, textTransform: "uppercase", marginBottom: 2 },
  value: { fontSize: 10, color: NAVY },
  metaRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 16 },
  twoCol: { flexDirection: "row", gap: 16, marginTop: 8 },
  col: { flex: 1, borderRadius: 4, borderWidth: 1, borderColor: "#e9ecef", borderStyle: "solid" },
  colHeader: { backgroundColor: "#f8f9fa", padding: 6, fontSize: 10, fontWeight: "bold", color: NAVY },
  lineRow: { flexDirection: "row", justifyContent: "space-between", paddingHorizontal: 6, paddingVertical: 4 },
  lineLabel: { fontSize: 9, color: "#444" },
  lineAmt: { fontSize: 9, color: NAVY },
  subtotal: { flexDirection: "row", justifyContent: "space-between", padding: 6, borderTopWidth: 1, borderColor: "#e9ecef", borderStyle: "solid", fontWeight: "bold" },
  netBox: { marginTop: 16, backgroundColor: "#f8f9fa", borderRadius: 4, padding: 12, flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  netLabel: { fontSize: 11, color: NAVY, fontWeight: "bold" },
  netValue: { fontSize: 18, color: NAVY, fontWeight: "bold" },
  attendanceRow: { flexDirection: "row", justifyContent: "space-between", marginTop: 16, padding: 8, backgroundColor: "#f8f9fa", borderRadius: 4 },
  attItem: { alignItems: "center", flex: 1 },
  attNum: { fontSize: 12, fontWeight: "bold", color: NAVY },
  attLabel: { fontSize: 7, color: MUTED, textTransform: "uppercase", marginTop: 2 },
});

export interface PayslipPdfData {
  company: { name: string; address?: string | null; phone?: string | null; email?: string | null; website?: string | null };
  payslip: {
    status: string;
    periodYear: number;
    periodMonth: number;
    employeeName: string;
    employeeCode: string;
    designation?: string | null;
    workingDays: number;
    presentDays: string;
    extraDays: string;
    paidLeave: string;
    unpaidLeave: string;
    lopDays: string;
    grossSalary: string;
    lopAmount: string;
    extraPay: string;
    bonus: string;
    deductions: string;
    netSalary: string;
    note?: string | null;
  };
  footer: string;
}

export function PayslipPdf({ company, payslip, footer }: PayslipPdfData) {
  ensureFonts();
  const period = `${MONTHS[payslip.periodMonth]} ${payslip.periodYear}`;

  return (
    <Document title={`Payslip ${payslip.employeeCode} ${period}`}>
      <Page size="A4" style={sh.page}>
        {/* Navy header band with logo */}
        <View style={sh.headerBand}>
          <View style={sh.headerLeft}>
            <LogoMark />
            <View style={sh.logoText}>
              <Text style={sh.companyName}>{nl(company.name)}</Text>
              {company.address ? <Text style={sh.companyMutedOnDark}>{nl(company.address)}</Text> : null}
              <Text style={sh.companyMutedOnDark}>
                {nl([company.phone, company.email, company.website].filter(Boolean).join("  ·  "))}
              </Text>
            </View>
          </View>
          <View>
            <Text style={sh.docTitle}>PAYSLIP</Text>
            <Text style={sh.docSubtitle}>{period}</Text>
          </View>
        </View>

        <View style={sh.bodyPad}>
          {/* Employee + status */}
          <View style={s.metaRow}>
            <View>
              <Text style={s.label}>Employee</Text>
              <Text style={[s.value, { fontWeight: "bold" }]}>{nl(payslip.employeeName)}</Text>
              <Text style={{ fontSize: 9, color: MUTED }}>
                {nl(payslip.employeeCode)}{payslip.designation ? `  ·  ${nl(payslip.designation)}` : ""}
              </Text>
            </View>
            <View>
              <Text style={s.label}>Status</Text>
              <Text style={[s.value, { fontWeight: "bold" }]}>{payslip.status}</Text>
            </View>
          </View>

          {/* Attendance summary */}
          <View style={s.attendanceRow}>
            <View style={s.attItem}><Text style={s.attNum}>{payslip.workingDays}</Text><Text style={s.attLabel}>Working</Text></View>
            <View style={s.attItem}><Text style={s.attNum}>{payslip.presentDays}</Text><Text style={s.attLabel}>Present</Text></View>
            <View style={s.attItem}><Text style={s.attNum}>{payslip.extraDays}</Text><Text style={s.attLabel}>Extra Days</Text></View>
            <View style={s.attItem}><Text style={s.attNum}>{payslip.paidLeave}</Text><Text style={s.attLabel}>Paid Leave</Text></View>
            <View style={s.attItem}><Text style={s.attNum}>{payslip.lopDays}</Text><Text style={s.attLabel}>LOP Days</Text></View>
          </View>

          {/* Earnings / Deductions. Earned base = gross - LOP. */}
          {(() => {
            const earnedBase = Number(payslip.grossSalary) - Number(payslip.lopAmount);
            const totalEarnings = earnedBase + Number(payslip.extraPay) + Number(payslip.bonus);
            return (
              <View style={s.twoCol}>
                <View style={s.col}>
                  <Text style={s.colHeader}>Earnings</Text>
                  <View style={s.lineRow}><Text style={s.lineLabel}>Earned Salary ({payslip.presentDays}/{payslip.workingDays} days)</Text><Text style={s.lineAmt}>{formatINR(earnedBase)}</Text></View>
                  <View style={s.lineRow}><Text style={s.lineLabel}>Extra / Weekend-Holiday ({payslip.extraDays} days)</Text><Text style={s.lineAmt}>{formatINR(payslip.extraPay)}</Text></View>
                  <View style={s.lineRow}><Text style={s.lineLabel}>Bonus</Text><Text style={s.lineAmt}>{formatINR(payslip.bonus)}</Text></View>
                  <View style={s.subtotal}>
                    <Text>Total Earnings</Text>
                    <Text>{formatINR(totalEarnings)}</Text>
                  </View>
                </View>
                <View style={s.col}>
                  <Text style={s.colHeader}>Deductions</Text>
                  <View style={s.lineRow}><Text style={s.lineLabel}>Loss of Pay ({payslip.lopDays} days)</Text><Text style={s.lineAmt}>{formatINR(payslip.lopAmount)}</Text></View>
                  <View style={s.lineRow}><Text style={s.lineLabel}>Other Deductions</Text><Text style={s.lineAmt}>{formatINR(payslip.deductions)}</Text></View>
                  <View style={s.subtotal}>
                    <Text>Total Deductions</Text>
                    <Text>{formatINR(payslip.deductions)}</Text>
                  </View>
                </View>
              </View>
            );
          })()}

          {/* Net pay */}
          <View style={s.netBox}>
            <Text style={s.netLabel}>Net Pay</Text>
            <Text style={s.netValue}>{formatINR(payslip.netSalary)}</Text>
          </View>

          {payslip.note ? <Text style={{ marginTop: 12, fontSize: 9, color: "#555" }}>{nl(payslip.note)}</Text> : null}

          <Text style={{ marginTop: 20, fontSize: 8, color: MUTED }}>
            This is a system-generated payslip and does not require a signature.
          </Text>
        </View>

        <Text style={sh.footer}>{nl(footer)}</Text>
      </Page>
    </Document>
  );
}
