import type React from "react";
import { useState } from "react";
import { useRiskProfile } from "../hooks/useOnboarding";
import type { ApplicationResponse } from "../types";
import { Button, SelectField, Toast } from "../../../components/ui";

const QUESTIONS = [
  "What is your investment horizon?",
  "How would you react to a 20% portfolio drop?",
  "What share of your wealth is being invested here?",
  "What is your primary objective?",
  "What is your prior experience with equities?",
];
const OPTIONS = [
  { label: "Very low risk", weight: 1 },
  { label: "Low", weight: 2 },
  { label: "Medium", weight: 3 },
  { label: "High", weight: 4 },
  { label: "Very high risk", weight: 5 },
];

export function RiskProfileStep({ applicationId, onNext }: {
  applicationId: string; onNext: (app: ApplicationResponse) => void;
}) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [apiError, setApiError] = useState<string | null>(null);
  const mutation = useRiskProfile(applicationId);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Object.keys(answers).length < QUESTIONS.length) {
      setApiError("Please answer all questions.");
      return;
    }
    setApiError(null);
    const payload = QUESTIONS.map((_, i) => ({ question_id: `q${i}`, weight: answers[i] }));
    mutation.mutate(payload, { onSuccess: onNext, onError: (e) => setApiError(e.message) });
  };

  return (
    <form onSubmit={submit} className="fade-in">
      <h2 style={{ marginBottom: 16 }}>Risk profiling</h2>
      {QUESTIONS.map((q, i) => (
        <SelectField key={i} label={`${i + 1}. ${q}`} defaultValue=""
          onChange={(e) => setAnswers({ ...answers, [i]: Number(e.target.value) })}>
          <option value="" disabled>Select…</option>
          {OPTIONS.map((o) => <option key={o.weight} value={o.weight}>{o.label}</option>)}
        </SelectField>
      ))}
      <Button variant="primary" block loading={mutation.isPending} type="submit">
        Submit Risk Profile
      </Button>
      {apiError && <Toast message={apiError} />}
    </form>
  );
}
