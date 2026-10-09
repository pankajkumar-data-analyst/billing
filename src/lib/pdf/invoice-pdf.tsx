import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";
import { formatINR } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { ensureFonts, nl, LogoMark, FONT_FAMILY, NAVY, GOLD, MUTED } from "./shared";

/**
 * Professional invoice PDF (spec §12). Uses the shared PDF helpers (robust font
 * loading with Helvetica fallback, ligature/dash fix, logo as data-URI) so it
 * renders reliably on Vercel's serverless runtime.
 */

const s = StyleSheet.create({
  // No horizontal page padding so the navy header band can run edge-to-edge;
  // body sections add their own horizontal padding (bodyPad). fontFamily is
  // applied on <Page> at render time from FONT_FAMILY.
  page: { paddingTop: 0, paddingBottom: 40, fontSize: 10, color: "#333" },
  bodyPad: { paddingHorizontal: 40 },
  // Dark header band — the transparent logo (gold X + white text) shows clearly
  // against navy.
  headerBand: {
    backgroundColor: NAVY,
    paddingHorizontal: 40,
    paddingVertical: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 24,
  },
  row: { flexDirection: "row", justifyContent: "space-between" },
  headerLeft: { flexDirection: "row", alignItems: "center" },
  logoText: { marginLeft: 12 },
  companyName: { fontSize: 15, fontWeight: "bold", color: "#ffffff" },
  companyMutedOnDark: { color: "#c9c9d4", fontSize: 8, marginTop: 1 },
  companyTag: { fontSize: 8, color: GOLD, letterSpacing: 1, marginTop: 1 },
  muted: { color: MUTED, fontSize: 9 },
  invoiceTitle: { fontSize: 22, fontWeight: "bold", color: GOLD, textAlign: "right" },
  section: { marginTop: 20 },
  label: { fontSize: 8, color: MUTED, textTransform: "uppercase", marginBottom: 2 },
  value: { fontSize: 10, color: NAVY },
  billTo: { marginTop: 20, padding: 10, backgroundColor: "#f8f9fa", borderRadius: 4 },
  tableHeader: { flexDirection: "row", backgroundColor: NAVY, color: "#fff", padding: 6, marginTop: 20 },
  tableRow: { flexDirection: "row", padding: 6, borderBottom: "1px solid #e9ecef" },
  colDesc: { width: "60%" },
  colQty: { width: "20%", textAlign: "right" },
  colAmt: { width: "20%", textAlign: "right" },
  totals: { marginTop: 10, alignSelf: "flex-end", width: "45%" },
  totalRow: { flexDirection: "row", justifyContent: "space-between", padding: 3 },
  grandTotal: { flexDirection: "row", justifyContent: "space-between", padding: 6, backgroundColor: "#f8f9fa", marginTop: 4, fontWeight: "bold", color: NAVY },
  terms: { marginTop: 24, fontSize: 9, color: "#555" },
  footer: { position: "absolute", bottom: 30, left: 40, right: 40, textAlign: "center", color: MUTED, fontSize: 9, borderTop: "1px solid #e9ecef", paddingTop: 8 },
  statusBadge: { fontSize: 9, color: GOLD, fontWeight: "bold", textAlign: "right", marginTop: 4 },
});

export interface InvoicePdfData {
  company: {
    name: string; address?: string | null; phone?: string | null; email?: string | null;
    website?: string | null; gstin?: string | null; pan?: string | null;
  };
  invoice: {
    number: string; status: string; invoiceDate: Date; dueDate: Date;
    clientName: string; clientAddress?: string | null; contactPerson?: string | null;
    contactEmail?: string | null; contactPhone?: string | null;
    subtotal: string; taxRate: string; taxAmount: string; total: string;
    paymentTerms?: string | null; replacementTerms?: string | null;
    bankDetails?: string | null; notes?: string | null; footer: string;
    gstEnabled: boolean;
    items: {
      description: string; candidateName?: string | null; jobTitle?: string | null;
      joiningDate?: Date | null; ctc?: string | null; amount: string;
    }[];
  };
}

