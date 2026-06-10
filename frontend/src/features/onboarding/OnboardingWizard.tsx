import { useState } from "react";
import { Link } from "react-router-dom";
import type { ApplicationResponse } from "./types";
import { Card, Stepper, Button } from "../../components/ui";
import { PersonalDetailsStep } from "./steps/PersonalDetailsStep";
import { KycStep } from "./steps/KycStep";
import { RiskProfileStep } from "./steps/RiskProfileStep";
import { AgreementStep } from "./steps/AgreementStep";

const STEPS = ["Personal", "KYC & Bank", "Risk Profile", "Agreement"];

/** Multi-step onboarding wizard with a premium stepper and shared state. */
export function OnboardingWizard() {
  const [step, setStep] = useState(0);
  const [application, setApplication] = useState<ApplicationResponse | null>(null);
  const [done, setDone] = useState(false);

  const advance = (app: ApplicationResponse) => {
    setApplication(app);
    setStep((s) => s + 1);
  };

  return (
    <div style={{ maxWidth: 640, margin: "0 auto" }}>
      <div style={{ marginBottom: 8 }}>
        <h1>Client Onboarding</h1>
        <p className="muted">Open a discretionary PMS account · minimum ₹50,00,000</p>
      </div>

      {!done && <Stepper steps={STEPS} current={step} />}

      <Card>
        {done && application ? (
          <div className="center fade-in" style={{ padding: "16px 0" }}>
            <div className="success-check">✓</div>
            <h2>Submitted for review</h2>
            <p className="muted">
              Application <span className="mono">{application.id.slice(0, 8)}</span> is now{" "}
              <strong className="gold">{application.status.replace(/_/g, " ")}</strong>.
              <br />Compliance will activate the PMS account shortly.
            </p>
            <div className="row" style={{ justifyContent: "center", marginTop: 20 }}>
              <Link to="/clients"><Button variant="primary">View Clients</Button></Link>
              <Button variant="ghost" onClick={() => { setStep(0); setApplication(null); setDone(false); }}>
                New Application
              </Button>
            </div>
          </div>
        ) : (
          <>
            {step === 0 && <PersonalDetailsStep onNext={advance} />}
            {step === 1 && application && (
              <KycStep applicationId={application.id} onNext={advance} />
            )}
            {step === 2 && application && (
              <RiskProfileStep applicationId={application.id} onNext={advance} />
            )}
            {step === 3 && application && (
              <AgreementStep applicationId={application.id} onDone={(app) => { setApplication(app); setDone(true); }} />
            )}
          </>
        )}
      </Card>
    </div>
  );
}
