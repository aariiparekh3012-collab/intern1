import type React from "react";
import { useState } from "react";
import { useSubmitKyc } from "../hooks/useOnboarding";
import { kycSchema, type ApplicationResponse } from "../types";
import { Button, Field, SelectField, Toast } from "../../../components/ui";

export function KycStep({ applicationId, onNext }: {
  applicationId: string; onNext: (app: ApplicationResponse) => void;
}) {
  const [form, setForm] = useState({
    aadhaar_full: "", bank_account_number: "", bank_ifsc: "", bank_holder_name: "",
    demat_bo_id: "", demat_depository: "NSDL",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const mutation = useSubmitKyc(applicationId);
  const set = (k: string, v: string) => setForm({ ...form, [k]: v });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = kycSchema.safeParse(form);
    if (!parsed.success) {
      const fe: Record<string, string> = {};
      for (const i of parsed.error.issues) fe[i.path[0] as string] = i.message;
      setErrors(fe);
      return;
    }
    setErrors({});
    setApiError(null);
    mutation.mutate(parsed.data, {
      onSuccess: (app) =>
        app.status === "kyc_rejected"
          ? setApiError("KYC failed verification. Please review your details.")
          : onNext(app),
      onError: (e) => setApiError(e.message),
    });
  };

  return (
    <form onSubmit={submit} className="fade-in">
      <h2 style={{ marginBottom: 4 }}>KYC &amp; bank verification</h2>
      <p className="muted" style={{ marginTop: 0, marginBottom: 16, fontSize: ".85rem" }}>
        Verified via KRA/CKYC &amp; penny-drop (sandbox).
      </p>
      <Field label="Aadhaar number" value={form.aadhaar_full} error={errors.aadhaar_full}
        onChange={(e) => set("aadhaar_full", e.target.value)} placeholder="234567890123" />
      <Field label="Bank account number" value={form.bank_account_number} error={errors.bank_account_number}
        onChange={(e) => set("bank_account_number", e.target.value)} placeholder="12345678901" />
      <Field label="IFSC" value={form.bank_ifsc} error={errors.bank_ifsc}
        onChange={(e) => set("bank_ifsc", e.target.value.toUpperCase())} placeholder="HDFC0001234" />
      <Field label="Account holder name" value={form.bank_holder_name} error={errors.bank_holder_name}
        onChange={(e) => set("bank_holder_name", e.target.value)} placeholder="Asha Rao" />
      <Field label="Demat BO ID" value={form.demat_bo_id} error={errors.demat_bo_id}
        onChange={(e) => set("demat_bo_id", e.target.value)} placeholder="1234567812345678" />
      <SelectField label="Depository" value={form.demat_depository}
        onChange={(e) => set("demat_depository", e.target.value)}>
        <option value="NSDL">NSDL</option>
        <option value="CDSL">CDSL</option>
      </SelectField>
      <Button variant="primary" block loading={mutation.isPending} type="submit">
        Verify &amp; Continue
      </Button>
      {apiError && <Toast message={apiError} />}
    </form>
  );
}
