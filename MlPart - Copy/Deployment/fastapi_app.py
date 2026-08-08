import os
import sys
import shutil
import tempfile
import base64
import json
import asyncio
import queue
import multiprocessing
from concurrent.futures import ProcessPoolExecutor
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from skimage.io import imsave
from skimage import img_as_ubyte

# ══ Sklearn model compatibility patch ══
# Model was trained with sklearn 1.0.1. Fix compat with sklearn 1.4+
import warnings
warnings.filterwarnings("ignore", category=UserWarning, module="sklearn")
try:
    # Fix 1: Tree dtype - add missing 'missing_go_to_left' field
    import sklearn.tree._tree as _tree
    import numpy as np
    def _patched_check(node_ndarray, expected_dtype):
        if node_ndarray.dtype != expected_dtype:
            new_arr = np.zeros(node_ndarray.shape, dtype=expected_dtype)
            for field in node_ndarray.dtype.names:
                new_arr[field] = node_ndarray[field]
            new_arr['missing_go_to_left'] = np.uint8(0)
            return new_arr
        return node_ndarray
    _tree._check_node_ndarray = _patched_check

    # Fix 2: _passthrough_scorer removed in sklearn 1.4
    import sklearn.metrics._scorer as _scorer
    if not hasattr(_scorer, '_passthrough_scorer'):
        class _FakeScorer:
            def __call__(self, *a, **kw): return 0.0
        _scorer._passthrough_scorer = _FakeScorer()

    # Fix 3: monotonic_cst added in sklearn 1.4, missing in 1.0.1 models
    from sklearn.tree import DecisionTreeClassifier
    _orig_dt_getattr = DecisionTreeClassifier.__getattribute__ if hasattr(DecisionTreeClassifier, '__getattribute__') else None
    def _dt_getattr(self, name):
        if name == 'monotonic_cst':
            return None
        if _orig_dt_getattr:
            return _orig_dt_getattr(self, name)
        return object.__getattribute__(self, name)
    DecisionTreeClassifier.__getattribute__ = _dt_getattr
except Exception:
    pass

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

executor = ProcessPoolExecutor(max_workers=4)

def image_to_base64(filepath):
    try:
        if os.path.exists(filepath):
            with open(filepath, "rb") as image_file:
                encoded_string = base64.b64encode(image_file.read()).decode("utf-8")
                return f"data:image/png;base64,{encoded_string}"
    except Exception:
        pass
    return None

