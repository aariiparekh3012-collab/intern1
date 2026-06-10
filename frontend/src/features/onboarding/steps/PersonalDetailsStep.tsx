import type React from "react";
import { useState } from "react";
import { useCreateApplication } from "../hooks/useOnboarding";
import { personalDetailsSchema, type ApplicationResponse } from "../types";
import { Button, Field, SelectField, Toast } from "../../../components/ui";

export function PersonalDetailsStep({ onNext }: { onNext: (app: ApplicationResponse) => void }) {
  const [form, setForm] = useState({
    investor_type: "individual", full_name: "", email: "", mobile: "", pan: "",
    proposed_investment_inr: "",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const mutation = useCreateApplication();

  const set = (k: string, v: string) => setForm({ ...form, [k]: v });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = personalDetailsSchema.safeParse(form);
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
      <h2 style={{ marginBottom: 16 }}>Personal details</h2>
      <SelectField label="Investor type" value={form.investor_type}
        onChange={(e) => set("investor_type", e.target.value)}>
        <option value="individual">Individual</option>
        <option value="huf">HUF</option>
        <option value="nri">NRI</option>
        <option value="corporate">Corporate</option>
      </SelectField>
      <Field label="Full name" value={form.full_name} error={errors.full_name}
        onChange={(e) => set("full_name", e.target.value)} placeholder="Asha Rao" />
      <Field label="Email" value={form.email} error={errors.email}
        onChange={(e) => set("email", e.target.value)} placeholder="asha@example.com" />
      <Field label="Mobile" value={form.mobile} error={errors.mobile}
        onChange={(e) => set("mobile", e.target.value)} placeholder="9876543210" />
      <Field label="PAN" value={form.pan} error={errors.pan}
        onChange={(e) => set("pan", e.target.value.toUpperCase())} placeholder="ABCDE1234F" />
      <Field label="Proposed investment (₹)" value={form.proposed_investment_inr}
        error={errors.proposed_investment_inr}
        onChange={(e) => set("proposed_investment_inr", e.target.value)} placeholder="5000000" />
      <Button variant="primary" block loading={mutation.isPending} type="submit">Continue</Button>
      {apiError && <Toast message={apiError} />}
    </form>
  );
}
