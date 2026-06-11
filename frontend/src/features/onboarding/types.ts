import { z } from "zod";

export const OnboardingStatus = {
  DRAFT: "draft",
  KYC_PENDING: "kyc_pending",
  KYC_VERIFIED: "kyc_verified",
  KYC_REJECTED: "kyc_rejected",
  RISK_PROFILED: "risk_profiled",
  AGREEMENT_PENDING: "agreement_pending",
  AGREEMENT_SIGNED: "agreement_signed",
  UNDER_REVIEW: "under_review",
  ACTIVE: "active",
  REJECTED: "rejected",
} as const;
export type OnboardingStatus =
  (typeof OnboardingStatus)[keyof typeof OnboardingStatus];

export interface ApplicationResponse {
  id: string;
  status: OnboardingStatus;
  investor_type: string;
  full_name: string;
  email: string;
  pan: string;
  proposed_investment_inr: number;
  risk_category: string | null;
  kyc_source: string | null;
}

// ── formatting helpers ──────────────────────────────────────────────────

/** Format number in Indian numbering system: 50,00,000 */
export function formatINR(n: number): string {
  const s = Math.floor(n).toString();
  if (s.length <= 3) return s;
  const last3 = s.slice(-3);
  const rest = s.slice(0, -3);
  const groups = rest.replace(/\B(?=(\d{2})+(?!\d))/g, ",");
  return groups + "," + last3;
}

/** Strip everything except digits from a string */
export function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

/** Format Aadhaar with spaces: 2345 6789 0123 */
export function formatAadhaar(raw: string): string {
  const d = digitsOnly(raw).slice(0, 12);
  const parts: string[] = [];
  for (let i = 0; i < d.length; i += 4) parts.push(d.slice(i, i + 4));
  return parts.join(" ");
}

/** Format mobile with +91 prefix display */
export function formatMobile(raw: string): string {
  return digitsOnly(raw).slice(0, 10);
}

/** Auto-uppercase and limit PAN to 10 chars: ABCDE1234F */
export function formatPAN(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
}

/** Auto-uppercase IFSC: HDFC0001234 */
export function formatIFSC(raw: string): string {
  return raw.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 11);
}

/** Format NSDL BO ID: IN + 14 digits (total 16 chars including "IN") */
export function formatNSDLBoId(raw: string): string {
  const upper = raw.toUpperCase();
  // If starts with IN, keep prefix and allow 14 more digits
  if (upper.startsWith("IN")) {
    return "IN" + digitsOnly(upper.slice(2)).slice(0, 14);
  }
  // Auto-prepend IN if user starts typing digits
  const d = digitsOnly(upper).slice(0, 14);
  return d.length > 0 ? "IN" + d : "";
}

/** Format CDSL BO ID: 16 digits */
export function formatCDSLBoId(raw: string): string {
  return digitsOnly(raw).slice(0, 16);
}

/** Format bank account number: digits only, 8–18 length */
export function formatBankAccount(raw: string): string {
  return digitsOnly(raw).slice(0, 18);
}

// ── validation schemas ──────────────────────────────────────────────────

export const personalDetailsSchema = z.object({
  investor_type: z.string().min(1, "Select investor type"),
  full_name: z.string().min(2, "Full name is required").max(200),
  email: z.string().email("Enter a valid email address"),
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Enter a valid PAN (e.g. ABCDE1234F)"),
  proposed_investment_inr: z.coerce.number().min(5_000_000, "SEBI minimum investment is ₹50,00,000"),
});
export type PersonalDetails = z.infer<typeof personalDetailsSchema>;

export const kycSchema = z.object({
  aadhaar_full: z.string()
    .transform((v) => v.replace(/\s/g, ""))
    .pipe(z.string().regex(/^[2-9]\d{11}$/, "Enter a valid 12-digit Aadhaar number")),
  bank_account_number: z.string().regex(/^\d{8,18}$/, "Enter a valid bank account number (8–18 digits)"),
  bank_ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Enter a valid IFSC code (e.g. HDFC0001234)"),
  bank_holder_name: z.string().min(2, "Account holder name is required"),
  demat_bo_id: z.string()
    .transform((v) => v.replace(/\s/g, ""))
    .pipe(z.string().regex(/^(IN\d{14}|\d{16})$/, "Enter a valid BO ID — NSDL: IN + 14 digits, CDSL: 16 digits")),
  demat_depository: z.enum(["NSDL", "CDSL"]),
});
export type KycDetails = z.infer<typeof kycSchema>;

export interface RiskAnswer {
  question_id: string;
  weight: number;
}
