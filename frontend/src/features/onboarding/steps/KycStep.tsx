import type React from "react";
import { useState } from "react";
import { useSubmitKyc } from "../hooks/useOnboarding";
import {
  kycSchema,
  formatAadhaar,
  formatIFSC,
  formatBankAccount,
  formatNSDLBoId,
  formatCDSLBoId,
  type ApplicationResponse,
} from "../types";
import { Button, Field, SelectField, Toast } from "../../../components/ui";

export function KycStep({
  applicationId,
  onNext,
}: {
  applicationId: string;
  onNext: (app: ApplicationResponse) => void;
}) {
  const [form, setForm] = useState({
    aadhaar_full: "",
    bank_account_number: "",
    bank_ifsc: "",
    bank_holder_name: "",
    demat_bo_id: "",
    demat_depository: "NSDL" as "NSDL" | "CDSL",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const mutation = useSubmitKyc(applicationId);

  const set = (k: string, v: string) => setForm({ ...form, [k]: v });

  const handleDepositoryChange = (dep: "NSDL" | "CDSL") => {
    setForm({ ...form, demat_depository: dep, demat_bo_id: "" });
  };

  const handleBoIdChange = (raw: string) => {
    const formatted =
      form.demat_depository === "NSDL"
        ? formatNSDLBoId(raw)
        : formatCDSLBoId(raw);
    set("demat_bo_id", formatted);
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = kycSchema.safeParse(form);
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      for (const i of parsed.error.issues)
        fe[i.path[0] as string] = i.message;
      setErrors(fe);
      return;
    }
    setErrors({});
    setApiError(null);
    mutation.mutate(parsed.data, {
      onSuccess: (app) =>
        app.status === "kyc_rejected"
          ? setApiError(
              "KYC verification failed. Please check your details and try again."
            )
          : onNext(app),
      onError: (e) => setApiError(e.message),
    });
  };

  const isNSDL = form.demat_depository === "NSDL";

  return (
    <form onSubmit={submit} className="fade-in">
      <h2 style={{ marginBottom: 4 }}>KYC & Bank Verification</h2>
      <p
        className="muted"
        style={{ marginTop: 0, marginBottom: 20, fontSize: ".85rem" }}
      >
        Verified via KRA / CKYC lookup and penny-drop bank verification
        (sandbox mode)
      </p>

      {/* ── Identity ── */}
      <div
        style={{
          fontSize: ".75rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--muted)",
          marginBottom: 8,
          marginTop: 4,
        }}
      >
        Identity Verification
      </div>

      <Field
        label="Aadhaar Number"
        value={form.aadhaar_full}
        error={errors.aadhaar_full}
        onChange={(e) => set("aadhaar_full", formatAadhaar(e.target.value))}
        placeholder="2345 6789 0123"
        maxLength={14}
        inputMode="numeric"
        style={{
          fontFamily: "var(--font-mono, monospace)",
          letterSpacing: "0.12em",
        }}
      />

      {/* ── Bank Details ── */}
      <div
        style={{
          fontSize: ".75rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--muted)",
          marginBottom: 8,
          marginTop: 20,
        }}
      >
        Bank Account Details
      </div>

      <Field
        label="Account Holder Name (as on bank records)"
        value={form.bank_holder_name}
        error={errors.bank_holder_name}
        onChange={(e) => set("bank_holder_name", e.target.value)}
        placeholder="ASHA RAO"
        autoComplete="name"
      />

      <Field
        label="Bank Account Number"
        value={form.bank_account_number}
        error={errors.bank_account_number}
        onChange={(e) =>
          set("bank_account_number", formatBankAccount(e.target.value))
        }
        placeholder="00112233445566"
        inputMode="numeric"
        maxLength={18}
        style={{
          fontFamily: "var(--font-mono, monospace)",
          letterSpacing: "0.06em",
        }}
      />

      <Field
        label="IFSC Code"
        value={form.bank_ifsc}
        error={errors.bank_ifsc}
        onChange={(e) => set("bank_ifsc", formatIFSC(e.target.value))}
        placeholder="HDFC0001234"
        maxLength={11}
        style={{
          fontFamily: "var(--font-mono, monospace)",
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      />

      {/* ── Demat ── */}
      <div
        style={{
          fontSize: ".75rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          color: "var(--muted)",
          marginBottom: 8,
          marginTop: 20,
        }}
      >
        Demat Account
      </div>

      <SelectField
        label="Depository"
        value={form.demat_depository}
        onChange={(e) =>
          handleDepositoryChange(e.target.value as "NSDL" | "CDSL")
        }
      >
        <option value="NSDL">NSDL — National Securities Depository Limited</option>
        <option value="CDSL">CDSL — Central Depository Services Limited</option>
      </SelectField>

      <Field
        label={isNSDL ? "BO ID (NSDL — starts with IN)" : "BO ID (CDSL — 16 digits)"}
        value={form.demat_bo_id}
        error={errors.demat_bo_id}
        onChange={(e) => handleBoIdChange(e.target.value)}
        placeholder={isNSDL ? "IN30012345678901" : "1234567890123456"}
        maxLength={16}
        style={{
          fontFamily: "var(--font-mono, monospace)",
          letterSpacing: "0.06em",
          textTransform: isNSDL ? "uppercase" : undefined,
        }}
      />
      <p
        style={{
          fontSize: ".75rem",
          color: "var(--muted)",
          marginTop: -8,
          marginBottom: 16,
        }}
      >
        {isNSDL
          ? 'NSDL Beneficiary Owner IDs start with "IN" followed by 14 digits'
          : "CDSL BO IDs are 16-digit numeric identifiers"}
      </p>

      <Button variant="primary" block loading={mutation.isPending} type="submit">
        Verify & Continue
      </Button>
      {apiError && <Toast message={apiError} />}
    </form>
  );
}
