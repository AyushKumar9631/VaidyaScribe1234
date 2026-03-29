import { useState, useEffect } from "react";

/**
 * Derives a SOAP note from clinical data extracted by Qwen3.
 * All four sections are editable after generation.
 */
export function deriveSoap(clinicalData, transcript) {
  if (!clinicalData) return { subjective: "", objective: "", assessment: "", plan: "" };

  const cd = clinicalData;

  // Subjective — what the patient reports
  const subjectiveParts = [];
  if (cd.chief_complaint) subjectiveParts.push(`Chief complaint: ${cd.chief_complaint}`);
  if (cd.duration)         subjectiveParts.push(`Duration: ${cd.duration}`);
  if (cd.symptoms?.length) subjectiveParts.push(`Symptoms: ${cd.symptoms.join(", ")}`);
  if (cd.patient_age || cd.patient_gender) {
    const demo = [cd.patient_age && `Age: ${cd.patient_age}`, cd.patient_gender && `Gender: ${cd.patient_gender}`].filter(Boolean).join(", ");
    subjectiveParts.push(demo);
  }

  // Objective — measurable findings / vitals
  const objectiveParts = [];
  if (cd.vitals && Object.keys(cd.vitals).length) {
    const v = Object.entries(cd.vitals).map(([k, val]) => `${k}: ${val}`).join(", ");
    objectiveParts.push(`Vitals — ${v}`);
  }
  if (cd.lab_orders?.length) objectiveParts.push(`Pending labs: ${cd.lab_orders.join(", ")}`);

  // Assessment — diagnosis / clinical impression
  const assessmentParts = [];
  if (cd.diagnosis?.length) assessmentParts.push(cd.diagnosis.join("; "));

  // Plan — medications + follow-up
  const planParts = [];
  if (cd.medications?.length) planParts.push(`Medications:\n${cd.medications.map(m => `  • ${m}`).join("\n")}`);
  if (cd.follow_up)           planParts.push(`Follow-up: ${cd.follow_up}`);
  if (cd.lab_orders?.length)  planParts.push(`Order labs: ${cd.lab_orders.join(", ")}`);

  return {
    subjective:  subjectiveParts.join("\n") || "",
    objective:   objectiveParts.join("\n")  || "",
    assessment:  assessmentParts.join("\n") || "",
    plan:        planParts.join("\n")        || "",
  };
}

// ── individual editable field ─────────────────────────────────────────────────
function SoapField({ label, letter, value, editing, onChange, placeholder }) {
  return (
    <div className="soap-field">
      <div className="soap-field-header">
        <span className="soap-letter">{letter}</span>
        <span className="soap-field-label">{label}</span>
      </div>
      {editing ? (
        <textarea
          className="soap-textarea"
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          rows={4}
          autoFocus={letter === "S"}
        />
      ) : (
        <pre className="soap-pre">{value || <span className="soap-empty">—</span>}</pre>
      )}
    </div>
  );
}

// ── main component ────────────────────────────────────────────────────────────
export default function SOAPPanel({ clinicalData, transcript, soap, onChange }) {
  const [editing, setEditing] = useState(false);

  // Populate from clinical data when it first arrives
  useEffect(() => {
    if (clinicalData && (!soap || (!soap.subjective && !soap.objective && !soap.assessment && !soap.plan))) {
      onChange(deriveSoap(clinicalData, transcript));
    }
  }, [clinicalData]);

  const update = (key) => (val) => onChange({ ...soap, [key]: val });

  const fields = [
    { letter: "S", label: "Subjective",  key: "subjective",  placeholder: "Patient's reported symptoms, history, chief complaint..." },
    { letter: "O", label: "Objective",   key: "objective",   placeholder: "Vitals, physical exam findings, lab results..." },
    { letter: "A", label: "Assessment",  key: "assessment",  placeholder: "Diagnosis, clinical impression, differential..." },
    { letter: "P", label: "Plan",        key: "plan",        placeholder: "Medications, follow-up, referrals, lab orders..." },
  ];

  if (!soap) {
    return (
      <div className="loading-state">
        <div className="pulse-ring" />
        <p>Generating SOAP note...</p>
      </div>
    );
  }

  return (
    <div className="soap-wrapper">
      <div className="soap-top-bar">
        <div>
          <span className="soap-heading">SOAP Note</span>
          {editing && <span className="soap-editing-badge">Editing</span>}
        </div>
        <button
          className={`soap-edit-btn ${editing ? "soap-edit-btn-done" : ""}`}
          onClick={() => setEditing(e => !e)}
        >
          {editing ? "✓ Done" : "✏️ Edit"}
        </button>
      </div>
      <div className="soap-grid">
        {fields.map(f => (
          <SoapField
            key={f.key}
            letter={f.letter}
            label={f.label}
            value={soap[f.key] || ""}
            editing={editing}
            onChange={update(f.key)}
            placeholder={f.placeholder}
          />
        ))}
      </div>
    </div>
  );
}
