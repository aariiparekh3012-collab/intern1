import { useState } from "react";
import { useConfirmEsign } from "../hooks/useOnboarding";
import type { ApplicationResponse } from "../types";
import { Button, Toast } from "../../../components/ui";

/**
 * In production the investor is redirected to the Aadhaar eSign provider and returns
 * via a callback carrying the transaction id. Here we simulate the confirmation.
 */
export function AgreementStep({ applicationId, onDone }: {
  applicationId: string; onDone: (app: ApplicationResponse) => void;
}) {
  const [accepted, setAccepted] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);
  const mutation = useConfirmEsign(applicationId);

  const sign = () => {
    mutation.mutate("TXN-SANDBOX", {
      onSuccess: onDone,
      onError: (e) => setApiError(e.message),
    });
  };

  return (
    <div className="fade-in">
      <h2 style={{ marginBottom: 12 }}>PMS Agreement</h2>
      <div className="card card--glass" style={{ maxHeight: 200, overflow: "auto", fontSize: ".85rem", lineHeight: 1.6, color: "var(--muted)", padding: 16 }}>
        This Portfolio Management Services Agreement is entered into between the Portfolio
        Manager and the Client, governing discretionary management of the Client's funds and
        securities under the SEBI (Portfolio Managers) Regulations, 2020 — including the
        minimum investment of ₹50,00,000, fee disclosures, the Disclosure Document, and the
        Client's risk profile and investment approach.
      </div>
      <label className="row" style={{ margin: "16px 0", cursor: "pointer", fontSize: ".9rem" }}>
        <input type="checkbox" checked={accepted} onChange={(e) => setAccepted(e.target.checked)} />
        I have read and agree to the PMS Agreement and Disclosure Document.
      </label>
      <Button variant="primary" block disabled={!accepted} loading={mutation.isPending} onClick={sign}>
        eSign with Aadhaar
      </Button>
      {apiError && <Toast message={apiError} />}
    </div>
  );
}
