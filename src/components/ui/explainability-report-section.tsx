import React from "react";

const leadNames: Record<string, string> = {
  lead_1: "Lead I", lead_2: "aVR", lead_3: "V1", lead_4: "V4",
  lead_5: "Lead II", lead_6: "aVL", lead_7: "V2", lead_8: "V5",
  lead_9: "Lead III", lead_10: "aVF", lead_11: "V3", lead_12: "V6",
};

const territories: Record<string, string> = {
  "Lead I":"Lateral","Lead II":"Inferior","Lead III":"Inferior",
  "aVR":"Cavity","aVL":"Lateral","aVF":"Inferior",
  "V1":"Septal","V2":"Septal","V3":"Anterior","V4":"Anterior","V5":"Lateral","V6":"Lateral"
};

interface ExplainabilityReportSectionProps {
  explainability?: {
    class_probabilities?: Record<string, number>;
    individual_votes?: Record<string, { predicted?: string; confidence?: number | null }>;
    lead_importance?: { chart?: string };
    clinical_interpretation?: string[];
    error?: string;
  };
  annotatedImages?: Record<string, string>;
  prediction?: string;
  onZoomImage: (src: string) => void;
}

/** Clinical note filter — keeps only safe model-level observations */
const FILTER_KEYWORDS = [
  'axis', 'deviation', 'PR interval', 'QRS duration', 'QT ', 'QTc',
  'ST elevation', 'ST depression', 'ST segment', 'pathological Q',
  'T-wave inversion', 'T wave inversion', 'peaked', 'flattened',
  'irregular rhythm', 'territory', 'anterior wall', 'inferior wall',
  'lateral wall', 'septal', 'urgent', 'immediate',
  'Lead I', 'Lead II', 'Lead III', 'aVR', 'aVL', 'aVF',
  'V1', 'V2', 'V3', 'V4', 'V5', 'V6','hr:',
'heart rate',
'tachycardia',
'bradycardia'
];

function filterNotes(notes: string[]): string[] {
  return notes.filter(note => {
    const lower = note.toLowerCase();
    return !FILTER_KEYWORDS.some(kw => lower.includes(kw.toLowerCase()));
  });
}

