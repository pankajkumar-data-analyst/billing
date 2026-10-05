/**
 * Build the invoice email body from a template (spec §36). The template is
 * stored in CompanySettings and editable by Admin; this just fills tokens.
 * No email is ever sent automatically (spec §35) — the text is copy-only in
 * Phase 1.
 */
export function renderInvoiceEmail(
  template: string | null | undefined,
  tokens: { clientName: string; candidateName: string; jobTitle: string; invoiceNumber: string; amount: string; dueDate: string },
): string {
  const t =
    template ??
    `Dear [Client Name],

Please find attached our recruitment invoice for the successful placement of [Candidate Name] for the position of [Job Title].

Invoice No: [Invoice Number]
Amount: [Amount]
Due Date: [Due Date]

Kindly process the payment as per the agreed terms.

Regards,
One2Infinite Recruitment Solutions`;

  return t
    .replaceAll("[Client Name]", tokens.clientName)
    .replaceAll("[Candidate Name]", tokens.candidateName)
    .replaceAll("[Job Title]", tokens.jobTitle)
    .replaceAll("[Invoice Number]", tokens.invoiceNumber)
    .replaceAll("[Amount]", tokens.amount)
    .replaceAll("[Due Date]", tokens.dueDate);
}
