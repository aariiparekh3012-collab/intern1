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

// ---- client-side validation schemas (mirror backend value objects) ----
export const personalDetailsSchema = z.object({
  investor_type: z.string().min(1),
  full_name: z.string().min(2).max(200),
  email: z.string().email(),
  mobile: z.string().regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit mobile"),
  pan: z.string().regex(/^[A-Z]{5}[0-9]{4}[A-Z]$/, "Invalid PAN"),
  proposed_investment_inr: z.coerce.number().min(5_000_000, "Minimum is ₹50,00,000"),
});
export type PersonalDetails = z.infer<typeof personalDetailsSchema>;

export const kycSchema = z.object({
  aadhaar_full: z.string().regex(/^[2-9][0-9]{11}$/, "Invalid Aadhaar"),
  bank_account_number: z.string().regex(/^\d{8,18}$/, "Invalid account number"),
  bank_ifsc: z.string().regex(/^[A-Z]{4}0[A-Z0-9]{6}$/, "Invalid IFSC"),
  bank_holder_name: z.string().min(2),
  demat_bo_id: z.string().regex(/^\d{16}$/, "16-digit BO id"),
  demat_depository: z.enum(["NSDL", "CDSL"]),
});
export type KycDetails = z.infer<typeof kycSchema>;

export interface RiskAnswer {
  question_id: string;
  weight: number;
}