export function ExplainabilityReportSection({
  explainability: explain,
  annotatedImages,
  prediction,
  onZoomImage,
}: ExplainabilityReportSectionProps) {

  // No explainability data at all → graceful fallback
  if (!explain) {
    return (
      <div className="explainability-disclaimer" style={{ textAlign: 'center', marginTop: '2rem' }}>
        <span style={{ fontSize: '1.3rem' }}>ℹ️</span>
        <div style={{ marginTop: '0.5rem', fontWeight: 600 }}>
          Explainability report is not available for this previous analysis.
        </div>
        <div style={{ marginTop: '0.3rem', fontSize: '0.8rem', opacity: 0.7 }}>
          This report was generated before the explainability module was integrated.
        </div>
      </div>
    );
  }

  // Explainability error
  if (explain.error) {
    return (
      <div className="explainability-disclaimer" style={{ borderColor: '#f59e0b' }}>
        ⚠️ Prediction completed successfully, but the explainability report could not be generated.
        <details style={{ marginTop: '0.5rem', fontSize: '0.75rem' }}>
          <summary style={{ cursor: 'pointer' }}>Technical details</summary>
          <pre style={{ textAlign: 'left', whiteSpace: 'pre-wrap', marginTop: '0.3rem' }}>{explain.error}</pre>
        </details>
      </div>
    );
  }

  const filteredNotes = filterNotes(explain.clinical_interpretation || []);

  return (
    <>
      <h3 className="text-3xl font-bold text-center mb-4 mt-12" style={{ color: 'var(--text-primary, #e2e8f0)' }}>
        ECG Explainability Report
      </h3>
      <div className="explainability-disclaimer">
        ⚕️ AI-generated explainability is intended to support clinical review. It is not a final medical diagnosis.
        All findings must be verified by a qualified physician before clinical decisions.
      </div>

      {/* A. Class Probability Distribution */}
      {explain.class_probabilities && Object.keys(explain.class_probabilities).length > 0 && (
        <div className="explainability-section">
          <div className="explainability-section-header"><span className="icon">📊</span><h4>Class Probability Distribution</h4></div>
          <div className="probability-bars">
            {Object.entries(explain.class_probabilities).sort(([,a],[,b]) => b - a).map(([cls, prob]) => {
              const maxProb = Math.max(...Object.values(explain.class_probabilities!));
              const isPredicted = prob === maxProb;
              return (
                <div key={cls} className="probability-bar-row">
                  <div className="probability-bar-label">
                    {cls}
                    {isPredicted && <span className="probability-bar-predicted">Predicted</span>}
                  </div>
                  <div className="probability-bar-track">
                    <div className={`probability-bar-fill ${isPredicted ? 'predicted' : 'other'}`} style={{ width: `${Math.max(prob, 2)}%` }}>
                      {prob >= 8 ? `${prob.toFixed(1)}%` : ''}
                    </div>
                  </div>
                  {prob < 8 && <span className="probability-bar-pct">{prob.toFixed(1)}%</span>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* B. Individual Classifier Votes */}
      {explain.individual_votes && Object.keys(explain.individual_votes).length > 0 && (
        <div className="explainability-section">
          <div className="explainability-section-header"><span className="icon">🗳️</span><h4>Individual Classifier Votes</h4></div>
          <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.8rem', marginBottom: '1rem' }}>The ensemble combines 5 independent classifiers. Green border = agrees with final prediction.</p>
          <div className="model-votes-grid">
            {Object.entries(explain.individual_votes).map(([model, data]) => {
              const agrees = data.predicted && prediction && prediction.includes(data.predicted.split(' ').pop() || '');
              const conf = data.confidence;
              const confClass = conf != null ? (conf >= 85 ? 'high' : conf >= 65 ? 'medium' : 'low') : '';
              return (
                <div key={model} className={`model-vote-card ${agrees ? 'agrees' : 'disagrees'}`}>
                  <div className="model-vote-card-name">{model}</div>
                  <div className="model-vote-card-prediction">{data.predicted || 'N/A'}</div>
                  {conf != null && <div className={`model-vote-card-conf ${confClass}`}>{conf.toFixed(1)}%</div>}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* C. Lead Importance */}
      {explain.lead_importance?.chart && (
        <div className="explainability-section">
          <div className="explainability-section-header"><span className="icon">🔬</span><h4>Lead Contribution to Prediction</h4></div>
          <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>Which ECG leads had the most influence on the model's decision.</p>
          <div className="lead-importance-chart" onClick={() => onZoomImage(explain.lead_importance!.chart!)}>
            <img src={explain.lead_importance.chart} alt="Lead Importance" />
          </div>
        </div>
      )}

      {/* D. PQRST Annotated Leads */}
      {annotatedImages && Object.keys(annotatedImages).length > 0 && (
        <div className="mb-12">
          <h4 className="text-xl font-semibold pb-2 mb-6 border-b-2 border-gray-200 dark:border-gray-700" style={{ color: 'var(--text-primary, #e2e8f0)' }}>
            6. PQRST-Annotated ECG Leads
          </h4>
          <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.85rem', marginBottom: '1rem' }}>Live PQRST wave markers overlaid on raw lead images. Click any lead to zoom.</p>
          <div className="annotated-leads-grid">
            {Array.from({ length: 12 }).map((_, i) => {
              const key = `lead_${i + 1}`;
              if (!annotatedImages[key]) return null;
              return (
                <div key={key} className="annotated-lead-card" onClick={() => onZoomImage(annotatedImages[key])}>
                  <div className="annotated-lead-card-label">
                    {leadNames[key] || key}
                    <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary, #64748b)' }}>{territories[leadNames[key]] || ''}</span>
                  </div>
                  <img src={annotatedImages[key]} alt={`PQRST ${leadNames[key]}`} />
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* E. Clinical Notes (filtered) */}
      {filteredNotes.length > 0 && (
        <div className="explainability-section">
          <div className="explainability-section-header"><span className="icon">📝</span><h4>Clinical Interpretation Notes</h4></div>
          <p style={{ color: 'var(--text-secondary, #94a3b8)', fontSize: '0.8rem', marginBottom: '0.75rem' }}>AI-generated model-level observations.</p>
          <div className="clinical-notes">
            {filteredNotes.map((note, i) => (
              <div key={i} className="clinical-note-item" dangerouslySetInnerHTML={{ __html: note.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>') }} />
            ))}
          </div>
        </div>
      )}
    </>
  );
}
