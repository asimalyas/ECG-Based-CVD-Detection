import React, { useState, useEffect } from "react";
import { ArrowLeft, FileText, CheckCircle, Clock, Search, Activity, AlertTriangle, AlertCircle, Check } from "lucide-react";

const leadNames: Record<string, string> = {
  lead_1: "Lead I", lead_2: "aVR", lead_3: "V1", lead_4: "V4",
  lead_5: "Lead II", lead_6: "aVL", lead_7: "V2", lead_8: "V5",
  lead_9: "Lead III", lead_10: "aVF", lead_11: "V3", lead_12: "V6",
  long_lead: "Long Lead II"
};

const sectionTitles: Record<string, string> = {
  original: "1. Original Uploaded Scan",
  grayscale: "2. Evaluated Grayscale Tensor",
  leads: "3. Segmented 12-Leads (I-V6 & Long)",
  preprocessed: "4. Otsu Threshold Binarization Mask",
  contours: "5. Isolated Biological Contours"
};
import { ecgApi } from "../../lib/api";
import { memoryStore } from "../../lib/supabase-client";
import { useToast } from "../../components/ui/medical-toast";
import { ImageModal } from "../../components/ui/image-modal";
import { ExplainabilityReportSection } from "../../components/ui/explainability-report-section";

interface PatientReportViewProps {
  recordId: string;
  onNavigateToDashboard: () => void;
}