def process_ecg_pipeline_queue(image_bytes: bytes, original_dir: str, q):
    temp_dir = tempfile.mkdtemp()
    try:
        import matplotlib
        matplotlib.use('Agg')
        import matplotlib.pyplot as plt
        plt.rcParams['figure.dpi'] = 75

        q.put({"step": 1, "message": "Initializing Environment...", "progress": 5})
        
        for file in os.listdir(original_dir):
            if file.endswith(".pkl"):
                shutil.copy2(os.path.join(original_dir, file), temp_dir)
        
        sim_dir_src = os.path.join(original_dir, "SimilarityPictures")
        sim_dir_dst = os.path.join(temp_dir, "SimilarityPictures")
        if os.path.exists(sim_dir_src):
            shutil.copytree(sim_dir_src, sim_dir_dst)
            
        img_path = os.path.join(temp_dir, "uploaded_image.png")
        with open(img_path, "wb") as f:
            f.write(image_bytes)
            
        os.chdir(temp_dir)
        
        if original_dir not in sys.path:
            sys.path.append(original_dir)
        from Ecg import ECG
        
        ecg = ECG()
        
        ecg_user_image_read = ecg.getImage(img_path)
        import warnings
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            imsave("original_image.png", img_as_ubyte(ecg_user_image_read))
            ecg_user_gray_image_read = ecg.GrayImgae(ecg_user_image_read)
            imsave("grayscale_image.png", img_as_ubyte(ecg_user_gray_image_read))

        q.put({
            "step": 2, 
            "message": "Analyzing ECG Structural Similarity...", 
            "progress": 15,
            "partial_images": {
                "original": image_to_base64("original_image.png"),
                "grayscale": image_to_base64("grayscale_image.png")
            }
        })

        similarity_score = ecg.CheckSimilarity(ecg_user_gray_image_read)
        
        if similarity_score < 0.70:
            q.put({
                "success": False,
                "error": f"Uploaded image is not similar to ECG dataset format (Score: {similarity_score:.2f}). Please upload a valid ECG image."
            })
            return

        dividing_leads = ecg.DividingLeads(ecg_user_image_read)
        
        with warnings.catch_warnings():
            warnings.simplefilter("ignore")
            leads_dict = {}
            for i, lead_arr in enumerate(dividing_leads[:-1]):
                imsave(f"raw_lead_{i+1}.png", img_as_ubyte(lead_arr))
                leads_dict[f"lead_{i+1}"] = image_to_base64(f"raw_lead_{i+1}.png")
            imsave(f"raw_lead_13.png", img_as_ubyte(dividing_leads[-1]))
            leads_dict["long_lead"] = image_to_base64(f"raw_lead_13.png")

            q.put({
                "step": 3, 
                "message": "Segmenting 12 ECG Leads arrays...", 
                "progress": 30,
                "partial_images": {
                    "leads": leads_dict
                }
            })

            ecg.PreprocessingLeads(dividing_leads)
            
            from skimage import color
            from skimage.filters import threshold_otsu, gaussian
            from skimage.transform import resize
            
            preprocessed_dict = {}
            for i, lead_img in enumerate(dividing_leads[:-1]):
                grayscale_l = color.rgb2gray(lead_img)
                blurred_image_l = gaussian(grayscale_l, sigma=1)
                global_thresh_l = threshold_otsu(blurred_image_l)
                binary_global_l = blurred_image_l < global_thresh_l
                binary_global_l = resize(binary_global_l, (300, 450))
                imsave(f"prep_lead_{i+1}.png", img_as_ubyte(binary_global_l))
                preprocessed_dict[f"lead_{i+1}"] = image_to_base64(f"prep_lead_{i+1}.png")
            
            grayscale_13 = color.rgb2gray(dividing_leads[-1])
            blurred_image_13 = gaussian(grayscale_13, sigma=1)
            global_thresh_13 = threshold_otsu(blurred_image_13)
            binary_global_13 = blurred_image_13 < global_thresh_13
            imsave(f"prep_lead_13.png", img_as_ubyte(binary_global_13))
            preprocessed_dict["long_lead"] = image_to_base64(f"prep_lead_13.png")

            q.put({
                "step": 4, 
                "message": "Applying Otsu Thresholding mapping individually...", 
                "progress": 50,
                "partial_images": {
                    "preprocessed": preprocessed_dict
                }
            })

            ecg.SignalExtraction_Scaling(dividing_leads)
            
            from skimage import measure
            contours_dict = {}
            for i, lead_img in enumerate(dividing_leads[:-1]):
                grayscale_l = color.rgb2gray(lead_img)
                blurred_image_l = gaussian(grayscale_l, sigma=0.7)
                global_thresh_l = threshold_otsu(blurred_image_l)
                binary_global_l = blurred_image_l < global_thresh_l
                binary_global_l = resize(binary_global_l, (300, 450))
                contours_val = measure.find_contours(binary_global_l, 0.8)
                if contours_val:
                    contours_shape = sorted([x.shape for x in contours_val])[::-1][0:1]
                    test_c = None
                    for contour in contours_val:
                        if contour.shape in contours_shape:
                            test_c = resize(contour, (255, 2))
                    
                    fig = plt.figure(figsize=(4, 3))
                    ax = fig.add_subplot(111)
                    ax.invert_yaxis()
                    if test_c is not None:
                        ax.plot(test_c[:, 1], test_c[:, 0], linewidth=1.5, color='#3b82f6')
                    ax.axis('image')
                    ax.axis('off')
                    fig.savefig(f"contour_lead_{i+1}.png", bbox_inches='tight', pad_inches=0)
                    plt.close(fig)
                    contours_dict[f"lead_{i+1}"] = image_to_base64(f"contour_lead_{i+1}.png")
                else:
                    contours_dict[f"lead_{i+1}"] = None

            q.put({
                "step": 5, 
                "message": "Extrapolating 1D Contours into grid maps...", 
                "progress": 75,
                "partial_images": {
                    "contours": contours_dict
                }
            })

        q.put({"step": 6, "message": "Encoding Features via PCA Model...", "progress": 85})
        ecg_1dsignal = ecg.CombineConvert1Dsignal()
        ecg_final = ecg.DimensionalReduciton(ecg_1dsignal)
        
        q.put({"step": 7, "message": "Running Classifier Analytics...", "progress": 88})
        prediction_label = ecg.ModelLoad_predict(ecg_final)

        import joblib
        import numpy as np
        confidence = 100.0
        pred_code = 2  # default Normal
        try:
            clf = joblib.load('Heart_Disease_Prediction_using_ECG (4).pkl')
            if hasattr(clf, 'predict_proba'):
                probs = clf.predict_proba(ecg_final)[0]
                # Normalize — sklearn compat patch can cause un-normalized probs
                prob_sum = sum(probs)
                if prob_sum > 0:
                    probs = probs / prob_sum
                confidence = float(np.max(probs)) * 100
                confidence = min(confidence, 100.0)  # clamp
            # Get numeric prediction code
            raw_pred = clf.predict(ecg_final)
            pred_code = int(raw_pred[0])
        except Exception:
            pass

        # ── Step 8-10: Explainability Analysis ──
        q.put({"step": 8, "message": "Generating Clinical Explainability Report...", "progress": 92})
        
        explainability = {}
        try:
            from ecg_explainability import run_full_explainability
            import pandas as pd
            
            # Read back the 12 scaled 1D lead signals from CSVs
            signal_csvs = {}
            for lead_idx in range(12):
                csv_path = f'Scaled_1DLead_{lead_idx + 1}.csv'
                if os.path.exists(csv_path):
                    df = pd.read_csv(csv_path)
                    signal_csvs[f'lead_{lead_idx + 1}'] = df.values.flatten().tolist()
            
            # Load PCA model for explainability
            pca_model = joblib.load('PCA_ECG (1).pkl')
            
            # Run full explainability — passes lead images for PQRST annotation
            explainability = run_full_explainability(
                signal_csvs, clf, pca_model, prediction_label, pred_code,
                lead_images=leads_dict
            )
            
            # Stream annotated signals as partial images
            if explainability.get("annotated_signals"):
                q.put({
                    "step": 9, 
                    "message": "PQRST Wave Analysis Complete", 
                    "progress": 97,
                    "partial_images": {
                        "annotated": explainability["annotated_signals"]
                    }
                })
                # Remove from final payload to avoid double-sending
                explainability.pop("annotated_signals", None)
                
        except Exception as ex:
            import traceback
            explainability = {"error": str(ex), "trace": traceback.format_exc()}

        q.put({"step": 10, "message": "Report Ready", "progress": 100})
            
        results = {
            "success": True,
            "prediction": prediction_label,
            "similarity_score": float(similarity_score),
            "confidence": confidence,
            "explainability": explainability,
            "images": {}  # already shipped to UI via partial streams
        }
        
        q.put({"result": results})
        
    except Exception as e:
        import traceback
        q.put({
            "success": False,
            "error": str(e),
            "trace": traceback.format_exc()
        })
    finally:
        os.chdir(original_dir)
        shutil.rmtree(temp_dir, ignore_errors=True)

