import { ecgApi } from "./api";

export async function runBackgroundECGAnalysis(recordId: string) {
  try {
    console.log(`[ML-DEBUG] Starting ML pipeline for record: ${recordId}`);
    
    // Fetch the stored data
    const res = await ecgApi.getRecord(recordId);
    if (!res.record || !res.record.file_data) {
       console.error(`[ML-DEBUG] No file data found for record ${recordId}`);
       return;
    }

    const { file_data, file_name, file_type } = res.record;

    console.log(`[ML-DEBUG] Loaded file data, converting to Blob...`);
    // Ensure base64 padding/format is correct, sometimes data prefixes exist
    const base64Data = file_data.replace(/^data:image\/\w+;base64,/, "");
    
    // Convert Base64 back to Blob safely
    const byteString = atob(base64Data);
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);
    for (let i = 0; i < byteString.length; i++) ia[i] = byteString.charCodeAt(i);
    const file = new File([ab], file_name || 'ecg.png', { type: file_type || 'image/png' });

    console.log(`[ML-DEBUG] Blob created successfully. Posting to FastAPI...`);

    // Prepare Form Data
    const formData = new FormData();
    formData.append('file', file);

    // Post to FastAPI
    const response = await fetch('http://localhost:8000/predict', {
      method: 'POST',
      body: formData,
    });

    console.log(`[ML-DEBUG] FastAPI connection returned status: ${response.status}`);

    if (!response.body) throw new Error("No response body from ML engine");

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let done = false;
    let buffer = '';
    
    let finalImages: Record<string, string> = {};
    let finalResults: any = null;

    console.log(`[ML-DEBUG] Reading SSE stream...`);
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
              if (data.error) {
                 console.error(`[ML-DEBUG] FastAPI Pipeline Error:`, data.error);
                 throw new Error(data.error);
              }

              if (data.step) {
                 console.log(`[ML-DEBUG] Pipeline step ${data.step}: ${data.message}`);
              }

              if (data.partial_images) {
                finalImages = { ...finalImages, ...data.partial_images };
              }

              if (data.result) {
                finalResults = data.result;
                console.log(`[ML-DEBUG] Got final prediction!`, finalResults);
              }
            } catch(e: any) {
               if (e.message && msg.includes("error")) {
                  console.error(`[ML-DEBUG] Hard failure caught in parsing:`, e.message);
                  throw e;
               }
            }
          }
        }
      }
    }
    
    console.log(`[ML-DEBUG] Stream reading complete. Saving results...`);
    
    if (finalResults) {
      const vaultLayer = async (dict: Record<string, string> | undefined, prefix: string) => {
         if (!dict) return undefined;
         const out: Record<string, string> = {};
         for (const [k, v] of Object.entries(dict)) {
            if (!v) continue; // Skip null images
            try {
                const r = await ecgApi.uploadIntermediateImage(`${prefix}_${k}.png`, v);
                out[k] = r.url;
            } catch (layerErr) {
                console.error(`[ML-DEBUG] Could not vault feature map layer ${k}`, layerErr);
            }
         }
         return out;
      };

      console.log(`[ML-DEBUG] Vaulting artifact layers...`);
      const vaultedOriginal = finalImages.original ? (await ecgApi.uploadIntermediateImage('original.png', finalImages.original)).url : undefined;
      const vaultedGrayscale = finalImages.grayscale ? (await ecgApi.uploadIntermediateImage('grayscale.png', finalImages.grayscale)).url : undefined;
      const vaultedLeads = await vaultLayer(finalImages.leads, 'lead');
      const vaultedPreprocessed = await vaultLayer(finalImages.preprocessed, 'prep');
      const vaultedContours = await vaultLayer(finalImages.contours, 'cont');

      console.log(`[ML-DEBUG] Updating Supabase API record...`);
      await ecgApi.updateAnalysisResult(recordId, {
        prediction: finalResults.prediction,
        confidence: finalResults.confidence,
        similarityScore: finalResults.similarity_score,
        status: "completed", // <-- CRITICAL FIX: Make sure the UI detects this as completed immediately
        images: {
          ...(vaultedOriginal ? { original: vaultedOriginal } : {}),
          ...(vaultedGrayscale ? { grayscale: vaultedGrayscale } : {}),
          ...(vaultedLeads ? { leads: vaultedLeads as any } : {}),
          ...(vaultedPreprocessed ? { preprocessed: vaultedPreprocessed as any } : {}),
          ...(vaultedContours ? { contours: vaultedContours as any } : {})
        }
      });
      console.log(`[ML-DEBUG] ML pipeline FULLY complete and saved for ${recordId}`);
    } else {
      console.log(`[ML-DEBUG] No result payload was extracted from the SSE stream!`);
    }

  } catch (error) {
    console.error(`[ML-DEBUG] FATAL PIPELINE EXCEPTION for ${recordId}:`, error);
  }
}