export function PatientReportView({ recordId, onNavigateToDashboard }: PatientReportViewProps) {
  const [record, setRecord] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [zoomImg, setZoomImg] = useState<string | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    fetchRecord();
  }, [recordId]);

  const fetchRecord = async () => {
    try {
      setIsLoading(true);
      const res = await ecgApi.getRecord(recordId);
      
      if (!res.record) {
        showToast("error", "Report not found");
        return;
      }
      setRecord(res.record);
      console.log('[PATIENT-VIEW] report view annotated count =', res.record.pipeline_images?.annotated ? Object.keys(res.record.pipeline_images.annotated).length : 0);
      setIsLoading(false);
    } catch (error) {
      console.error("Error fetching record:", error);
      showToast("error", "Failed to fetch ECG report");
      setIsLoading(false);
    }
  };

  if (isLoading) {
     return (
        <div className="flex flex-col items-center justify-center p-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color)]"></div>
          <p className="mt-4 text-[var(--text-secondary)]">Loading your health data...</p>
        </div>
     );
  }

  const isPending = record.status === 'pending';

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <ImageModal 
        isOpen={!!zoomImg} 
        imageUrl={zoomImg} 
        onClose={() => setZoomImg(null)} 
      />

      {/* Patient Summary Header Card */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-md border border-[var(--primary-color)] relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--primary-color)] opacity-5 rounded-full -translate-y-8 translate-x-8"></div>
        <button
          onClick={onNavigateToDashboard}
          className="absolute top-4 right-4 p-2 text-gray-500 dark:text-gray-300 hover:text-[var(--primary-color)] hover:bg-blue-50 dark:hover:bg-gray-700 rounded-lg transition-colors cursor-pointer inline-flex items-center gap-2"
        >
          <ArrowLeft className="w-5 h-5" /> Back
        </button>
        <div className="flex flex-col gap-1 z-10 relative">
           <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] uppercase tracking-tight">
             My Clinical ECG Report
           </h2>
           <p className="text-gray-500 dark:text-gray-400 font-medium">Record Identity: {record.id}</p>
        </div>
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-6 bg-blue-50/50 dark:bg-gray-900/50 p-4 rounded-lg">
           <div>
             <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-1">Patient Name</p>
             <p className="text-xl font-bold text-[var(--text-primary)]">{record.patient_name || 'Anonymous'}</p>
           </div>
           <div>
             <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-1">Upload Date</p>
             <p className="text-lg font-bold text-[var(--text-primary)]">{new Date(record.created_at).toLocaleDateString()}</p>
           </div>
           <div>
             <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-1">Uploaded By</p>
             <p className="text-lg font-bold text-[var(--text-primary)]">{record.uploaded_by_name} ({record.uploaded_by_role})</p>
           </div>
           <div>
             <p className="text-xs text-gray-500 dark:text-gray-400 uppercase font-bold tracking-wider mb-1">Current Status</p>
             <p className={`text-lg font-bold capitalize ${record.status === 'reviewed' ? 'text-[var(--success-color)]' : 'text-[var(--primary-color)]'}`}>
               {record.status}
             </p>
           </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-gray-200 dark:border-gray-700">
         <h3 className="text-xl font-semibold mb-4 flex items-center gap-2 text-[var(--primary-color)]">
           <FileText className="w-5 h-5" />
           Source ECG Scan
         </h3>
         {record.file_url ? (
            <div className="bg-black rounded-lg overflow-hidden flex justify-center p-2 mt-4 border border-gray-300 dark:border-gray-700">
              <img src={record.file_url} alt="Your ECG Scan" className="max-h-[400px] object-contain" />
            </div>
         ) : (
           <div className="p-8 bg-gray-50 dark:bg-gray-900 border border-dashed rounded-lg text-center text-[var(--text-muted)]">
              No image file available. 
           </div>
         )}
      </div>

      {record.prediction && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700">
           <div className="flex items-center justify-between mb-8 pb-4 border-b border-gray-100 dark:border-gray-700">
             <div>
               <h3 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <Activity className="w-6 h-6 text-indigo-500" />
                  AI Diagnostic Pipeline Results
               </h3>
               <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Algorithmic cardiovascular classification and tensor assurances.</p>
             </div>
             <span className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 text-xs px-3 py-1.5 rounded-full uppercase tracking-widest font-extrabold flex items-center gap-1 shadow-sm">
               <CheckCircle className="w-4 h-4" /> Computed
             </span>
           </div>
           
           <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
             <div className={`p-6 rounded-xl border-l-4 shadow-sm flex flex-col justify-center ${record.prediction.includes('Normal') ? 'bg-green-50 border-green-500 dark:bg-green-900/30' : 'bg-red-50 border-red-500 dark:bg-red-900/30'}`}>
                <p className="text-xs uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400 mb-2">Primary Diagnosis</p>
                <p className={`text-2xl font-extrabold ${record.prediction.includes('Normal') ? 'text-green-700 dark:text-green-400' : 'text-red-700 dark:text-red-400'}`}>{record.prediction}</p>
             </div>
             
             <div className="p-6 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 shadow-sm flex flex-col justify-center">
                <p className="text-xs uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400 mb-2">Model Confidence</p>
                <div className="flex items-end gap-3">
                  <p className="text-3xl font-extrabold text-gray-900 dark:text-white">{record.confidence ? record.confidence.toFixed(2) : 'N/A'}%</p>
                  {record.confidence >= 80 ? (
                      <span className="text-xs font-bold text-green-600 bg-green-100 px-2 py-1 rounded-md mb-1 flex items-center gap-1"><Check className="w-3 h-3" /> HIGH</span>
                    ) : (
                      <span className="text-xs font-bold text-yellow-600 bg-yellow-100 px-2 py-1 rounded-md mb-1 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> LOW</span>
                  )}
                </div>
             </div>

             <div className="p-6 rounded-xl bg-gray-50 dark:bg-gray-900/50 border border-gray-200 dark:border-gray-700 shadow-sm md:col-span-2 xl:col-span-1 flex flex-col justify-center">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs uppercase tracking-widest font-bold text-gray-500 dark:text-gray-400">Structural Quality</p>
                  <p className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{(record.similarity_score * 100).toFixed(1)}%</p>
                </div>
                <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mt-2">
                  <div className="h-full bg-gradient-to-r from-indigo-400 to-indigo-600 rounded-full transition-all duration-1000" style={{ width: `${(record.similarity_score || 0) * 100}%` }} />
                </div>
             </div>
           </div>
        </div>
      )}

      {record.pipeline_images && Object.keys(record.pipeline_images).length > 0 && (
        <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-8">
          <h3 className="text-2xl font-bold mb-6 flex items-center gap-2"><Search className="w-6 h-6 text-indigo-500" /> Deep Learning Extraction Grids</h3>
          <div className="space-y-12">
            {Object.entries(record.pipeline_images).filter(([key]) => key !== 'annotated').map(([sectionKey, sectionData]) => {
              const isNested = typeof sectionData === 'object' && sectionData !== null;
              const displayItems = isNested 
                ? Object.entries(sectionData as Record<string, string>) 
                : [[sectionKey, sectionData as string]];

              return (
                <div key={sectionKey} className="bg-gray-50 dark:bg-gray-900/50 rounded-xl overflow-hidden shadow-inner border border-gray-200 dark:border-gray-800 flex flex-col">
                  <div className="w-full bg-indigo-50 dark:bg-indigo-900/30 p-4 text-sm font-bold text-indigo-900 dark:text-indigo-200 border-b border-indigo-100 dark:border-indigo-800/50 flex justify-between items-center">
                    <span>{sectionTitles[sectionKey] || sectionKey.toUpperCase()}</span>
                    <span className="text-xs font-normal opacity-70 flex items-center gap-1"><Search className="w-3 h-3" /> Click any image to visually zoom</span>
                  </div>
                  <div className={`w-full p-4 gap-4 grid ${isNested ? 'grid-cols-2 md:grid-cols-4' : 'grid-cols-1 mx-auto max-w-2xl'}`}>
                    {displayItems.map(([itemKey, strUrl]) => {
                      const cachedImage = memoryStore.get(`file:${strUrl}`);
                      const src = cachedImage ? `data:image/png;base64,${cachedImage.fileData}` : strUrl;
                      
                      if (!src) return null;

                      const labelText = leadNames[itemKey] || itemKey;

                      return (
                        <div 
                          key={itemKey}
                          className="relative group cursor-zoom-in overflow-hidden rounded-lg border-2 border-transparent bg-white dark:bg-gray-800 hover:border-indigo-400 transition-all shadow-sm"
                          onClick={() => setZoomImg(src)}
                        >
                          {isNested && (
                            <div className="absolute top-0 left-0 bg-indigo-500 text-[11px] font-bold text-white px-2 py-0.5 rounded-br-md z-10 shadow">
                              {labelText}
                            </div>
                          )}
                          
                          <div className="flex items-center justify-center p-2 h-full min-h-[140px]">
                            <img src={src} className="w-full h-auto object-contain max-h-[180px]" alt={`${sectionKey} - ${itemKey}`} />
                          </div>

                          <div className="absolute inset-0 bg-indigo-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[1px]">
                            <div className="bg-white text-indigo-900 rounded-full p-2 shadow-lg scale-75 group-hover:scale-100 transition-transform">
                              <Search className="w-5 h-5" />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ═══ Explainability Report Section ═══ */}
      <ExplainabilityReportSection
        explainability={record.explainability}
        annotatedImages={record.pipeline_images?.annotated}
        prediction={record.prediction}
        onZoomImage={setZoomImg}
      />

      {isPending ? (
          <div className="bg-orange-50 dark:bg-orange-900/20 border border-[var(--warning-color)] rounded-xl p-8 flex gap-4 text-center justify-center flex-col items-center">
             <Clock className="w-12 h-12 text-orange-400 mb-4" />
             <h3 className="text-orange-800 dark:text-orange-500 font-semibold text-xl mb-2">Doctor Review Pending</h3>
             <p className="text-orange-700 dark:text-orange-400/80 max-w-md">
               Your scan has been safely received. Dr. {record.assigned_doctor_name || 'Assigned'} will review it and provide a finalized diagnosis soon.
             </p>
          </div>
      ) : (
          <div className="bg-green-50 dark:bg-green-900/30 border border-[var(--success-color)] rounded-xl p-8 text-center flex gap-4 flex-col items-center">
             <CheckCircle className="w-12 h-12 text-green-500 mb-4" />
             <h3 className="text-green-800 dark:text-green-400 font-semibold text-2xl mb-2">Clinic Finalized Status</h3>
             <p className="text-green-700 dark:text-green-400 max-w-md mb-6">
               Dr. {record.reviewer_name || 'Assigned'} has completed the clinical review.
             </p>
             {record.comments && (
                <div className="text-left bg-white dark:bg-gray-800 p-6 rounded-lg w-full max-w-lg shadow-sm border border-gray-200 dark:border-gray-700">
                   <h4 className="text-sm font-semibold uppercase text-gray-500 dark:text-gray-400 mb-2">Physician's Notes</h4>
                   <p className="text-gray-800 dark:text-gray-200">{record.comments}</p>
                </div>
             )}
          </div>
      )}
    </div>
  );
}
