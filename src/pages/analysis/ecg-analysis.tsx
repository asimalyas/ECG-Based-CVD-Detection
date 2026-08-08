import React, { useState, useEffect, useRef } from "react";
import { ArrowLeft, Activity, CheckCircle, AlertTriangle } from "lucide-react";
import { ecgApi } from "../../lib/api";
import { useToast } from "../../components/ui/medical-toast";
import { MedicalButton } from "../../components/ui/medical-button";
import { ImageModal } from "../../components/ui/image-modal";
import { ExplainabilityReportSection } from "../../components/ui/explainability-report-section";

const leadNames: Record<string, string> = {
  lead_1: "Lead I", lead_2: "aVR", lead_3: "V1", lead_4: "V4",
  lead_5: "Lead II", lead_6: "aVL", lead_7: "V2", lead_8: "V5",
  lead_9: "Lead III", lead_10: "aVF", lead_11: "V3", lead_12: "V6",
};



interface ECGAnalysisPageProps {
  recordId: string;
  userRole?: string;
  onNavigateToDashboard: () => void;
  onAnalysisComplete?: () => void;
}

export function ECGAnalysisPage({ recordId, userRole, onNavigateToDashboard, onAnalysisComplete }: ECGAnalysisPageProps) {
  const [record, setRecord] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  
  // Streaming state
  const [currentStep, setCurrentStep] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [progressPct, setProgressPct] = useState(0);
  const [images, setImages] = useState<Record<string, any>>({});
  const [results, setResults] = useState<any>(null);

  const [zoomImg, setZoomImg] = useState<string | null>(null);
  const { showToast } = useToast();
  
  const hasStartedAnalysis = useRef(false);
  const imagesRef = useRef<Record<string, any>>({});

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setZoomImg(null);
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, []);

  useEffect(() => {
    fetchRecordAndAnalyze();
  }, [recordId]);

  const fetchRecordAndAnalyze = async () => {
    try {
      setIsLoading(true);
      const res = await ecgApi.getRecord(recordId);
      
      if (!res.record) {
        showToast("error", "Record not found");
        return;
      }
      
      setRecord(res.record);
      setIsLoading(false);

      // Only start analysis if we have file data and prediction is null
      if (res.record.file_data && !res.record.prediction && !hasStartedAnalysis.current) {
        hasStartedAnalysis.current = true;
        startAnalysis(res.record.file_data, res.record.file_name, res.record.file_type);
      } else if (res.record.prediction) {
        // Show already existing results
        setResults({
          prediction: res.record.prediction,
          confidence: res.record.confidence,
          similarity_score: res.record.similarity_score,
        });
        if (res.record.pipeline_images) {
           // Provide basic structural fallback if needed, but for now just empty since URLs require signed URLs.
           // In a full app, we'd fetch signed URLs for pipeline_images.
        }
      }
    } catch (error) {
      console.error("Error fetching record:", error);
      showToast("error", "Failed to fetch ECG record");
      setIsLoading(false);
    }
  };

  const startAnalysis = async (base64Data: string, fileName: string, fileType: string) => {
    setIsAnalyzing(true);
    setProgressPct(5);
    setProgressMsg("Connecting to AI Engine...");
    
    try {
      // 1. Convert base64 back to a File
      const byteString = atob(base64Data);
      const ab = new ArrayBuffer(byteString.length);
      const ia = new Uint8Array(ab);
      for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
      const file = new File([ab], fileName, { type: fileType || 'image/png' });

      // 2. Prepare FormData
      const formData = new FormData();
      formData.append('file', file);

      // 3. Post to FastAPI
      const response = await fetch('http://localhost:8000/predict', {
        method: 'POST',
        body: formData,
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");

      let done = false;
      let buffer = '';
      
      let finalResults: any = null;

      while (!done) {
        const { value, done: doneReading } = await reader.read();
        done = doneReading;
        if (value) {
          buffer += decoder.decode(value, { stream: true });
          
          let messageEndIndex;
          while ((messageEndIndex = buffer.indexOf('\n\n')) !== -1) {
            const msg = buffer.slice(0, messageEndIndex);
            buffer = buffer.slice(messageEndIndex + 2);
            
            if (msg.startsWith('data: ')) {
              const dataStr = msg.replace('data: ', '');
              try {
                const data = JSON.parse(dataStr);
                
                if (data.error) throw new Error(data.error);

                if (data.step) {
                  setCurrentStep(data.step);
                  setProgressMsg(data.message);
                  setProgressPct(data.progress);
                }

                if (data.partial_images) {
                  // Update ref SYNCHRONOUSLY before React batches setImages
                  imagesRef.current = {...imagesRef.current, ...data.partial_images};
                  setImages(prev => ({...prev, ...data.partial_images}));
                }

                if (data.result) {
                  finalResults = data.result;
                  setResults(data.result);
                  setProgressPct(100);
                  setIsAnalyzing(false);
                }
              } catch(e: any) {
                 if (e.message && msg.includes("error")) throw e;
              }
            }
          }
        }
      }
      
      // 4. Analysis Complete -> Save to Supabase
      if (finalResults) {
        // Read latest images from ref (avoids stale closure)
        const latestImages = imagesRef.current;
        console.log('[ECG-SAVE] saved annotated count =', latestImages.annotated ? Object.keys(latestImages.annotated).length : 0);
        
        const vaultLayer = async (dict: Record<string, string> | undefined, prefix: string) => {
           if (!dict) return undefined;
           const out: Record<string, string> = {};
           for (const [k, v] of Object.entries(dict)) {
              if (!v) continue;
              if (v.startsWith('pipeline/') || v.startsWith('file:')) {
                  out[k] = v.replace(/^file:/, '');
                  continue;
              }
              try {
                  const r = await ecgApi.uploadIntermediateImage(`${prefix}_${k}.png`, v);
                  out[k] = r.url;
              } catch (e) {
                  console.error(e);
              }
           }
           return Object.keys(out).length > 0 ? out : undefined;
        };

        const vaultedOriginal = latestImages.original ? (await ecgApi.uploadIntermediateImage('original.png', latestImages.original)).url : undefined;
        const vaultedGrayscale = latestImages.grayscale ? (await ecgApi.uploadIntermediateImage('grayscale.png', latestImages.grayscale)).url : undefined;
        const vaultedLeads = await vaultLayer(latestImages.leads, 'lead');
        const vaultedPreprocessed = await vaultLayer(latestImages.preprocessed, 'prep');
        const vaultedContours = await vaultLayer(latestImages.contours, 'cont');
        const vaultedAnnotated = await vaultLayer(latestImages.annotated, 'annotated');

        let savedLeadImportance = finalResults.explainability?.lead_importance;
        if (savedLeadImportance?.chart) {
          const chartRef = String(savedLeadImportance.chart);
          if (chartRef.startsWith('pipeline/') || chartRef.startsWith('file:')) {
            savedLeadImportance = {
              ...savedLeadImportance,
              chart: chartRef.replace(/^file:/, ''),
            };
          } else {
            try {
              const vaultedChart = await ecgApi.uploadIntermediateImage('lead_importance.png', chartRef);
              savedLeadImportance = {
                ...savedLeadImportance,
                chart: vaultedChart.url,
              };
            } catch (chartError) {
              console.error('[ECG-SAVE] Failed to vault lead importance chart', chartError);
            }
          }
        }

        // Persist explainability data (only the kept fields)
        const savedExplainability = finalResults.explainability ? {
          class_probabilities: finalResults.explainability.class_probabilities,
          individual_votes: finalResults.explainability.individual_votes,
          lead_importance: savedLeadImportance,
          clinical_interpretation: finalResults.explainability.clinical_interpretation,
        } : undefined;

        await ecgApi.updateAnalysisResult(recordId, {
          prediction: finalResults.prediction,
          confidence: finalResults.confidence,
          similarityScore: finalResults.similarity_score,
          status: userRole === 'doctor' ? 'reviewed' : 'completed',
          images: {
            ...(vaultedOriginal ? { original: vaultedOriginal } : {}),
            ...(vaultedGrayscale ? { grayscale: vaultedGrayscale } : {}),
            ...(vaultedLeads ? { leads: vaultedLeads as any } : {}),
            ...(vaultedPreprocessed ? { preprocessed: vaultedPreprocessed as any } : {}),
            ...(vaultedContours ? { contours: vaultedContours as any } : {}),
            ...(vaultedAnnotated ? { annotated: vaultedAnnotated as any } : {})
          },
          explainability: savedExplainability,
        });
        
        showToast("success", "Analysis complete and saved!");
      }

    } catch (err: any) {
      console.error(err);
      showToast("error", err.message || "Analysis failed");
      setIsAnalyzing(false);
    }
  };

  const renderMedicalGrid = (sectionData: any, sectionTitle: string) => {
    if (!sectionData) return null;
    return (
      <div className="mb-12">
        <h4 className="text-[var(--text-primary)] border-b-2 border-gray-200 dark:border-gray-700 pb-2 mb-6 text-xl">
          {sectionTitle}
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 12 }).map((_, i) => {
            const key = `lead_${i + 1}`;
            if (!sectionData[key]) return null;
            return (
              <div 
                key={key} 
                className="bg-white dark:bg-gray-800 rounded-lg p-2 shadow-sm border border-gray-200 dark:border-gray-700 cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => setZoomImg(sectionData[key])}
              >
                <div className="text-xs font-bold text-[var(--primary-color)] mb-1">
                 {leadNames[key as keyof typeof leadNames] || key}
                </div>
                <img src={sectionData[key]} alt={`${sectionTitle} ${i+1}`} className="w-full h-auto object-contain bg-black rounded" />
              </div>
            );
          })}
        </div>
        
        {sectionData.long_lead && (
          <div className="mt-8">
            <h5 className="text-gray-500 dark:text-gray-400 mb-4 text-center text-lg uppercase tracking-wider">
              Long Lead (Lead II)
            </h5>
            <div 
              className="bg-black border border-gray-700 p-0 cursor-pointer hover:border-[var(--primary-color)] transition-colors rounded-lg overflow-hidden"
              onClick={() => setZoomImg(sectionData.long_lead)}
            >
              <img src={sectionData.long_lead} alt="Long Lead" className="w-full h-auto max-h-[350px] object-contain" />
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <ImageModal 
        isOpen={!!zoomImg} 
        imageUrl={zoomImg} 
        onClose={() => setZoomImg(null)} 
      />

      <div className="flex items-center gap-4 mb-8">
        <button
          onClick={onNavigateToDashboard}
          className="p-2 rounded-lg hover:bg-[var(--bg-light)] transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h2 className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)]">
            Clinical ECG Analyzer
          </h2>
          {record && (
             <p className="text-[var(--text-secondary)]">
               Record ID: {recordId} | Patient: {record.patient_name || 'N/A'}
             </p>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex flex-col items-center justify-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color)]"></div>
          <p className="mt-4 text-[var(--text-secondary)]">Loading record details...</p>
        </div>
      )}

      {!isLoading && isAnalyzing && (
        <div className="bg-white dark:bg-gray-800 rounded-xl p-8 shadow-sm border border-gray-200 dark:border-gray-700 max-w-2xl mx-auto my-12 text-center">
            <Activity className="w-16 h-16 text-[var(--primary-color)] mx-auto mb-6 animate-pulse" />
            <h3 className="text-xl font-semibold mb-2">Analyzing ECG...</h3>
            <p className="text-[var(--primary-color)] font-medium mb-6">{progressMsg}</p>
            
            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden mb-2">
               <div 
                 className="h-full bg-gradient-to-r from-[var(--primary-color)] to-[var(--success-color)] transition-all duration-500 ease-out"
                 style={{ width: `${progressPct}%` }}
               />
            </div>
            <div className="text-sm text-[var(--text-secondary)] text-right">Step {currentStep}/10</div>
        </div>
      )}

      {!isLoading && (isAnalyzing || results) && Object.keys(images).length > 0 && (
         <div className={`transition-opacity duration-500 ${isAnalyzing ? 'opacity-80' : 'opacity-100'}`}>
            {results && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-[var(--primary-color)] border-l-4">
                  <div className="text-[var(--text-secondary)] text-sm mb-2">Diagnosis</div>
                  <div className="text-2xl font-bold">{results.prediction}</div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-[var(--success-color)] border-l-4">
                  <div className="text-[var(--text-secondary)] text-sm mb-2">Model Assurance</div>
                  <div className="text-2xl font-bold flex items-center">
                    {results.confidence?.toFixed(2) || 'N/A'}%
                    {results.confidence >= 80 ? (
                      <CheckCircle className="w-6 h-6 text-[var(--success-color)] ml-2" />
                    ) : (
                      <AlertTriangle className="w-6 h-6 text-[var(--warning-color)] ml-2" />
                    )}
                  </div>
                </div>
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm border border-[#8b5cf6] border-l-4">
                  <div className="text-[var(--text-secondary)] text-sm mb-2">Structural Quality</div>
                  <div className="text-2xl font-bold">
                     {(results.similarity_score * 100).toFixed(2)}%
                  </div>
                </div>
              </div>
            )}

            <h3 className="text-3xl font-bold text-center mb-4 mt-8 text-[var(--text-color)]">Clinical Pipeline Review</h3>
            <p className="text-center text-[var(--text-secondary)] mb-12 max-w-2xl mx-auto">
              Click on any clinical image to expand an interactive zoom modal for clearer medical reading.
            </p>

            {images.original && (
              <div className="mb-12">
                <h4 className="text-[var(--text-primary)] border-b-2 border-gray-200 dark:border-gray-700 pb-2 mb-6 text-xl">
                  1. Original Upload
                </h4>
                <div 
                  className="bg-black rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-xl transition-shadow mx-auto max-w-4xl"
                  onClick={() => setZoomImg(images.original)}
                >
                  <img src={images.original} className="w-full h-auto max-h-[500px] object-contain" />
                </div>
              </div>
            )}
            
            {images.grayscale && (
              <div className="mb-12">
                <h4 className="text-[var(--text-primary)] border-b-2 border-gray-200 dark:border-gray-700 pb-2 mb-6 text-xl">
                  2. Evaluated Grayscale Tensor
                </h4>
                <div 
                  className="bg-black rounded-xl overflow-hidden cursor-pointer shadow-lg hover:shadow-xl transition-shadow mx-auto max-w-4xl"
                  onClick={() => setZoomImg(images.grayscale)}
                >
                  <img src={images.grayscale} className="w-full h-auto max-h-[500px] object-contain" />
                </div>
              </div>
            )}

            {images.leads && renderMedicalGrid(images.leads, "3. Filtered Divided Leads (I-V6 & Long)")}
            {images.preprocessed && renderMedicalGrid(images.preprocessed, "4. Otsu Threshold Binarization")}
            {images.contours && renderMedicalGrid(images.contours, "5. Isolated Biological Contours")}

            {/* ═══ 6. PQRST Annotated Leads (live streaming placeholder) ═══ */}
            {isAnalyzing && currentStep >= 8 && !images.annotated && (
              <div className="annotated-placeholder mb-12">Generating PQRST annotations...</div>
            )}

            {/* ═══ Explainability Dashboard (shared component) ═══ */}
            {results && !isAnalyzing && (
              <ExplainabilityReportSection
                explainability={results.explainability}
                annotatedImages={images.annotated}
                prediction={results.prediction}
                onZoomImage={setZoomImg}
              />
            )}

            {/* Action Bottom */}
            {results && !isAnalyzing && (
               <div className="mt-12 bg-blue-50 dark:bg-blue-900/20 border border-[var(--primary-color)] rounded-xl p-8 text-center flex flex-col items-center shadow-sm">
                  <CheckCircle className="w-16 h-16 text-blue-600 mb-4" />
                  <h3 className="text-2xl font-bold text-blue-900 dark:text-blue-300 mb-2">Analysis Complete</h3>
                  <p className="text-blue-700 dark:text-blue-300 max-w-lg mb-8">
                    The machine learning pipeline has successfully completed all diagnostic extraction phases. You can now view the comprehensive resulting dashboard.
                  </p>
                  <MedicalButton variant="primary" onClick={onAnalysisComplete} className="w-64 py-3 text-lg font-semibold shadow-lg">
                    View Full Report
                  </MedicalButton>
               </div>
            )}
         </div>
      )}
    </div>
  );
}
