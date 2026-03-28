import { useState } from "react";

export default function FHIRPanel({ bundle, loading }) {
  const [openIdx, setOpenIdx] = useState(null);

  if (loading) {
    return (
      <div className="loading-state">
        <div className="pulse-ring" />
        <p>Building FHIR R4 bundle...</p>
      </div>
    );
  }

  if (!bundle) return null;

  const handleExport = () => {
    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `fhir-bundle-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const resources = bundle.entry || [];

  const typeColors = {
    Patient: "#4da6ff",
    Encounter: "#00d4aa",
    Condition: "#f5a623",
    Observation: "#a78bfa",
    MedicationRequest: "#fb7185",
    ServiceRequest: "#34d399",
  };

  return (
    <div className="fhir-panel">
      <div className="fhir-header">
        <div>
          <div className="fhir-title">FHIR R4 Bundle</div>
          <div style={{ fontSize: 11, color: "var(--text3)", marginTop: 2 }}>
            {resources.length} resources · resourceType: Bundle
          </div>
        </div>
        <button className="export-btn" onClick={handleExport}>⬇ Export JSON</button>
      </div>

      <div className="fhir-resources">
        {resources.map((entry, i) => {
          const res = entry.resource;
          const type = res.resourceType;
          const color = typeColors[type] || "#8fa3b8";
          const isOpen = openIdx === i;

          return (
            <div key={i} className="fhir-resource">
              <div className="resource-header" onClick={() => setOpenIdx(isOpen ? null : i)}>
                <span className="resource-type" style={{ color, borderColor: color + "40", background: color + "15" }}>
                  {type}
                </span>
                <span className="resource-id">{res.id || `resource-${i}`}</span>
                <span className={`chevron ${isOpen ? "open" : ""}`}>▶</span>
              </div>
              <div className={`resource-body ${isOpen ? "open" : ""}`}>
                <pre className="resource-json">{JSON.stringify(res, null, 2)}</pre>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
