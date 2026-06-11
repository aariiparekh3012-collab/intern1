import type React from "react";
import { useState } from "react";
import { useCreateApplication } from "../hooks/useOnboarding";
import {
  personalDetailsSchema,
  formatINR,
  formatPAN,
  formatMobile,
  digitsOnly,
  type ApplicationResponse,
} from "../types";
import { Button, Field, SelectField, Toast } from "../../../components/ui";

export function PersonalDetailsStep({ onNext }: { onNext: (app: ApplicationResponse) => void }) {
  const [form, setForm] = useState({
    investor_type: "individual",
    full_name: "",
    email: "",
    mobile: "",
    pan: "",
    proposed_investment_inr: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const mutation = useCreateApplication();

  const set = (k: string, v: string) => setForm({ ...form, [k]: v });

  const investmentRaw = digitsOnly(form.proposed_investment_inr);
  const investmentDisplay = investmentRaw
    ? `₹${formatINR(Number(investmentRaw))}`
    : "";

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = { ...form, proposed_investment_inr: investmentRaw };
    const parsed = personalDetailsSchema.safeParse(payload);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const i of parsed.error.issues) fieldErrors[i.path[0] as string] = i.message;
      setErrors(fieldErrors);
      return;
    }
    setErrors({});
    setApiError(null);
    mutation.mutate(parsed.data, { onSuccess: onNext, onError: (e) => setApiError(e.message) });
  };

  return (
    <form onSubmit={submit} className="fade-in">
      <h2 style={{ marginBottom: 4 }}>Personal Details</h2>
      <p className="muted" style={{ marginTop: 0, marginBottom: 20, fontSize: ".85rem" }}>
        As per SEBI (Portfolio Managers) Regulations, 2020
      </p>

      <SelectField
        label="Investor Type"
        value={form.investor_type}
        onChange={(e) => set("investor_type", e.target.value)}
      >
        <option value="individual">Individual — Resident Indian</option>
        <option value="huf">HUF — Hindu Undivided Family</option>
        <option value="nri">NRI — Non-Resident Indian</option>
        <option value="corporate">Corporate / Partnership / Trust</option>
      </SelectField>

      <Field
        label="Full Name (as on PAN card)"
        value={form.full_name}
        error={errors.full_name}
        onChange={(e) => set("full_name", e.target.value)}
        placeholder="ASHA RAO"
        autoComplete="name"
      />

      <Field
        label="Email Address"
        value={form.email}
        error={errors.email}
        onChange={(e) => set("email", e.target.value)}
        placeholder="asha.rao@example.com"
        type="email"
        autoComplete="email"
      />

      <div style={{ position: "relative" }}>
        <Field
          label="Mobile Number"
          value={form.mobile}
          error={errors.mobile}
          onChange={(e) => set("mobile", formatMobile(e.target.value))}
          placeholder="98765 43210"
          type="tel"
          maxLength={10}
          autoComplete="tel"
          style={{ paddingLeft: 44 }}
        />
        <span
          style={{
            position: "absolute",
            left: 12,
            top: 34,
            fontSize: ".85rem",
            color: "var(--muted)",
            pointerEvents: "none",
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          +91
        </span>
      </div>

      <Field
        label="PAN (Permanent Account Number)"
        value={form.pan}
        error={errors.pan}
        onChange={(e) => set("pan", formatPAN(e.target.value))}
        placeholder="ABCDE1234F"
        maxLength={10}
        style={{ fontFamily: "var(--font-mono, monospace)", letterSpacing: "0.08em", textTransform: "uppercase" }}
      />

      <Field
        label="Proposed Investment Amount"
        value={form.proposed_investment_inr}
        error={errors.proposed_investment_inr}
        onChange={(e) => set("proposed_investment_inr", digitsOnly(e.target.value))}
        placeholder="50,00,000"
        inputMode="numeric"
      />
      {investmentDisplay && (
        <p
          style={{
            fontSize: ".8rem",
            color: "var(--muted)",
            marginTop: -8,
            marginBottom: 12,
            fontFamily: "var(--font-mono, monospace)",
          }}
        >
          {investmentDisplay}
          {Number(investmentRaw) < 5_000_000 && (
            <span style={{ color: "var(--danger, #e74c3c)", marginLeft: 8 }}>
              (below SEBI minimum of ₹50,00,000)
            </span>
          )}
        </p>
      )}

      <Button variant="primary" block loading={mutation.isPending} type="submit">
        Continue to KYC
      </Button>
      {apiError && <Toast message={apiError} />}
    </form>
  );
}
