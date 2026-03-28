/**
 * Build a FHIR R4 Bundle from extracted clinical entities
 */
export function buildFHIRBundle(entities) {
  const now = new Date().toISOString();
  const patientId = `patient-${Date.now()}`;
  const encounterId = `encounter-${Date.now()}`;

  const entries = [];

  // ── Patient Resource ──────────────────────────────────────
  const patient = {
    resourceType: "Patient",
    id: patientId,
    meta: { profile: ["http://hl7.org/fhir/StructureDefinition/Patient"] },
    text: {
      status: "generated",
      div: `<div>Patient: ${entities.patient_name || "Unknown"}</div>`,
    },
    name: entities.patient_name
      ? [{ use: "official", text: entities.patient_name }]
      : [{ use: "official", text: "Unknown Patient" }],
    gender: normalizeGender(entities.patient_gender),
    birthDate: entities.patient_age ? estimateBirthYear(entities.patient_age) : undefined,
  };
  cleanObj(patient);
  entries.push({ fullUrl: `urn:uuid:${patientId}`, resource: patient });

  // ── Encounter Resource ────────────────────────────────────
  const encounter = {
    resourceType: "Encounter",
    id: encounterId,
    status: "finished",
    class: {
      system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
      code: "AMB",
      display: "ambulatory",
    },
    type: [
      {
        coding: [
          {
            system: "http://snomed.info/sct",
            code: "11429006",
            display: "Consultation",
          },
        ],
      },
    ],
    subject: { reference: `urn:uuid:${patientId}` },
    period: { start: now },
    reasonCode: entities.chief_complaint
      ? [{ text: entities.chief_complaint }]
      : undefined,
  };
  cleanObj(encounter);
  entries.push({ fullUrl: `urn:uuid:${encounterId}`, resource: encounter });

  // ── Condition Resources (Diagnoses) ──────────────────────
  (entities.diagnosis || []).forEach((diag, i) => {
    const condId = `condition-${i}-${Date.now()}`;
    const condition = {
      resourceType: "Condition",
      id: condId,
      clinicalStatus: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
            code: "active",
          },
        ],
      },
      verificationStatus: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/condition-ver-status",
            code: "provisional",
          },
        ],
      },
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/condition-category",
              code: "encounter-diagnosis",
              display: "Encounter Diagnosis",
            },
          ],
        },
      ],
      code: { text: diag },
      subject: { reference: `urn:uuid:${patientId}` },
      encounter: { reference: `urn:uuid:${encounterId}` },
      recordedDate: now,
    };
    entries.push({ fullUrl: `urn:uuid:${condId}`, resource: condition });
  });

  // ── Observation Resources (Vitals) ───────────────────────
  const vitalCodings = {
    BP: { code: "55284-4", display: "Blood pressure systolic and diastolic", unit: "mm[Hg]" },
    Temperature: { code: "8310-5", display: "Body temperature", unit: "Cel" },
    SpO2: { code: "2708-6", display: "Oxygen saturation", unit: "%" },
    Pulse: { code: "8867-4", display: "Heart rate", unit: "/min" },
    Weight: { code: "29463-7", display: "Body weight", unit: "kg" },
  };

  Object.entries(entities.vitals || {}).forEach(([key, value], i) => {
    if (!value) return;
    const coding = vitalCodings[key] || { code: "unknown", display: key, unit: "" };
    const obsId = `observation-${i}-${Date.now()}`;
    const obs = {
      resourceType: "Observation",
      id: obsId,
      status: "final",
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/observation-category",
              code: "vital-signs",
              display: "Vital Signs",
            },
          ],
        },
      ],
      code: {
        coding: [
          {
            system: "http://loinc.org",
            code: coding.code,
            display: coding.display,
          },
        ],
        text: key,
      },
      subject: { reference: `urn:uuid:${patientId}` },
      encounter: { reference: `urn:uuid:${encounterId}` },
      effectiveDateTime: now,
      valueString: value,
    };
    entries.push({ fullUrl: `urn:uuid:${obsId}`, resource: obs });
  });

  // ── Condition Resources (Symptoms) ───────────────────────
  (entities.symptoms || []).forEach((symptom, i) => {
    const condId = `symptom-${i}-${Date.now()}`;
    const condition = {
      resourceType: "Condition",
      id: condId,
      clinicalStatus: {
        coding: [
          {
            system: "http://terminology.hl7.org/CodeSystem/condition-clinical",
            code: "active",
          },
        ],
      },
      category: [
        {
          coding: [
            {
              system: "http://terminology.hl7.org/CodeSystem/condition-category",
              code: "problem-list-item",
              display: "Problem List Item",
            },
          ],
        },
      ],
      code: { text: symptom },
      subject: { reference: `urn:uuid:${patientId}` },
      encounter: { reference: `urn:uuid:${encounterId}` },
      onsetDateTime: entities.duration
        ? undefined
        : undefined,
      note: entities.duration ? [{ text: `Duration: ${entities.duration}` }] : undefined,
      recordedDate: now,
    };
    cleanObj(condition);
    entries.push({ fullUrl: `urn:uuid:${condId}`, resource: condition });
  });

  // ── MedicationRequest Resources ───────────────────────────
  (entities.medications || []).forEach((med, i) => {
    const medId = `medication-${i}-${Date.now()}`;
    const medReq = {
      resourceType: "MedicationRequest",
      id: medId,
      status: "active",
      intent: "order",
      medicationCodeableConcept: { text: med },
      subject: { reference: `urn:uuid:${patientId}` },
      encounter: { reference: `urn:uuid:${encounterId}` },
      authoredOn: now,
      dosageInstruction: [{ text: med }],
    };
    entries.push({ fullUrl: `urn:uuid:${medId}`, resource: medReq });
  });

  // ── ServiceRequest Resources (Lab Orders) ────────────────
  (entities.lab_orders || []).forEach((lab, i) => {
    const labId = `service-${i}-${Date.now()}`;
    const svcReq = {
      resourceType: "ServiceRequest",
      id: labId,
      status: "active",
      intent: "order",
      code: { text: lab },
      subject: { reference: `urn:uuid:${patientId}` },
      encounter: { reference: `urn:uuid:${encounterId}` },
      authoredOn: now,
    };
    entries.push({ fullUrl: `urn:uuid:${labId}`, resource: svcReq });
  });

  // ── Bundle ────────────────────────────────────────────────
  return {
    resourceType: "Bundle",
    id: `bundle-${Date.now()}`,
    meta: {
      lastUpdated: now,
      profile: ["http://hl7.org/fhir/StructureDefinition/Bundle"],
    },
    type: "transaction",
    timestamp: now,
    entry: entries,
  };
}

// Helpers
function normalizeGender(g) {
  if (!g) return "unknown";
  const l = g.toLowerCase();
  if (l.includes("male") || l.includes("purush") || l.includes("m")) return "male";
  if (l.includes("female") || l.includes("mahila") || l.includes("f")) return "female";
  return "unknown";
}

function estimateBirthYear(age) {
  const num = parseInt(age);
  if (isNaN(num)) return undefined;
  return `${new Date().getFullYear() - num}`;
}

function cleanObj(obj) {
  Object.keys(obj).forEach((k) => {
    if (obj[k] === undefined || obj[k] === null) delete obj[k];
  });
}