def __validate_ecg_sync(image_bytes: bytes, original_dir: str):
    temp_dir = tempfile.mkdtemp()
    try:
        import matplotlib
        matplotlib.use('Agg')
        
        sim_dir_src = os.path.join(original_dir, "SimilarityPictures")
        sim_dir_dst = os.path.join(temp_dir, "SimilarityPictures")
        if os.path.exists(sim_dir_src):
            shutil.copytree(sim_dir_src, sim_dir_dst)
            
        img_path = os.path.join(temp_dir, "uploaded_image.png")
        with open(img_path, "wb") as f:
            f.write(image_bytes)
            
        os.chdir(temp_dir)
        
        if original_dir not in sys.path:
            sys.path.append(original_dir)
        from Ecg import ECG
        
        ecg = ECG()
        
        try:
            ecg_user_image_read = ecg.getImage(img_path)
            ecg_user_gray_image_read = ecg.GrayImgae(ecg_user_image_read)
            similarity_score = ecg.CheckSimilarity(ecg_user_gray_image_read)
            
            is_ecg = similarity_score >= 0.70
            return {
                "is_ecg": bool(is_ecg),
                "confidence": float(similarity_score),
                "message": "Valid ECG" if is_ecg else "Not an ECG image"
            }
        except Exception as e:
            return {
                 "is_ecg": False,
                 "confidence": 0.0,
                 "message": f"Invalid or corrupted image format. ({str(e)})"
            }
    finally:
        os.chdir(original_dir)
        shutil.rmtree(temp_dir, ignore_errors=True)

@app.post("/validate-ecg")
async def validate_ecg(file: UploadFile = File(...)):
    image_bytes = await file.read()
    original_dir = os.path.abspath(os.path.dirname(__file__))
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(executor, __validate_ecg_sync, image_bytes, original_dir)
    return result

@app.post("/predict")
async def predict(file: UploadFile = File(...)):
    image_bytes = await file.read()
    original_dir = os.path.abspath(os.path.dirname(__file__))
    
    manager = multiprocessing.Manager()
    q = manager.Queue()
    
    loop = asyncio.get_event_loop()
    task = loop.run_in_executor(executor, process_ecg_pipeline_queue, image_bytes, original_dir, q)
    
    async def event_generator():
        import queue as qm
        while True:
            try:
                msg = q.get_nowait()
                yield f"data: {json.dumps(msg)}\n\n"
                if "error" in msg or "result" in msg:
                    break
            except qm.Empty:
                if task.done():
                    ex = task.exception()
                    if ex:
                        yield f"data: {json.dumps({'success': False, 'error': str(ex)})}\n\n"
                    break
                await asyncio.sleep(0.1)

    return StreamingResponse(event_generator(), media_type="text/event-stream")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