export function InvoicePdf({ company, invoice }: InvoicePdfData) {
  ensureFonts();
  return (
    <Document title={`Invoice ${invoice.number}`}>
      <Page size="A4" style={[s.page, { fontFamily: FONT_FAMILY }]}>
        {/* Dark header band — logo shows clearly on navy */}
        <View style={s.headerBand}>
          <View style={s.headerLeft}>
            <LogoMark />
            <View style={s.logoText}>
              <Text style={s.companyName}>{nl(company.name)}</Text>
              {company.address ? <Text style={s.companyMutedOnDark}>{nl(company.address)}</Text> : null}
              <Text style={s.companyMutedOnDark}>
                {nl([company.phone, company.email, company.website].filter(Boolean).join("  ·  "))}
              </Text>
              {company.gstin ? <Text style={s.companyMutedOnDark}>GSTIN: {company.gstin}</Text> : null}
              {company.pan ? <Text style={s.companyMutedOnDark}>PAN: {company.pan}</Text> : null}
            </View>
          </View>
          <View>
            <Text style={s.invoiceTitle}>INVOICE</Text>
            <Text style={s.statusBadge}>{invoice.status.replace("_", " ")}</Text>
          </View>
        </View>

        {/* Body (padded, since the page no longer has horizontal padding) */}
        <View style={s.bodyPad}>

        {/* Meta */}
        <View style={[s.row, s.section]}>
          <View>
            <Text style={s.label}>Invoice Number</Text>
            <Text style={s.value}>{invoice.number}</Text>
          </View>
          <View>
            <Text style={s.label}>Invoice Date</Text>
            <Text style={s.value}>{formatDate(invoice.invoiceDate)}</Text>
          </View>
          <View>
            <Text style={s.label}>Due Date</Text>
            <Text style={s.value}>{formatDate(invoice.dueDate)}</Text>
          </View>
        </View>

        {/* Bill To */}
        <View style={s.billTo}>
          <Text style={s.label}>Bill To</Text>
          <Text style={[s.value, { fontWeight: "bold" }]}>{nl(invoice.clientName)}</Text>
          {invoice.clientAddress ? <Text style={s.muted}>{nl(invoice.clientAddress)}</Text> : null}
          {invoice.contactPerson ? <Text style={s.muted}>Attn: {nl(invoice.contactPerson)}</Text> : null}
          {invoice.contactEmail || invoice.contactPhone ? (
            <Text style={s.muted}>{nl([invoice.contactEmail, invoice.contactPhone].filter(Boolean).join("  ·  "))}</Text>
          ) : null}
        </View>

        {/* Items */}
        <View style={s.tableHeader}>
          <Text style={s.colDesc}>Description</Text>
          <Text style={s.colQty}>Details</Text>
          <Text style={s.colAmt}>Amount</Text>
        </View>
        {invoice.items.map((item, i) => (
          <View style={s.tableRow} key={i}>
            <View style={s.colDesc}>
              <Text>{nl(item.description)}</Text>
              {item.candidateName ? <Text style={s.muted}>Candidate: {nl(item.candidateName)}</Text> : null}
              {item.jobTitle ? <Text style={s.muted}>Position: {nl(item.jobTitle)}</Text> : null}
              {item.joiningDate ? <Text style={s.muted}>Joined: {formatDate(item.joiningDate)}</Text> : null}
            </View>
            <Text style={s.colQty}>{item.ctc ? `CTC ${formatINR(item.ctc)}` : "-"}</Text>
            <Text style={s.colAmt}>{formatINR(item.amount)}</Text>
          </View>
        ))}

        {/* Totals */}
        <View style={s.totals}>
          <View style={s.totalRow}>
            <Text>Subtotal</Text>
            <Text>{formatINR(invoice.subtotal)}</Text>
          </View>
          {invoice.gstEnabled && Number(invoice.taxRate) > 0 ? (
            <View style={s.totalRow}>
              <Text>GST ({invoice.taxRate}%)</Text>
              <Text>{formatINR(invoice.taxAmount)}</Text>
            </View>
          ) : null}
          <View style={s.grandTotal}>
            <Text>Total</Text>
            <Text>{formatINR(invoice.total)}</Text>
          </View>
        </View>

        {/* Terms */}
        <View style={s.terms}>
          {invoice.paymentTerms ? <Text>Payment Terms: {nl(invoice.paymentTerms)}</Text> : null}
          {invoice.replacementTerms ? <Text>Replacement Guarantee: {nl(invoice.replacementTerms)}</Text> : null}
          {invoice.bankDetails ? (
            <>
              <Text style={[s.label, { marginTop: 10 }]}>Payment Details</Text>
              <Text>{nl(invoice.bankDetails)}</Text>
            </>
          ) : null}
          {invoice.notes ? <Text style={{ marginTop: 8 }}>{nl(invoice.notes)}</Text> : null}
        </View>
        </View>{/* end bodyPad */}

        <Text style={s.footer}>{nl(invoice.footer)}</Text>
      </Page>
    </Document>
  );
}
