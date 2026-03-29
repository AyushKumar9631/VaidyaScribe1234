/**
 * ExportPDFButton
 *
 * Generates a professional, prescription-style PDF from the four data
 * sections (Transcript, Clinical Notes, SOAP Note, FHIR Bundle) without
 * making any external API calls. Uses jsPDF + html2canvas rendered from
 * a hidden off-screen DOM node.
 */

import { useState } from "react";

export default function ExportPDFButton({
  transcript,
  clinicalData,
  soapNote,
  fhirBundle,
  patientInfo,
  doctorProfile,   // { full_name, registration_id, specialization, qualification, photo_url }
  hospitalName,
  hospitalLogo,    // optional data-URL or public URL
}) {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    setLoading(true);
    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: html2canvas } = await import("html2canvas");

      /* ── Build the hidden prescription HTML ─────────────────────────── */
      const wrapper = document.createElement("div");
      wrapper.style.cssText = `
        position: fixed; left: -9999px; top: 0;
        width: 794px; background: #ffffff; font-family: 'Georgia', 'Times New Roman', serif;
        color: #1a1a1a; line-height: 1.55; font-size: 13px;
      `;

      // Preload doctor photo as data-URL if needed
      let doctorPhotoDataUrl = "";
      if (doctorProfile?.photo_url) {
        try {
          doctorPhotoDataUrl = await urlToDataUrl(doctorProfile.photo_url);
        } catch (_) {}
      }

      let hospitalLogoDataUrl = "";
      if (hospitalLogo) {
        try {
          hospitalLogoDataUrl = await urlToDataUrl(hospitalLogo);
        } catch (_) {}
      }

      const now = new Date();
      const dateStr = now.toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
      const timeStr = now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" });

      /* ─── Clinical data helpers ─────────────────────────────────────── */
      const cd = clinicalData || {};
      const soap = soapNote || {};

      const listHtml = (arr) =>
        Array.isArray(arr) && arr.length
          ? arr.map((v) => `<li style="margin-bottom:3px">${esc(v)}</li>`).join("")
          : "<li style='color:#999'>—</li>";

      const vitalsHtml = (vitals) => {
        if (!vitals || !Object.keys(vitals).length) return "<span style='color:#999'>—</span>";
        return Object.entries(vitals)
          .map(
            ([k, v]) =>
              `<span style="display:inline-block;margin:2px 8px 2px 0;background:#f0f8f4;border:1px solid #b8ddd0;border-radius:4px;padding:2px 8px;font-size:12px"><b>${esc(k)}</b>: ${esc(v)}</span>`
          )
          .join(" ");
      };

      const fhirSummary = () => {
        if (!fhirBundle?.entry?.length) return "<span style='color:#999'>No FHIR data</span>";
        return fhirBundle.entry
          .map((e) => {
            const r = e.resource;
            return `<div style="margin-bottom:6px;padding:6px 10px;background:#f9fafb;border-left:3px solid #12b886;border-radius:3px">
              <b style="color:#0a7755;font-size:12px">${esc(r.resourceType)}</b>
              <span style="color:#666;font-size:11px;margin-left:8px">${esc(r.id || "")}</span>
              <div style="font-size:11px;color:#444;margin-top:2px;font-family:monospace;word-break:break-all">
                ${briefFhir(r)}
              </div>
            </div>`;
          })
          .join("");
      };

      wrapper.innerHTML = `
        <div style="padding:0;page-break-inside:avoid">

          <!-- ═══════════════ LETTERHEAD ═══════════════ -->
          <div style="
            background: linear-gradient(135deg,#0a7755 0%,#12b886 100%);
            color:#fff; padding:28px 36px 22px; position:relative;
            border-bottom:4px solid #0a7755;
          ">
            <!-- Hospital row -->
            ${ hospitalName ? `
            <div style="display:flex;align-items:center;gap:12px;margin-bottom:14px;
              padding-bottom:14px;border-bottom:1px solid rgba(255,255,255,0.25)">
              ${ hospitalLogoDataUrl
                ? `<img src="${hospitalLogoDataUrl}" style="height:44px;width:auto;border-radius:6px;background:#fff;padding:3px"/>`
                : `<div style="width:44px;height:44px;border-radius:8px;background:rgba(255,255,255,0.2);
                    display:flex;align-items:center;justify-content:center;font-size:22px">🏥</div>` }
              <div>
                <div style="font-size:18px;font-weight:700;letter-spacing:0.01em">${esc(hospitalName)}</div>
                <div style="font-size:11px;opacity:0.8;margin-top:2px">Registered Medical Institution</div>
              </div>
            </div>` : "" }

            <!-- Doctor + date row -->
            <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px">
              <div style="display:flex;align-items:center;gap:14px">
                ${ doctorPhotoDataUrl
                  ? `<img src="${doctorPhotoDataUrl}" style="width:56px;height:56px;border-radius:50%;object-fit:cover;border:2px solid rgba(255,255,255,0.7)"/>`
                  : `<div style="width:56px;height:56px;border-radius:50%;background:rgba(255,255,255,0.2);
                      display:flex;align-items:center;justify-content:center;font-size:26px">👤</div>` }
                <div>
                  <div style="font-size:20px;font-weight:700">${esc(doctorProfile?.full_name || "Doctor")}</div>
                  ${ doctorProfile?.qualification
                    ? `<div style="font-size:12px;opacity:0.9;margin-top:2px">${esc(doctorProfile.qualification)}</div>` : "" }
                  ${ doctorProfile?.specialization
                    ? `<div style="font-size:12px;opacity:0.8">${esc(doctorProfile.specialization)}</div>` : "" }
                  ${ doctorProfile?.registration_id
                    ? `<div style="font-size:11px;opacity:0.75;margin-top:3px;font-family:monospace">
                        Reg. No.: ${esc(doctorProfile.registration_id)}</div>` : "" }
                </div>
              </div>
              <div style="text-align:right;font-size:12px;opacity:0.85;white-space:nowrap">
                <div style="font-size:11px;opacity:0.7;text-transform:uppercase;letter-spacing:0.08em">Date &amp; Time</div>
                <div style="font-weight:600;margin-top:2px">${dateStr}</div>
                <div>${timeStr}</div>
              </div>
            </div>
          </div>

          <!-- ═══════════════ PATIENT INFO BAND ═══════════════ -->
          <div style="
            background:#f0faf6; border-bottom:2px solid #c6e9dc;
            padding:14px 36px; display:flex; gap:40px; flex-wrap:wrap;
          ">
            ${ patientInfo?.patientName ? `
            <div>
              <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#0a7755;font-weight:600">Patient Name</div>
              <div style="font-size:15px;font-weight:700;color:#1a1a1a;margin-top:2px">${esc(patientInfo.patientName)}</div>
            </div>` : "" }
            ${ patientInfo?.patientId ? `
            <div>
              <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#0a7755;font-weight:600">Patient ID</div>
              <div style="font-size:14px;font-weight:600;color:#1a1a1a;margin-top:2px;font-family:monospace">${esc(patientInfo.patientId)}</div>
            </div>` : "" }
            ${ cd.patient_age ? `
            <div>
              <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#0a7755;font-weight:600">Age</div>
              <div style="font-size:14px;font-weight:600;color:#1a1a1a;margin-top:2px">${esc(cd.patient_age)}</div>
            </div>` : "" }
            ${ cd.patient_gender ? `
            <div>
              <div style="font-size:10px;text-transform:uppercase;letter-spacing:0.08em;color:#0a7755;font-weight:600">Gender</div>
              <div style="font-size:14px;font-weight:600;color:#1a1a1a;margin-top:2px">${esc(cd.patient_gender)}</div>
            </div>` : "" }
          </div>

          <!-- ═══════════════ BODY ═══════════════ -->
          <div style="padding:24px 36px;display:grid;grid-template-columns:1fr 1fr;gap:20px">

            <!-- Chief Complaint -->
            ${ cd.chief_complaint ? `
            <div style="grid-column:1/-1;border:1px solid #c6e9dc;border-radius:8px;overflow:hidden">
              <div style="background:#e8f8f2;padding:8px 14px;font-size:11px;font-weight:700;
                text-transform:uppercase;letter-spacing:0.08em;color:#0a7755">
                🗣️ Chief Complaint
              </div>
              <div style="padding:12px 14px;font-size:14px;color:#1a1a1a">
                ${esc(cd.chief_complaint)}
              </div>
            </div>` : "" }

            <!-- Symptoms -->
            ${ (cd.symptoms?.length) ? `
            <div style="border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">
              <div style="background:#f7f7f7;padding:8px 14px;font-size:11px;font-weight:700;
                text-transform:uppercase;letter-spacing:0.08em;color:#555">
                🌡️ Symptoms
              </div>
              <div style="padding:12px 14px">
                <ul style="margin:0;padding-left:16px;color:#1a1a1a">${listHtml(cd.symptoms)}</ul>
              </div>
            </div>` : "" }

            <!-- Diagnosis -->
            ${ (cd.diagnosis?.length) ? `
            <div style="border:1px solid #fde8c8;border-radius:8px;overflow:hidden">
              <div style="background:#fff8ee;padding:8px 14px;font-size:11px;font-weight:700;
                text-transform:uppercase;letter-spacing:0.08em;color:#c47d0a">
                🔬 Diagnosis
              </div>
              <div style="padding:12px 14px">
                <ul style="margin:0;padding-left:16px;color:#1a1a1a">${listHtml(cd.diagnosis)}</ul>
              </div>
            </div>` : "" }

            <!-- Vitals -->
            ${ (cd.vitals && Object.keys(cd.vitals).length) ? `
            <div style="grid-column:1/-1;border:1px solid #d4e3da;border-radius:8px;overflow:hidden">
              <div style="background:#eef5f2;padding:8px 14px;font-size:11px;font-weight:700;
                text-transform:uppercase;letter-spacing:0.08em;color:#3d6050">
                💓 Vitals
              </div>
              <div style="padding:12px 14px">${vitalsHtml(cd.vitals)}</div>
            </div>` : "" }

            <!-- Medications — full-width, Rx style -->
            ${ (cd.medications?.length) ? `
            <div style="grid-column:1/-1;border:2px solid #12b886;border-radius:8px;overflow:hidden">
              <div style="background:#e8f8f2;padding:8px 14px;font-size:11px;font-weight:700;
                text-transform:uppercase;letter-spacing:0.08em;color:#0a7755;
                display:flex;align-items:center;gap:8px">
                <span style="font-size:22px;font-style:italic;font-family:Georgia,serif;color:#0a7755">℞</span>
                Medications Prescribed
              </div>
              <div style="padding:12px 14px">
                ${cd.medications.map((m, i) => `
                  <div style="display:flex;align-items:flex-start;gap:10px;
                    padding:8px 0;${i < cd.medications.length - 1 ? "border-bottom:1px solid #e0f0e8" : ""}">
                    <span style="color:#12b886;font-weight:700;min-width:20px">${i + 1}.</span>
                    <span style="color:#1a1a1a">${esc(m)}</span>
                  </div>`).join("")}
              </div>
            </div>` : "" }

            <!-- Lab Orders -->
            ${ (cd.lab_orders?.length) ? `
            <div style="border:1px solid #d9d4fd;border-radius:8px;overflow:hidden">
              <div style="background:#f4f3ff;padding:8px 14px;font-size:11px;font-weight:700;
                text-transform:uppercase;letter-spacing:0.08em;color:#6c5ce7">
                🧪 Lab Orders
              </div>
              <div style="padding:12px 14px">
                <ul style="margin:0;padding-left:16px;color:#1a1a1a">${listHtml(cd.lab_orders)}</ul>
              </div>
            </div>` : "" }

            <!-- Follow Up -->
            ${ cd.follow_up ? `
            <div style="border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">
              <div style="background:#f7f7f7;padding:8px 14px;font-size:11px;font-weight:700;
                text-transform:uppercase;letter-spacing:0.08em;color:#555">
                📅 Follow Up
              </div>
              <div style="padding:12px 14px;color:#1a1a1a">${esc(cd.follow_up)}</div>
            </div>` : "" }
          </div>

          <!-- ═══════════════ SOAP NOTE ═══════════════ -->
          ${ (soap.subjective || soap.objective || soap.assessment || soap.plan) ? `
          <div style="margin:0 36px 24px;border:1px solid #d4e3da;border-radius:8px;overflow:hidden">
            <div style="background:#eef5f2;padding:10px 14px;font-size:11px;font-weight:700;
              text-transform:uppercase;letter-spacing:0.08em;color:#3d6050;border-bottom:1px solid #d4e3da">
              📋 SOAP Note
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0">
              ${[
                { letter: "S", label: "Subjective", key: "subjective", bg: "#fafcfb" },
                { letter: "O", label: "Objective",  key: "objective",  bg: "#f7faf8" },
                { letter: "A", label: "Assessment", key: "assessment", bg: "#fafcfb" },
                { letter: "P", label: "Plan",        key: "plan",       bg: "#f7faf8" },
              ].map((f, i) => soap[f.key] ? `
                <div style="padding:12px 14px;background:${f.bg};
                  ${i % 2 === 0 ? "border-right:1px solid #d4e3da;" : ""}
                  ${i < 2 ? "border-bottom:1px solid #d4e3da;" : ""}">
                  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
                    <span style="width:22px;height:22px;border-radius:50%;background:#12b886;
                      color:#fff;font-weight:700;font-size:12px;display:flex;
                      align-items:center;justify-content:center;flex-shrink:0">${f.letter}</span>
                    <span style="font-weight:600;font-size:12px;color:#0a7755">${f.label}</span>
                  </div>
                  <div style="font-size:12px;color:#1a1a1a;white-space:pre-wrap">${esc(soap[f.key])}</div>
                </div>` : `<div style="padding:12px 14px;background:${f.bg};
                  ${i % 2 === 0 ? "border-right:1px solid #d4e3da;" : ""}
                  ${i < 2 ? "border-bottom:1px solid #d4e3da;" : ""}"></div>`
              ).join("")}
            </div>
          </div>` : "" }

          <!-- ═══════════════ TRANSCRIPT ═══════════════ -->
          ${ transcript ? `
          <div style="margin:0 36px 24px;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">
            <div style="background:#f7f7f7;padding:10px 14px;font-size:11px;font-weight:700;
              text-transform:uppercase;letter-spacing:0.08em;color:#555;border-bottom:1px solid #e0e0e0">
              📝 Consultation Transcript
            </div>
            <div style="padding:14px;font-size:12px;color:#333;line-height:1.7;
              white-space:pre-wrap;max-height:300px;overflow:hidden">${esc(transcript)}</div>
          </div>` : "" }

          <!-- ═══════════════ FHIR SUMMARY ═══════════════ -->
          ${ fhirBundle?.entry?.length ? `
          <div style="margin:0 36px 24px;border:1px solid #e0e0e0;border-radius:8px;overflow:hidden">
            <div style="background:#f7f7f7;padding:10px 14px;font-size:11px;font-weight:700;
              text-transform:uppercase;letter-spacing:0.08em;color:#555;border-bottom:1px solid #e0e0e0">
              ⚕️ FHIR R4 Bundle Summary (${fhirBundle.entry.length} Resources)
            </div>
            <div style="padding:14px;font-size:12px">${fhirSummary()}</div>
          </div>` : "" }

          <!-- ═══════════════ FOOTER / SIGNATURE ═══════════════ -->
          <div style="
            margin:0 36px; padding:16px 0;
            border-top:2px solid #12b886;
            display:flex; justify-content:space-between; align-items:flex-end;
          ">
            <div style="font-size:11px;color:#666">
              <div>Generated by <b>VaidyaScribe</b> · ${dateStr} ${timeStr}</div>
              <div style="margin-top:3px;color:#999">This is a digitally generated clinical document.</div>
            </div>
            <div style="text-align:center">
              <div style="width:160px;border-top:1px solid #1a1a1a;padding-top:6px;font-size:11px;color:#444">
                ${ doctorProfile?.full_name ? esc(doctorProfile.full_name) : "Doctor's Signature" }
              </div>
              ${ doctorProfile?.registration_id
                ? `<div style="font-size:10px;color:#666;margin-top:2px;font-family:monospace">
                    Reg. No.: ${esc(doctorProfile.registration_id)}</div>` : "" }
            </div>
          </div>
          <div style="height:24px"></div>
        </div>
      `;

      document.body.appendChild(wrapper);

      /* ── Render to canvas & build PDF ───────────────────────────────── */
      const canvas = await html2canvas(wrapper, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: "#ffffff",
        logging: false,
        width: 794,
      });

      document.body.removeChild(wrapper);

      const imgData = canvas.toDataURL("image/jpeg", 0.95);
      const pdf = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

      const A4_W = 210;
      const A4_H = 297;
      const imgW = A4_W;
      const imgH = (canvas.height * A4_W) / canvas.width;

      // Paginate if needed
      let yPos = 0;
      let pageHeight = A4_H;
      let remaining = imgH;

      while (remaining > 0) {
        pdf.addImage(imgData, "JPEG", 0, -yPos, imgW, imgH);
        remaining -= pageHeight;
        yPos += pageHeight;
        if (remaining > 0) pdf.addPage();
      }

      const fileName = `prescription_${
        (patientInfo?.patientName || "patient").replace(/\s+/g, "_")
      }_${now.toISOString().slice(0, 10)}.pdf`;

      pdf.save(fileName);
    } catch (err) {
      console.error("PDF export failed:", err);
      alert("PDF export failed: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className="export-pdf-btn"
      onClick={handleExport}
      disabled={loading}
      title="Export prescription as PDF"
    >
      {loading ? (
        <>
          <span className="export-pdf-spinner" />
          Generating…
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="12" y1="18" x2="12" y2="12"/>
            <line x1="9" y1="15" x2="15" y2="15"/>
          </svg>
          Export PDF
        </>
      )}
    </button>
  );
}

