import type React from "react";
import { useState } from "react";
import { useRiskProfile } from "../hooks/useOnboarding";
import type { ApplicationResponse } from "../types";
import { Button, SelectField, Toast } from "../../../components/ui";

interface Question {
  text: string;
  options: { label: string; weight: number }[];
}

const QUESTIONS: Question[] = [
  {
    text: "What is your investment time horizon?",
    options: [
      { label: "Less than 1 year", weight: 1 },
      { label: "1 – 3 years", weight: 2 },
      { label: "3 – 5 years", weight: 3 },
      { label: "5 – 10 years", weight: 4 },
      { label: "More than 10 years", weight: 5 },
    ],
  },
  {
    text: "If your portfolio fell 20% in a single quarter, what would you do?",
    options: [
      { label: "Withdraw everything immediately", weight: 1 },
      { label: "Shift to safer instruments (debt / FD)", weight: 2 },
      { label: "Hold and wait for recovery", weight: 3 },
      { label: "Invest more to average down", weight: 4 },
      { label: "Significantly increase allocation", weight: 5 },
    ],
  },
  {
    text: "What proportion of your total net worth is this proposed investment?",
    options: [
      { label: "More than 50%", weight: 1 },
      { label: "30% – 50%", weight: 2 },
      { label: "15% – 30%", weight: 3 },
      { label: "5% – 15%", weight: 4 },
      { label: "Less than 5%", weight: 5 },
    ],
  },
  {
    text: "What is your primary investment objective?",
    options: [
      { label: "Capital preservation with minimal risk", weight: 1 },
      { label: "Regular income (dividends / interest)", weight: 2 },
      { label: "Balanced growth and income", weight: 3 },
      { label: "Long-term capital appreciation", weight: 4 },
      { label: "Aggressive growth — high return potential", weight: 5 },
    ],
  },
  {
    text: "How would you describe your experience with equity markets?",
    options: [
      { label: "No experience — first-time investor", weight: 1 },
      { label: "Limited — mutual funds / SIPs only", weight: 2 },
      { label: "Moderate — direct equity < 3 years", weight: 3 },
      { label: "Experienced — direct equity 3+ years", weight: 4 },
      { label: "Expert — derivatives, F&O, active trading", weight: 5 },
    ],
  },
  {
    text: "What is your current annual income bracket?",
    options: [
      { label: "Below ₹10,00,000", weight: 1 },
      { label: "₹10,00,000 – ₹25,00,000", weight: 2 },
      { label: "₹25,00,000 – ₹50,00,000", weight: 3 },
      { label: "₹50,00,000 – ₹1,00,00,000", weight: 4 },
      { label: "Above ₹1,00,00,000", weight: 5 },
    ],
  },
];

export function RiskProfileStep({
  applicationId,
  onNext,
}: {
  applicationId: string;
  onNext: (app: ApplicationResponse) => void;
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const mutation = useRiskProfile(applicationId);
  const answeredCount = Object.keys(answers).length;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (answeredCount < QUESTIONS.length) {
      setApiError("Please answer all questions before proceeding.");
      return;
    }
    setApiError(null);
    const payload = QUESTIONS.map((_, i) => ({
      question_id: `q${i}`,
      weight: answers[i],
    }));
    mutation.mutate(payload, {
      onSuccess: onNext,
      onError: (e) => setApiError(e.message),
    });
  };

  return (
    <form onSubmit={submit} className="fade-in">
      <h2 style={{ marginBottom: 4 }}>Risk Profiling Questionnaire</h2>
      <p
        className="muted"
        style={{ marginTop: 0, marginBottom: 20, fontSize: ".85rem" }}
      >
        As mandated by SEBI for suitability assessment · {answeredCount} of{" "}
        {QUESTIONS.length} answered
      </p>

      {QUESTIONS.map((q, i) => (
        <SelectField
          key={i}
          label={`${i + 1}. ${q.text}`}
          defaultValue=""
          onChange={(e) =>
            setAnswers({ ...answers, [i]: Number(e.target.value) })
          }
        >
          <option value="" disabled>
            Select your answer…
          </option>
          {q.options.map((o) => (
            <option key={o.weight} value={o.weight}>
              {o.label}
            </option>
          ))}
        </SelectField>
      ))}

      <Button
        variant="primary"
        block
        loading={mutation.isPending}
        type="submit"
      >
        Submit Risk Profile
      </Button>
      {apiError && <Toast message={apiError} />}
    </form>
  );
}
