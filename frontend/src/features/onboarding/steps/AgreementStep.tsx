import { useState } from "react";
import { useConfirmEsign } from "../hooks/useOnboarding";
import type { ApplicationResponse } from "../types";
import { Button, Toast } from "../../../components/ui";

export function AgreementStep({
  applicationId,
  onDone,
}: {
  applicationId: string;
  onDone: (app: ApplicationResponse) => void;
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
      <h2 style={{ marginBottom: 4 }}>PMS Agreement & Disclosure Document</h2>
      <p
        className="muted"
        style={{ marginTop: 0, marginBottom: 16, fontSize: ".85rem" }}
      >
        Review carefully before signing via Aadhaar eSign
      </p>

      <div
        className="card card--glass"
        style={{
          maxHeight: 260,
          overflow: "auto",
          fontSize: ".84rem",
          lineHeight: 1.7,
          color: "var(--muted)",
          padding: "16px 20px",
        }}
      >
        <p style={{ marginTop: 0 }}>
          <strong style={{ color: "var(--text)" }}>
            PORTFOLIO MANAGEMENT SERVICES AGREEMENT
          </strong>
        </p>
        <p>
          This Agreement is entered into between the Portfolio Manager
          (SEBI Registration No. INP000XXXXXX) and the Client, and is
          governed by the SEBI (Portfolio Managers) Regulations, 2020
          and amendments thereto.
        </p>
        <p>
          <strong style={{ color: "var(--text)" }}>1. Investment Mandate</strong>
          <br />
          The Client hereby grants the Portfolio Manager full discretionary
          authority to manage, invest, and reinvest the Client's funds and
          securities in accordance with the agreed investment approach and
          risk profile.
        </p>
        <p>
          <strong style={{ color: "var(--text)" }}>2. Minimum Investment</strong>
          <br />
          The minimum corpus required under SEBI regulations is
          ₹50,00,000 (Rupees Fifty Lakhs only). The Client confirms that
          the proposed investment meets this threshold.
        </p>
        <p>
          <strong style={{ color: "var(--text)" }}>3. Fee Structure</strong>
          <br />
          Management fees, performance fees (if any), exit loads, and
          other charges are detailed in the Disclosure Document provided
          separately to the Client, as per Regulation 22 of the SEBI PMS
          Regulations.
        </p>
        <p>
          <strong style={{ color: "var(--text)" }}>4. Risk Disclosure</strong>
          <br />
          Securities investments are subject to market risk. Past
          performance does not guarantee future results. The Client
          acknowledges that the value of the portfolio may fluctuate and
          the Client may receive back less than the amount invested.
        </p>
        <p>
          <strong style={{ color: "var(--text)" }}>5. Governing Law</strong>
          <br />
          This Agreement shall be governed by the laws of India and
          subject to the exclusive jurisdiction of the courts of Mumbai.
        </p>
        <p style={{ marginBottom: 0 }}>
          <strong style={{ color: "var(--text)" }}>6. Dispute Resolution</strong>
          <br />
          Any disputes arising under this Agreement shall first be
          referred to arbitration under the SEBI Complaints Redress
          System (SCORES) and thereafter to the courts as specified
          above.
        </p>
      </div>

      <label
        className="row"
        style={{
          margin: "16px 0",
          cursor: "pointer",
          fontSize: ".88rem",
          gap: 10,
          alignItems: "flex-start",
        }}
      >
        <input
          type="checkbox"
          checked={accepted}
          onChange={(e) => setAccepted(e.target.checked)}
          style={{ marginTop: 3 }}
        />
        <span>
          I have read and understood the PMS Agreement, the Disclosure
          Document, and the Risk Profiling outcome. I consent to the
          discretionary management of my portfolio under the terms stated
          above.
        </span>
      </label>

      <Button
        variant="primary"
        block
        disabled={!accepted}
        loading={mutation.isPending}
        onClick={sign}
      >
        eSign with Aadhaar
      </Button>
      <p
        className="muted"
        style={{ textAlign: "center", fontSize: ".75rem", marginTop: 8 }}
      >
        Powered by NSDL e-Governance eSign Service (sandbox)
      </p>
      {apiError && <Toast message={apiError} />}
    </div>
  );
}