/* ── Helpers ──────────────────────────────────────────────────────────────── */

function esc(str) {
  if (str == null) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function briefFhir(res) {
  // Pull out the most meaningful human-readable snippet from a FHIR resource
  const parts = [];
  if (res.name) {
    const n = Array.isArray(res.name) ? res.name[0] : res.name;
    if (n?.text) parts.push(esc(n.text));
    else if (n?.family) parts.push(esc([...(n.given || []), n.family].join(" ")));
  }
  if (res.code?.text) parts.push(esc(res.code.text));
  if (res.code?.coding?.[0]?.display) parts.push(esc(res.code.coding[0].display));
  if (res.valueQuantity) parts.push(`${esc(res.valueQuantity.value)} ${esc(res.valueQuantity.unit || "")}`);
  if (res.valueString) parts.push(esc(res.valueString));
  if (res.medicationCodeableConcept?.text) parts.push(esc(res.medicationCodeableConcept.text));
  if (res.dosageInstruction?.[0]?.text) parts.push(esc(res.dosageInstruction[0].text));
  if (res.status) parts.push(`status: ${esc(res.status)}`);
  return parts.slice(0, 3).join(" · ") || "(no summary)";
}

async function urlToDataUrl(url) {
  // For same-origin or CORS-enabled URLs
  const response = await fetch(url);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}
