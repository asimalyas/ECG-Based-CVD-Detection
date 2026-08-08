import React, { useState } from "react";
import { Download, MoreVertical, Trash2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { ConfirmModal } from "./ui/medical-modal";
import { useToast } from "./ui/medical-toast";
import { ecgApi } from "../lib/api";
import { memoryStore } from "../lib/supabase-client";

interface ECGReportMenuProps {
  record: any;
  onDeleted?: (recordId: string) => void | Promise<void>;
  triggerClassName?: string;
}

const reportLeadNames: Record<string, string> = {
  lead_1: "Lead I",
  lead_2: "aVR",
  lead_3: "V1",
  lead_4: "V4",
  lead_5: "Lead II",
  lead_6: "aVL",
  lead_7: "V2",
  lead_8: "V5",
  lead_9: "Lead III",
  lead_10: "aVF",
  lead_11: "V3",
  lead_12: "V6",
};

const clinicalNoteFilterKeywords = [
  "axis",
  "deviation",
  "PR interval",
  "QRS duration",
  "QT ",
  "QTc",
  "ST elevation",
  "ST depression",
  "ST segment",
  "pathological Q",
  "T-wave inversion",
  "T wave inversion",
  "peaked",
  "flattened",
  "irregular rhythm",
  "territory",
  "anterior wall",
  "inferior wall",
  "lateral wall",
  "septal",
  "urgent",
  "immediate",
  "Lead I",
  "Lead II",
  "Lead III",
  "aVR",
  "aVL",
  "aVF",
  "V1",
  "V2",
  "V3",
  "V4",
  "V5",
  "V6",
];

const clinicalDisclaimerKeywords = [
  "disclaimer",
  "not a final medical diagnosis",
  "not a medical diagnosis",
  "qualified physician",
  "physician",
  "doctor",
  "diagnosis",
  "clinical review",
  "verified",
  "verify",
  "consult",
  "medical advice",
  "clinical decisions",
  "treatment decisions",
];

const escapeHtml = (value: any) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatDate = (value?: string) => {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "N/A";
  return date.toLocaleString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatConfidence = (value: any) =>
  typeof value === "number" ? `${value.toFixed(2)}%` : "N/A";

const formatSimilarity = (value: any) =>
  typeof value === "number" ? `${(value * 100).toFixed(1)}%` : "N/A";

const getShortReportId = (record: any) => {
  const rawId = String(record?.id || "");
  if (!rawId) return "ECG-REPORT";

  const finalSegment = rawId.split(":").pop()?.split("-").pop() || rawId;
  const compactId = finalSegment.replace(/[^a-zA-Z0-9]/g, "").slice(-10);
  return compactId ? `ECG-${compactId.toUpperCase()}` : "ECG-REPORT";
};

const getReviewStatus = (record: any) => {
  const status = String(record?.status || "").toLowerCase();
  const hasReviewSignal =
    status === "reviewed" ||
    Boolean(
      record?.reviewed_by ||
        record?.reviewed_by_name ||
        record?.reviewed_at ||
        record?.review_date ||
        record?.review_comments ||
        record?.doctor_comments,
    );

  return hasReviewSignal ? "Reviewed" : "Pending Physician Review";
};

const getReviewDate = (record: any, reviewStatus: string) => {
  if (reviewStatus !== "Reviewed") return "N/A";
  return formatDate(record?.reviewed_at || record?.review_date || record?.updated_at);
};

const formatClassification = (prediction: any) => {
  const value = String(prediction || "").trim();
  if (!value) return "N/A";

  const isNormalClass =
    /^your ecg is normal$/i.test(value) ||
    (/\bnormal\b/i.test(value) && !/\babnormal\b/i.test(value));

  return isNormalClass ? "Normal ECG Class" : value;
};

const resolveImageSource = (imageRef?: string | null) => {
  if (!imageRef || typeof imageRef !== "string") return "";
  if (
    imageRef.startsWith("data:") ||
    imageRef.startsWith("http://") ||
    imageRef.startsWith("https://") ||
    imageRef.startsWith("blob:")
  ) {
    return imageRef;
  }

  const storageKey = imageRef.startsWith("file:") ? imageRef : `file:${imageRef}`;
  const cachedImage = memoryStore.get(storageKey);
  if (cachedImage?.fileData) {
    return `data:${cachedImage.fileType || "image/png"};base64,${cachedImage.fileData}`;
  }

  return imageRef;
};

const filterClinicalNotes = (notes: any) => {
  if (!Array.isArray(notes)) return [];
  return notes.filter((note) => {
    const lower = String(note).toLowerCase();
    return !clinicalNoteFilterKeywords.some((keyword) =>
      lower.includes(keyword.toLowerCase()),
    );
  });
};

const getUsefulClinicalNotes = (notes: any[]) =>
  notes
    .filter((note) => {
      const value = String(note || "").trim();
      const lower = value.toLowerCase();
      return (
        value.length > 0 &&
        !clinicalDisclaimerKeywords.some((keyword) => lower.includes(keyword))
      );
    })
    .slice(0, 4);

const renderInfoItem = (label: string, value: any) => `
  <div class="info-item">
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(value === 0 ? "0" : value || "N/A")}</strong>
  </div>
`;

const renderWideInfoItem = (label: string, value: any) => `
  <div class="info-item info-item-wide">
    <span>${escapeHtml(label)}</span>
    <strong>${escapeHtml(value === 0 ? "0" : value || "N/A")}</strong>
  </div>
`;

const renderProbabilityDistribution = (probabilities: any) => {
  if (!probabilities || Object.keys(probabilities).length === 0) {
    return `<p class="muted">Class probability distribution is not available for this report.</p>`;
  }

  const entries = Object.entries(probabilities).sort(
    ([, a], [, b]) => Number(b) - Number(a),
  );
  const maxProbability = Math.max(
    ...entries.map(([, value]) => Number(value) || 0),
  );

  return `
    <div class="probability-list">
      ${entries
        .map(([label, value]) => {
          const probability = Number(value) || 0;
          const isPredicted = probability === maxProbability;
          return `
            <div class="probability-row">
              <div class="probability-label">
                <span>${escapeHtml(label)}</span>
                ${isPredicted ? `<em>Predicted</em>` : ""}
              </div>
              <div class="probability-track">
                <div class="probability-fill" style="width: ${Math.max(probability, 2)}%"></div>
              </div>
              <strong>${probability.toFixed(1)}%</strong>
            </div>
          `;
        })
        .join("")}
    </div>
  `;
};

const renderClassifierVotes = (votes: any) => {
  if (!votes || Object.keys(votes).length === 0) {
    return `<p class="muted">Individual classifier votes are not available for this report.</p>`;
  }

  return `
    <div class="votes-grid">
      ${Object.entries(votes)
        .slice(0, 5)
        .map(
          ([model, data]: [string, any]) => `
          <div class="vote-card">
            <span>${escapeHtml(model)}</span>
            <strong>${escapeHtml(data?.predicted || "N/A")}</strong>
            <small>${data?.confidence != null ? `${Number(data.confidence).toFixed(1)}% model confidence` : "Model confidence N/A"}</small>
          </div>
        `,
        )
        .join("")}
    </div>
  `;
};

const renderAnnotatedLeads = (annotatedImages: any) => `
  <div class="lead-grid">
    ${Array.from({ length: 12 })
      .map((_, index) => {
        const key = `lead_${index + 1}`;
        const src = resolveImageSource(annotatedImages?.[key]);
        return `
          <div class="lead-card">
            <div class="lead-title">${escapeHtml(reportLeadNames[key] || key)}</div>
            ${
              src
                ? `<img src="${escapeHtml(src)}" alt="${escapeHtml(reportLeadNames[key] || key)} PQRST annotated ECG" />`
                : `<div class="image-placeholder">PQRST image not available</div>`
            }
          </div>
        `;
      })
      .join("")}
  </div>
`;

const buildPrintableReport = (record: any) => {
  const explainability = record.explainability || {};
  const leadChart = resolveImageSource(explainability.lead_importance?.chart);
  const clinicalNotes = getUsefulClinicalNotes(
    filterClinicalNotes(explainability.clinical_interpretation),
  );
  const sourceImage = resolveImageSource(record.file_url || record.file_path);
  const shortReportId = getShortReportId(record);
  const generatedDate = formatDate(new Date().toISOString());
  const reviewStatus = getReviewStatus(record);
  const reviewDate = getReviewDate(record, reviewStatus);
  const reviewComments =
    record.review_comments || record.doctor_comments || record.comments;
  const reviewedBy =
    record.reviewed_by_name || record.reviewer_name || record.reviewed_by || "N/A";
  const uploadedBy = record.uploaded_by_name
    ? `${record.uploaded_by_name}${
        record.uploaded_by_role ? ` (${record.uploaded_by_role})` : ""
      }`
    : record.uploaded_by_role || "N/A";
  const assignedDoctor =
    record.assigned_doctor_name || record.doctor_name || record.reviewer_name || "N/A";
  const classification = formatClassification(record.prediction);

  return `
<!doctype html>
<html>
  <head>
    <title>CardioDetect AI ECG Report - ${escapeHtml(shortReportId)}</title>
    <meta charset="utf-8" />
    <style>
      @page {
        size: A4;
        margin: 12mm 13mm;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        background: #eef3f8;
        color: #172033;
        font-family: Arial, Helvetica, sans-serif;
        line-height: 1.45;
      }

      .report {
        width: 100%;
        max-width: 940px;
        margin: 0 auto;
        background: #ffffff;
        padding: 28px 30px 34px;
      }

      .header {
        border-bottom: 4px solid #1976d2;
        padding-bottom: 16px;
        margin-bottom: 18px;
        display: flex;
        justify-content: space-between;
        gap: 18px;
        align-items: flex-start;
      }

      .brand {
        display: flex;
        align-items: flex-start;
        gap: 14px;
      }

      .brand-mark {
        width: 48px;
        height: 48px;
        display: flex;
        align-items: center;
        justify-content: center;
        flex: 0 0 auto;
        border-radius: 14px;
        background: linear-gradient(135deg, #2563eb, #0891b2);
        color: #ffffff;
        box-shadow: 0 10px 24px rgba(25, 118, 210, 0.22);
      }

      .brand-mark svg {
        width: 29px;
        height: 29px;
      }

      .subtitle {
        margin: 3px 0 0;
        color: #30465f;
        font-size: 14px;
        font-weight: 700;
      }

      .system-name {
        margin: 2px 0 0;
        color: #607087;
        font-size: 12px;
      }

      .eyebrow {
        margin: 0 0 6px;
        color: #1976d2;
        font-size: 12px;
        font-weight: 800;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }

      h1, h2, h3 {
        margin: 0;
      }

      h1 {
        color: #0f2442;
        font-size: 27px;
      }

      h2 {
        color: #12345b;
        font-size: 16px;
        border-bottom: 1px solid #d9e3ef;
        padding-bottom: 7px;
        margin-bottom: 12px;
      }

      h3 {
        color: #12345b;
        font-size: 14px;
        margin-bottom: 10px;
      }

      .report-meta {
        min-width: 230px;
        padding: 12px;
        border: 1px solid #d9e3ef;
        border-radius: 10px;
        background: #f8fbff;
        text-align: right;
      }

      .report-meta span {
        display: block;
        color: #607087;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 0.06em;
        text-transform: uppercase;
      }

      .report-meta strong {
        display: block;
        color: #12223a;
        font-size: 15px;
        margin: 2px 0 8px;
      }

      .status-pill {
        display: inline-block;
        padding: 4px 9px;
        border-radius: 999px;
        background: ${reviewStatus === "Reviewed" ? "#ecfdf5" : "#fff7ed"};
        color: ${reviewStatus === "Reviewed" ? "#047857" : "#9a3412"};
        border: 1px solid ${reviewStatus === "Reviewed" ? "#a7f3d0" : "#fed7aa"};
        font-size: 11px;
        font-weight: 800;
      }

      .section {
        margin: 16px 0;
        break-inside: avoid;
        page-break-inside: avoid;
      }

      .page-break {
        break-before: page;
        page-break-before: always;
      }

      .print-note {
        margin: 0 0 14px;
        padding: 9px 11px;
        border: 1px solid #bfdbfe;
        border-left: 5px solid #1976d2;
        border-radius: 8px;
        background: #eff6ff;
        color: #1e3a8a;
        font-size: 12px;
        font-weight: 700;
      }

      .info-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 12px;
      }

      .info-item-wide {
        grid-column: 1 / -1;
      }

      .info-item,
      .metric-card,
      .vote-card,
      .lead-card {
        border: 1px solid #d9e3ef;
        border-radius: 10px;
        background: #f8fbff;
      }

      .info-item {
        padding: 12px;
      }

      .info-item span,
      .metric-card span,
      .vote-card span,
      .lead-title {
        display: block;
        color: #607087;
        font-size: 11px;
        font-weight: 800;
        letter-spacing: 0.04em;
        text-transform: uppercase;
      }

      .info-item strong,
      .metric-card strong,
      .vote-card strong {
        display: block;
        color: #162033;
        font-size: 15px;
        margin-top: 4px;
      }

      .metrics {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }

      .metric-card {
        padding: 14px;
        border-left: 5px solid #1976d2;
      }

      .probability-list {
        display: grid;
        gap: 10px;
      }

      .probability-row {
        display: grid;
        grid-template-columns: 180px 1fr 64px;
        gap: 10px;
        align-items: center;
      }

      .probability-label {
        font-size: 12px;
        font-weight: 700;
      }

      .probability-label em {
        display: inline-block;
        margin-left: 8px;
        color: #1976d2;
        font-size: 10px;
        font-style: normal;
        text-transform: uppercase;
      }

      .probability-track {
        height: 11px;
        overflow: hidden;
        border-radius: 999px;
        background: #dce8f5;
      }

      .probability-fill {
        height: 100%;
        border-radius: inherit;
        background: linear-gradient(90deg, #1976d2, #35a3dc);
      }

      .votes-grid {
        display: grid;
        grid-template-columns: repeat(2, minmax(0, 1fr));
        gap: 10px;
      }

      .vote-card {
        padding: 12px;
      }

      .vote-card small {
        color: #607087;
      }

      .source-image,
      .lead-chart {
        width: 100%;
        object-fit: contain;
        border: 1px solid #d9e3ef;
        border-radius: 10px;
        background: #0f172a;
        padding: 8px;
      }

      .source-image {
        max-height: 365px;
      }

      .lead-chart {
        max-height: 300px;
      }

      .lead-grid {
        display: grid;
        grid-template-columns: repeat(3, minmax(0, 1fr));
        gap: 12px;
      }

      .lead-card {
        padding: 10px;
        break-inside: avoid;
      }

      .lead-card img {
        width: 100%;
        height: 128px;
        object-fit: contain;
        margin-top: 8px;
        border-radius: 6px;
        background: #ffffff;
      }

      .image-placeholder {
        height: 128px;
        margin-top: 8px;
        display: flex;
        align-items: center;
        justify-content: center;
        border: 1px dashed #b8c7d9;
        border-radius: 6px;
        color: #607087;
        font-size: 12px;
        text-align: center;
      }

      .clinical-notes {
        padding-left: 18px;
      }

      .clinical-notes li {
        margin-bottom: 8px;
      }

      .disclaimer {
        margin-top: 16px;
        padding: 12px 13px;
        border-left: 5px solid #f59e0b;
        background: #fff7ed;
        color: #7c4a03;
        font-size: 12px;
      }

      .final-disclaimer {
        margin-top: 14px;
      }

      .muted {
        color: #607087;
        font-size: 13px;
      }

      @media print {
        body {
          background: #ffffff;
          -webkit-print-color-adjust: exact;
          print-color-adjust: exact;
        }

        .report {
          max-width: none;
          padding: 0;
        }

        .print-note {
          display: none;
        }
      }
    </style>
  </head>
  <body>
    <main class="report">
      <p class="print-note">For a clean PDF, select &ldquo;Save as PDF&rdquo; and disable &ldquo;Headers and footers&rdquo; in the print dialog.</p>

      <header class="header">
        <div class="brand">
          <div class="brand-mark" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline>
            </svg>
          </div>
          <div>
            <p class="eyebrow">ECG Report</p>
            <h1>CardioDetect AI</h1>
            <p class="subtitle">Computer-Assisted 12-Lead ECG Analysis Report</p>
            <p class="system-name">Cardiovascular Disease Detection System</p>
          </div>
        </div>
        <div class="report-meta">
          <span>Report ID</span>
          <strong>${escapeHtml(shortReportId)}</strong>
          <span>Generated</span>
          <strong>${escapeHtml(generatedDate)}</strong>
          <span>Review Status</span>
          <em class="status-pill">${escapeHtml(reviewStatus)}</em>
        </div>
      </header>

      <section class="section">
        <h2>Patient and Report Details</h2>
        <div class="info-grid">
          ${renderInfoItem("Patient Name", record.patient_name || "Anonymous")}
          ${renderInfoItem("Patient ID", record.patient_id)}
          ${renderInfoItem("Report Date", formatDate(record.created_at))}
          ${renderInfoItem("Uploaded By", uploadedBy)}
          ${renderInfoItem("Assigned Doctor", assignedDoctor)}
          ${renderInfoItem("Review Status", reviewStatus)}
          ${
            reviewStatus === "Reviewed"
              ? `
                  ${renderInfoItem("Reviewed By", reviewedBy)}
                  ${renderInfoItem("Reviewed Date", reviewDate)}
                  ${
                    reviewComments
                      ? renderWideInfoItem("Reviewed Comments", reviewComments)
                      : ""
                  }
                `
              : ""
          }
        </div>
      </section>

      <section class="section">
        <h2>AI Screening Summary</h2>
        <div class="metrics">
          <div class="metric-card">
            <span>AI Screening Classification</span>
            <strong>${escapeHtml(classification)}</strong>
          </div>
          <div class="metric-card">
            <span>Model Confidence</span>
            <strong>${escapeHtml(formatConfidence(record.confidence))}</strong>
          </div>
          <div class="metric-card">
            <span>ECG Image Validation Score</span>
            <strong>${escapeHtml(formatSimilarity(record.similarity_score))}</strong>
          </div>
        </div>
      </section>

      <section class="section page-break">
        <h2>ECG Acquisition and Processing Context</h2>
        <div class="info-grid">
          ${renderInfoItem("Source", "Uploaded ECG Image")}
          ${renderInfoItem("Format", "Standard 12-Lead ECG Image")}
          ${renderInfoItem("Method", "Image-Based Signal Extraction")}
          ${renderInfoItem("Estimated Sampling Rate", "Approx. 102 Hz")}
          ${renderInfoItem("Signal Quality", "Suitable for Automated Screening")}
        </div>
      </section>

      ${
        sourceImage
          ? `<section class="section">
              <h2>Source ECG Image</h2>
              <img class="source-image" src="${escapeHtml(sourceImage)}" alt="Source ECG scan" />
            </section>`
          : ""
      }

      ${
        clinicalNotes.length > 0
          ? `<section class="section">
              <h2>Automated Interpretation Notes</h2>
              <ul class="clinical-notes">${clinicalNotes
                .map((note) => `<li>${escapeHtml(note).replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>")}</li>`)
                .join("")}</ul>
            </section>`
          : ""
      }

      <section class="section page-break">
        <h2>Class Probability Distribution</h2>
        ${renderProbabilityDistribution(explainability.class_probabilities)}
      </section>

      <section class="section">
        <h2>Ensemble Classifier Agreement</h2>
        ${renderClassifierVotes(explainability.individual_votes)}
      </section>

      <section class="section">
        <h2>Approximate Lead Contribution to AI Classification</h2>
        ${
          leadChart
            ? `<img class="lead-chart" src="${escapeHtml(leadChart)}" alt="Approximate lead contribution to AI classification" />`
            : `<p class="muted">Approximate lead contribution chart is not available for this report.</p>`
        }
      </section>

      <section class="section page-break">
        <h2>12 PQRST-Annotated ECG Images</h2>
        ${renderAnnotatedLeads(record.pipeline_images?.annotated)}
        <div class="disclaimer final-disclaimer">
          <strong>Important:</strong> This report contains AI-generated screening observations derived from an uploaded ECG image. It supports clinical review and is not a final medical diagnosis. All findings must be verified by a qualified physician.
        </div>
      </section>
    </main>

    <script>
      window.addEventListener("load", function () {
        window.setTimeout(function () {
          window.focus();
          window.print();
        }, 450);
      });
    </script>
  </body>
</html>
  `;
};

export function ECGReportMenu({
  record,
  onDeleted,
  triggerClassName = "",
}: ECGReportMenuProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { showToast } = useToast();

  const stopCardClick = (event: React.MouseEvent) => {
    event.stopPropagation();
  };

  const stopCardPointer = (event: React.PointerEvent) => {
    event.stopPropagation();
  };

  const handleDownloadReport = async () => {
    try {
      const response = await ecgApi.getRecord(record.id);
      if (!response.record) {
        showToast("error", "Report not found");
        return;
      }

      const printWindow = window.open(
        "",
        "_blank",
        "width=1024,height=768",
      );

      if (!printWindow) {
        showToast("error", "Please allow pop-ups to download the report");
        return;
      }

      printWindow.opener = null;
      printWindow.document.open();
      printWindow.document.write(buildPrintableReport(response.record));
      printWindow.document.close();
      showToast("success", "Printable report opened");
    } catch (error: any) {
      console.error("Error preparing report download:", error);
      showToast("error", error.message || "Failed to prepare report");
    }
  };

  const confirmDeleteReport = async () => {
    setIsDeleting(true);
    try {
      await ecgApi.deleteRecord(record.id);
      await onDeleted?.(record.id);
      setDeleteOpen(false);
      showToast("success", "ECG report deleted successfully");
    } catch (error: any) {
      console.error("Error deleting report:", error);
      showToast("error", error.message || "Failed to delete report");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label="Report actions"
            onClick={stopCardClick}
            onPointerDown={stopCardPointer}
            className={`w-9 h-9 flex-shrink-0 rounded-full bg-gray-50 dark:bg-gray-700 text-gray-500 dark:text-gray-300 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-gray-700 dark:hover:text-blue-400 flex items-center justify-center transition-colors ${triggerClassName}`}
          >
            <MoreVertical className="w-5 h-5" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          align="end"
          onClick={stopCardClick}
          onPointerDown={stopCardPointer}
          className="w-52 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 shadow-xl"
        >
          <DropdownMenuItem
            onClick={stopCardClick}
            onSelect={(event) => {
              event.preventDefault();
              void handleDownloadReport();
            }}
            className="cursor-pointer rounded-md px-3 py-2 text-sm focus:bg-blue-50 dark:focus:bg-gray-700"
          >
            <Download className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            Download Report
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={stopCardClick}
            onSelect={(event) => {
              event.preventDefault();
              setDeleteOpen(true);
            }}
            className="cursor-pointer rounded-md px-3 py-2 text-sm focus:bg-red-50 dark:focus:bg-red-900/30"
          >
            <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
            Delete Report
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {deleteOpen && (
        <div onClick={stopCardClick}>
          <ConfirmModal
            isOpen={deleteOpen}
            onClose={() => {
              if (!isDeleting) setDeleteOpen(false);
            }}
            onConfirm={confirmDeleteReport}
            title="Delete ECG Report"
            message={`Are you sure you want to delete this ECG report${
              record?.created_at
                ? ` from ${new Date(record.created_at).toLocaleDateString()}`
                : ""
            }? This action cannot be undone.`}
            confirmText="Delete Report"
            cancelText="Cancel"
            variant="danger"
            loading={isDeleting}
          />
        </div>
      )}
    </>
  );
}
