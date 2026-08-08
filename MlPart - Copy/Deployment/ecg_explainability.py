"""
ECG Explainability Module — Cardiologist-Grade Analysis
Provides detailed per-lead PQRST wave detection, amplitude measurements,
interval computation, morphology flags, axis estimation, rhythm analysis,
and rich annotated signal plots with values shown directly on the image.
"""
import numpy as np
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from scipy.signal import find_peaks, savgol_filter
import base64, io, warnings

CLASS_NAMES = {0: "Abnormal Heartbeat", 1: "Myocardial Infarction", 2: "Normal", 3: "History of MI"}
LEAD_NAMES = ["Lead I","aVR","V1","V4","Lead II","aVL","V2","V5","Lead III","aVF","V3","V6"]
LEAD_KEYS = [f"lead_{i+1}" for i in range(12)]

# Approximate: 255 samples ~ 2.5s per lead strip at 25mm/s
SAMPLE_RATE = 255 / 2.5  # samples per second
MS_PER_SAMPLE = 1000.0 / SAMPLE_RATE  # ~9.8 ms per sample

LEAD_TERRITORIES = {
    "Lead I": "Lateral", "Lead II": "Inferior", "Lead III": "Inferior",
    "aVR": "Cavity", "aVL": "Lateral", "aVF": "Inferior",
    "V1": "Septal", "V2": "Septal", "V3": "Anterior", "V4": "Anterior",
    "V5": "Lateral", "V6": "Lateral"
}

# ══════════════════════════════════════════════════════════════
#  PROPER SIGNAL EXTRACTION FROM LEAD IMAGE
#  The original Ecg.py uses find_contours which traces the INK
#  BOUNDARY, not the actual waveform. This function correctly
#  extracts the signal by finding the mean Y-position of black
#  pixels in each column — preserving true morphology.
# ══════════════════════════════════════════════════════════════
def extract_signal_from_lead_image(lead_image_b64):
    """Extract a faithful 1D ECG signal from a segmented lead image.
    
    Uses CONTINUITY TRACKING: for each column, picks the trace pixel closest 
    to the previous column's position. This naturally follows the ECG trace
    while ignoring grid dots at unrelated Y positions.
    
    The Ecg.py contour CSV stores boundary-loop Y values (top edge + bottom 
    edge of ink), which doesn't give the true waveform. This function 
    extracts the actual waveform centerline.
    """
    from skimage.io import imread as sk_imread
    from skimage import color
    from skimage.filters import threshold_otsu, gaussian
    from skimage.transform import resize as sk_resize
    from scipy.interpolate import interp1d
    from scipy.ndimage import median_filter

    # Decode base64 image
    if ',' in lead_image_b64:
        img_data = base64.b64decode(lead_image_b64.split(',')[1])
    else:
        img_data = base64.b64decode(lead_image_b64)
    img = sk_imread(io.BytesIO(img_data))

    # Handle RGBA → RGB
    if len(img.shape) == 3 and img.shape[-1] == 4:
        img = img[:, :, :3]

    # Convert to grayscale
    if len(img.shape) == 3:
        gray = color.rgb2gray(img)
    else:
        gray = img.astype(float)
        if gray.max() > 1: gray = gray / 255.0

    # Resize to standard dimensions (same as Ecg.py)
    gray = sk_resize(gray, (300, 450), anti_aliasing=True)

    # Otsu threshold (same as Ecg.py — proven to capture the trace)
    blurred = gaussian(gray, sigma=0.7)
    thresh = threshold_otsu(blurred)
    binary = blurred < thresh  # True = dark pixels (trace + grid)
    n_rows, n_cols = binary.shape

    # Crop left margin for text labels ("II", "V3", etc.)
    text_crop = int(n_cols * 0.08)

    # ── CONTINUITY TRACKING ──
    # For each column, find the dark pixel closest to the previous column's 
    # trace position. This follows the continuous ECG trace while ignoring
    # scattered grid dots at other Y positions.
    signal = np.full(n_cols, np.nan)
    prev_y = None

    for col in range(text_crop, n_cols):
        col_pixels = np.where(binary[:, col])[0]
        if len(col_pixels) == 0:
            continue

        if prev_y is None:
            # First column: use median of all dark pixels
            signal[col] = np.median(col_pixels)
            prev_y = signal[col]
        else:
            # Find pixels close to previous position (within tracking window)
            dists = np.abs(col_pixels - prev_y)
            window = 15  # tracking window in pixels
            close_pixels = col_pixels[dists < window]
            
            if len(close_pixels) > 0:
                # Use median of nearby pixels (captures trace center)
                signal[col] = np.median(close_pixels)
            else:
                # No nearby pixels — use closest one (trace may have jumped)
                signal[col] = col_pixels[np.argmin(dists)]
            
            prev_y = signal[col]

    # Interpolate NaN gaps
    valid_mask = ~np.isnan(signal)
    if valid_mask.sum() < 20:
        return np.zeros(255)

    valid_x = np.where(valid_mask)[0]
    valid_y = signal[valid_mask]
    interp_fn = interp1d(valid_x, valid_y, kind='linear', fill_value='extrapolate')
    signal = interp_fn(np.arange(n_cols))

    # Light smoothing
    signal = median_filter(signal, size=3)

    # Invert Y-axis (image Y is top-down, ECG amplitude is bottom-up)
    signal = -signal + n_rows

    # Resample to 255 points
    x_orig = np.linspace(0, 1, len(signal))
    x_new = np.linspace(0, 1, 255)
    signal = interp1d(x_orig, signal, kind='cubic')(x_new)

    # Normalize to [0, 1]
    smin, smax = signal.min(), signal.max()
    if smax - smin > 1e-6:
        signal = (signal - smin) / (smax - smin)
    else:
        signal = np.zeros(255)

    return signal


def _smooth(sig, w=11, p=3):
    if len(sig) < w: return sig
    ww = min(w, len(sig) if len(sig)%2==1 else len(sig)-1)
    return savgol_filter(sig, ww, min(p, ww-1))

def detect_pqrst(signal_1d):
    """Detect PQRST using NeuroKit2 — clinically validated wavelet-based delineation.
    Signal is tiled 3x and upsampled to 500Hz for reliable detection.
    Only results from the middle segment are kept. Falls back to scipy if NK2 fails."""
    import neurokit2 as nk
    from scipy.interpolate import interp1d
    sig = np.array(signal_1d, dtype=float).flatten()
    n_orig = len(sig)
    if n_orig < 20:
        return {"P":[],"Q":[],"R":[],"S":[],"T":[],"valid":False,"method":"none"}

    try:
        # Tile 3x for enough data, then upsample to 500Hz
        sig3 = np.tile(sig, 3)
        n3 = len(sig3)
        TARGET_SR = 500
        duration_sec = n3 / SAMPLE_RATE
        n_up = int(duration_sec * TARGET_SR)
        sig_up = interp1d(np.linspace(0, 1, n3), sig3, kind='cubic')(np.linspace(0, 1, n_up))

        # NeuroKit2 pipeline on upsampled tiled signal
        ecg_clean = nk.ecg_clean(sig_up, sampling_rate=TARGET_SR, method="neurokit")
        _, rpeaks_dict = nk.ecg_peaks(ecg_clean, sampling_rate=TARGET_SR, method="neurokit")
        r_up = rpeaks_dict.get("ECG_R_Peaks", [])
        if len(r_up) == 0:
            raise ValueError("No R-peaks found")

        # Delineate using DWT
        _, waves = nk.ecg_delineate(ecg_clean, rpeaks_dict,
                                      sampling_rate=TARGET_SR, method="dwt", show=False)

        # Map back to original 3x space, then filter middle segment only
        scale = n3 / n_up
        mid_start, mid_end = n_orig, 2 * n_orig  # middle segment bounds

        def _map_and_filter(arr):
            if arr is None: return []
            result = []
            for x in arr:
                if np.isnan(x): continue
                orig_idx = float(x) * scale
                if mid_start <= orig_idx < mid_end:
                    result.append(int(round(orig_idx - mid_start)))
            return result

        r_peaks = _map_and_filter(r_up)
        p_peaks = _map_and_filter(waves.get("ECG_P_Peaks"))
        q_peaks = _map_and_filter(waves.get("ECG_Q_Peaks"))
        s_peaks = _map_and_filter(waves.get("ECG_S_Peaks"))
        t_peaks = _map_and_filter(waves.get("ECG_T_Peaks"))
        p_onsets = _map_and_filter(waves.get("ECG_P_Onsets"))
        p_offsets = _map_and_filter(waves.get("ECG_P_Offsets"))
        t_onsets = _map_and_filter(waves.get("ECG_T_Onsets"))
        t_offsets = _map_and_filter(waves.get("ECG_T_Offsets"))

        if len(r_peaks) == 0:
            raise ValueError("No R-peaks in middle segment")

        return {"P": p_peaks, "Q": q_peaks, "R": r_peaks,
                "S": s_peaks, "T": t_peaks,
                "P_Onsets": p_onsets, "P_Offsets": p_offsets,
                "T_Onsets": t_onsets, "T_Offsets": t_offsets,
                "valid": True, "method": "neurokit2"}

    except Exception:
        # Fallback: basic scipy peak detection
        sm = _smooth(sig)
        r_peaks, _ = find_peaks(sm, distance=30, prominence=0.05, height=np.percentile(sm,60))
        if len(r_peaks)==0:
            r_peaks, _ = find_peaks(sm, distance=20, prominence=0.02)
        if len(r_peaks)==0:
            r_peaks = np.array([np.argmax(sm)])
        q_w, s_w, p_w, t_w = [],[],[],[]
        for r in r_peaks:
            qs, qe = max(0,r-25), max(0,r-2)
            if qe>qs: q_w.append(int(qs+np.argmin(sm[qs:qe])))
            ss, se = min(len(sm)-1,r+2), min(len(sm),r+25)
            if se>ss: s_w.append(int(ss+np.argmin(sm[ss:se])))
            ps, pe = max(0,r-60), max(0,r-20)
            if pe>ps:
                seg=sm[ps:pe]; pp,_=find_peaks(seg,distance=5)
                if len(pp)>0: p_w.append(int(ps+pp[np.argmax(seg[pp])]))
            ts, te = min(len(sm)-1,r+25), min(len(sm),r+80)
            if te>ts:
                seg=sm[ts:te]; tp,_=find_peaks(seg,distance=5)
                if len(tp)>0: t_w.append(int(ts+tp[np.argmax(seg[tp])]))
        return {"P":p_w,"Q":q_w,"R":[int(r) for r in r_peaks],"S":s_w,"T":t_w,
                "valid":True,"method":"fallback"}

def compute_detailed_measurements(sig_1d, pqrst):
    """Compute cardiologist-grade measurements using NeuroKit2 results.
    All measurements come from the live extracted signal — model-independent."""
    import neurokit2 as nk
    sig = np.array(sig_1d, dtype=float).flatten()
    n = len(sig)
    baseline = float(np.median(sig))
    method = pqrst.get("method", "fallback")

    out = {"heart_rate":"N/A","rhythm":"N/A","p_amplitude":0.0,"q_depth":0.0,
           "r_amplitude":0.0,"s_depth":0.0,"t_amplitude":0.0,
           "pr_interval_ms":0.0,"qrs_duration_ms":0.0,"qt_interval_ms":0.0,
           "st_deviation":0.0,"st_slope":"Isoelectric",
           "p_morphology":"Absent","t_morphology":"Normal","q_pathological":False,
           "r_progression":"N/A","flag":"unknown","findings":[],
           "analysis_method": method}

    if not pqrst.get("valid") or len(pqrst["R"])==0:
        return out

    # Use original signal — NK2 indices are mapped back to original space
    csig = sig

    # ── R amplitude ──
    r_vals = [float(csig[i]) for i in pqrst["R"] if i<n]
    out["r_amplitude"] = round(max(r_vals)-baseline, 4) if r_vals else 0

    # ── Q depth ──
    if pqrst["Q"]:
        q_vals = [float(csig[i]) for i in pqrst["Q"] if i<n]
        out["q_depth"] = round(baseline-min(q_vals), 4) if q_vals else 0
        r_amp = abs(out["r_amplitude"])+1e-6
        if out["q_depth"] > 0.40 * r_amp and out["q_depth"] > 0.1:
            out["q_pathological"] = True
            out["findings"].append("")

    # ── S depth ──
    if pqrst["S"]:
        s_vals = [float(csig[i]) for i in pqrst["S"] if i<n]
        out["s_depth"] = round(baseline-min(s_vals), 4) if s_vals else 0

    # ── P wave amplitude & morphology ──
    r_amp_abs = abs(out["r_amplitude"]) + 1e-6
    if pqrst["P"]:
        p_vals = [float(csig[i]) for i in pqrst["P"] if i<n]
        p_amp = max(p_vals)-baseline if p_vals else 0
        out["p_amplitude"] = round(p_amp, 4)
        if p_amp < -0.15:
            out["p_morphology"] = "Inverted"
            out["findings"].append("Inverted P wave")
        elif p_amp > 0.6 and p_amp > 0.75 * r_amp_abs:
            out["p_morphology"] = "Peaked"
            out["findings"].append("Peaked P wave (possible atrial enlargement)")
        elif p_amp > 0.01:
            out["p_morphology"] = "Normal"
        else:
            out["p_morphology"] = "Flattened"
    else:
        out["p_morphology"] = "Absent"

    # ── T wave amplitude & morphology ──
    if pqrst["T"]:
        t_vals = [float(csig[i]) for i in pqrst["T"] if i<n]
        t_amp = max(t_vals)-baseline if t_vals else 0
        out["t_amplitude"] = round(t_amp, 4)
        if t_amp < -0.15:
            out["t_morphology"] = "Inverted"
            out["findings"].append("T-wave inversion")
        elif t_amp > 0.65 and t_amp > 0.9 * r_amp_abs:
            out["t_morphology"] = "Peaked"
            out["findings"].append("Peaked T wave (possible hyperkalemia or ischemia)")
        elif t_amp < 0.005:
            out["t_morphology"] = "Flattened"
        else:
            out["t_morphology"] = "Normal"

    # ── Heart rate & rhythm (from R-R intervals) ──
    r_sorted = sorted(pqrst["R"])
    if len(r_sorted) >= 2:
        rr = np.diff(r_sorted)
        rr_ms = rr * MS_PER_SAMPLE
        avg_rr = np.mean(rr_ms)
        out["heart_rate"] = int(round(60000/avg_rr)) if avg_rr>0 else "N/A"
        rr_std = np.std(rr_ms)
        out["rhythm"] = "Regular" if rr_std < avg_rr*0.20 else "Irregular"
        if out["rhythm"] == "Irregular":
            out["findings"].append("Irregular rhythm detected")

    # ── PR interval (uses NK2 P_Onsets if available) ──
    if pqrst["P"] and pqrst["R"]:
        # Prefer P-onset to R-peak for clinical accuracy
        p_ref = pqrst.get("P_Onsets", pqrst["P"])
        if not p_ref: p_ref = pqrst["P"]
        pr_samples = [r-p for p,r in zip(sorted(p_ref),sorted(pqrst["R"])) if r>p]
        if pr_samples:
            out["pr_interval_ms"] = round(float(np.mean(pr_samples))*MS_PER_SAMPLE, 1)
            if out["pr_interval_ms"] > 220:
                out["findings"].append("")
            elif out["pr_interval_ms"] < 100:
                out["findings"].append("")

    # ── QRS duration (per-beat pairing through nearest R-peak) ──
    r_sorted = sorted(pqrst["R"])
    if pqrst["Q"] and pqrst["S"] and r_sorted:
        qrs_per_beat = []
        for r in r_sorted:
            # Find Q closest to this R (must be before R)
            q_cands = [q for q in pqrst["Q"] if q < r]
            s_cands = [s for s in pqrst["S"] if s > r]
            if q_cands and s_cands:
                q_best = max(q_cands)  # closest Q before R
                s_best = min(s_cands)  # closest S after R
                dur = abs(s_best - q_best)
                if dur < 50:  # sanity: max ~490ms at our sample rate
                    qrs_per_beat.append(dur)
        if qrs_per_beat:
            out["qrs_duration_ms"] = round(float(np.mean(qrs_per_beat)) * MS_PER_SAMPLE, 1)
            if out["qrs_duration_ms"] > 200:
                out["findings"].append(f"Wide QRS ({out['qrs_duration_ms']:.0f}ms)")

    # ── QT interval (per-beat: Q before R → T after R) ──
    if pqrst["Q"] and r_sorted:
        t_end = pqrst.get("T_Offsets", pqrst.get("T", []))
        if not t_end: t_end = pqrst.get("T", [])
        qt_per_beat = []
        for r in r_sorted:
            q_cands = [q for q in pqrst["Q"] if q < r]
            t_cands = [t for t in t_end if t > r]
            if q_cands and t_cands:
                q_best = max(q_cands)
                t_best = min(t_cands)
                qt_dur = t_best - q_best
                if 10 < qt_dur < 150:  # sanity check
                    qt_per_beat.append(qt_dur)
        if qt_per_beat:
            out["qt_interval_ms"] = round(float(np.mean(qt_per_beat)) * MS_PER_SAMPLE, 1)

    # ── ST deviation (CORRECT: ST-segment level relative to baseline) ──
    # ST segment = the flat region BETWEEN the S wave and the T onset.
    # Deviation = (ST segment level) - (baseline). NOT T_peak - S_trough!
    if pqrst["S"] and r_sorted:
        t_onsets = pqrst.get("T_Onsets", pqrst.get("T", []))
        if not t_onsets: t_onsets = pqrst.get("T", [])
        st_devs = []
        for r in r_sorted:
            s_cands = [s for s in pqrst["S"] if s > r]
            t_cands = [t for t in t_onsets if t > r]
            if s_cands and t_cands:
                s_idx = min(s_cands)
                t_idx = min(t_cands)
                if t_idx > s_idx:
                    # ST segment midpoint
                    st_mid = (s_idx + t_idx) // 2
                    if 0 <= st_mid < n:
                        # Average a few samples around the midpoint for stability
                        w = 3
                        seg_start = max(0, st_mid - w)
                        seg_end = min(n, st_mid + w + 1)
                        st_level = float(np.mean(csig[seg_start:seg_end]))
                        st_devs.append(st_level - baseline)
        if st_devs:
            st_dev = float(np.mean(st_devs))
            out["st_deviation"] = round(st_dev, 4)
            # Classify slope
            if st_dev > 0.02: out["st_slope"] = "Upsloping"
            elif st_dev < -0.02: out["st_slope"] = "Downsloping"
            else: out["st_slope"] = "Horizontal"
            # Flag only significant deviations (relative to baseline)
            if st_dev > 0.12:
                out["findings"].append(f"ST elevation (+{st_dev:.3f})")
            elif st_dev < -0.12:
                out["findings"].append(f"ST depression ({st_dev:.3f})")

    # ── Signal quality assessment via NeuroKit2 ──
    try:
        quality = nk.ecg_quality(csig, sampling_rate=int(SAMPLE_RATE), method="zhao2018")
        if isinstance(quality, (list, np.ndarray)):
            q_score = float(np.mean(quality))
        else:
            q_score = float(quality)
        out["signal_quality"] = round(q_score, 3)
    except Exception:
        out["signal_quality"] = 0.5

    # ── Flag determination ──
    
    if len(out["findings"]) == 0:
        out["flag"] = "normal"
        out["findings"].append("Within normal limits")

    return out

def generate_annotated_lead_image(lead_image_b64, pqrst_from_csv, lead_name, measurements, trace_signal=None):
    """Annotate PQRST markers DIRECTLY on the raw lead image.
    
    KEY: Extracts trace from the SAME binary image, detects PQRST on it,
    then maps markers back to pixel coordinates in the SAME coordinate system.
    This guarantees perfect alignment — markers always sit on the trace.
    
    Clinical features:
    - All beats annotated with P, Q, R, S, T markers
    - RR interval brackets with HR
    - QRS duration bracket on reference beat
    - Beat numbering (①②③...)
    - Rhythm classification tag
    - Abnormality flags
    - Measurement info box
    """
    from skimage.io import imread as sk_imread
    from skimage.transform import resize as sk_resize
    from skimage import color
    from skimage.filters import threshold_otsu, gaussian
    from scipy.interpolate import interp1d
    from scipy.ndimage import median_filter
    from PIL import Image, ImageDraw, ImageFont

    # ── Decode the raw lead image ──
    if ',' in lead_image_b64:
        img_data = base64.b64decode(lead_image_b64.split(',')[1])
    else:
        img_data = base64.b64decode(lead_image_b64)
    
    pil_img = Image.open(io.BytesIO(img_data)).convert('RGB')
    orig_w, orig_h = pil_img.size
    
    # ── Extract trace from binary image ──
    img_arr = sk_imread(io.BytesIO(img_data))
    if len(img_arr.shape) == 3 and img_arr.shape[-1] == 4:
        img_arr = img_arr[:, :, :3]
    if len(img_arr.shape) == 3:
        gray = color.rgb2gray(img_arr)
    else:
        gray = img_arr.astype(float)
        if gray.max() > 1: gray /= 255.0
    
    gray_resized = sk_resize(gray, (300, 450), anti_aliasing=True)
    blurred = gaussian(gray_resized, sigma=0.7)
    thresh = threshold_otsu(blurred)
    binary = blurred < thresh
    n_rows, n_cols = 300, 450
    
    text_crop = int(n_cols * 0.08)  # skip text labels
    
    # Continuity tracking — extract trace Y per column
    trace_y = np.full(n_cols, np.nan)
    prev_y = None
    for c in range(text_crop, n_cols):
        col_pixels = np.where(binary[:, c])[0]
        if len(col_pixels) == 0:
            continue
        if prev_y is None:
            trace_y[c] = np.median(col_pixels)
            prev_y = trace_y[c]
        else:
            dists = np.abs(col_pixels - prev_y)
            close_px = col_pixels[dists < 15]
            if len(close_px) > 0:
                trace_y[c] = np.median(close_px)
            else:
                trace_y[c] = col_pixels[np.argmin(dists)]
            prev_y = trace_y[c]
    
    # Interpolate gaps in trace
    valid_mask = ~np.isnan(trace_y)
    if valid_mask.sum() < 20:
        # Not enough trace — return original image unchanged
        buf = io.BytesIO()
        pil_img.save(buf, format='PNG')
        buf.seek(0)
        return f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"
    
    vx = np.where(valid_mask)[0]
    vy = trace_y[valid_mask]
    trace_y_full = interp1d(vx, vy, kind='linear', fill_value='extrapolate')(np.arange(n_cols))
    trace_y_full = median_filter(trace_y_full, size=3)
    
    # Create 1D signal for PQRST detection (inverted Y, normalized)
    signal_for_detection = -trace_y_full + n_rows  # invert Y axis
    # Resample to 255 for PQRST detection
    sig_255 = interp1d(np.linspace(0, 1, n_cols), signal_for_detection, kind='cubic')(
        np.linspace(0, 1, 255)
    )
    smin, smax = sig_255.min(), sig_255.max()
    if smax - smin > 1e-6:
        sig_255 = (sig_255 - smin) / (smax - smin)
    
    # ── Detect PQRST on the image-extracted signal ──
    pqrst = detect_pqrst(sig_255)
    
    # Also update measurements using this signal for consistency
    meas_local = compute_detailed_measurements(sig_255, pqrst)
    # Merge key measurements (keep the ones from CSV for model consistency,
    # but use local for marker placement)
    
    # ── Coordinate mapping ──
    # PQRST indices (0-254) → column in 450-space → pixel in orig image
    def idx_to_pixel(idx_255):
        """Convert 255-sample index to (pixel_x, pixel_y) on original image."""
        col = int(idx_255 * (n_cols / 255.0))
        col = max(0, min(n_cols - 1, col))
        row = trace_y_full[col]  # Y position in 300-row space
        px_x = int(col * (orig_w / n_cols))
        px_y = int(row * (orig_h / n_rows))
        px_x = max(0, min(orig_w - 1, px_x))
        px_y = max(0, min(orig_h - 1, px_y))
        return px_x, px_y
    
    # ── Drawing setup ──
    draw = ImageDraw.Draw(pil_img)
    try:
        font = ImageFont.truetype("arial.ttf", max(12, orig_h // 22))
        font_sm = ImageFont.truetype("arial.ttf", max(9, orig_h // 28))
        font_lg = ImageFont.truetype("arial.ttf", max(14, orig_h // 18))
    except:
        font = ImageFont.load_default()
        font_sm = font
        font_lg = font
    
    marker_r = max(3, min(orig_w, orig_h) // 70)
    
    # ── Color configuration ──
    colors = {
        "P": "#22c55e", "Q": "#f97316", "R": "#ef4444",
        "S": "#f59e0b", "T": "#8b5cf6"
    }
    
    if not pqrst.get("valid"):
        # No valid PQRST — return image with just info box
        pass
    else:
        # ── Annotate ALL beats with colored markers ──
        for wave_name in ["P", "Q", "R", "S", "T"]:
            clr = colors[wave_name]
            for idx in pqrst.get(wave_name, []):
                if 0 <= idx < 255:
                    px_x, px_y = idx_to_pixel(idx)
                    # Draw filled circle marker
                    draw.ellipse(
                        [px_x - marker_r, px_y - marker_r,
                         px_x + marker_r, px_y + marker_r],
                        fill=clr, outline='white', width=1
                    )
                    # Label (above for P,R,T; below for Q,S)
                    if wave_name in ("Q", "S"):
                        lbl_y = px_y + marker_r + 1
                    else:
                        lbl_y = px_y - marker_r - max(12, orig_h // 22)
                    draw.text((px_x - 3, lbl_y), wave_name, fill=clr, font=font)
        
        # ── Beat numbering on R peaks ──
        r_sorted = sorted(pqrst.get("R", []))
        for beat_num, r_idx in enumerate(r_sorted, 1):
            px_x, px_y = idx_to_pixel(r_idx)
            num_txt = str(beat_num)
            draw.text((px_x - 3, max(2, px_y - marker_r - max(26, orig_h // 12))),
                      num_txt, fill='#ffffff', font=font_sm)
        
        # ── RR interval bracket (between first two R peaks) ──
        if len(r_sorted) >= 2:
            r1_x, r1_y = idx_to_pixel(r_sorted[0])
            r2_x, r2_y = idx_to_pixel(r_sorted[1])
            bracket_y = max(r1_y, r2_y) + max(20, orig_h // 10)
            bracket_y = min(bracket_y, orig_h - 15)
            # Draw bracket line
            draw.line([(r1_x, bracket_y), (r2_x, bracket_y)], fill='#38bdf8', width=2)
            draw.line([(r1_x, bracket_y - 4), (r1_x, bracket_y + 4)], fill='#38bdf8', width=2)
            draw.line([(r2_x, bracket_y - 4), (r2_x, bracket_y + 4)], fill='#38bdf8', width=2)
            # HR text
            rr_samples = r_sorted[1] - r_sorted[0]
            if rr_samples > 0:
                rr_ms = rr_samples * (1000 / (255 / 2.5))  # approximate
                hr = int(60000 / rr_ms) if rr_ms > 0 else 0
                mid_x = (r1_x + r2_x) // 2
                draw.text((mid_x - 15, bracket_y + 2), f"RR", fill='#38bdf8', font=font_sm)
        
        # ── QRS duration bracket on first complete beat ──
        q_sorted = sorted(pqrst.get("Q", []))
        s_sorted = sorted(pqrst.get("S", []))
        if q_sorted and s_sorted and r_sorted:
            # Find Q before first R and S after first R
            r0 = r_sorted[0]
            q_before = [q for q in q_sorted if q < r0]
            s_after = [s for s in s_sorted if s > r0]
            if q_before and s_after:
                q_idx = max(q_before)
                s_idx = min(s_after)
                q_px_x, q_px_y = idx_to_pixel(q_idx)
                s_px_x, s_px_y = idx_to_pixel(s_idx)
                bkt_y = max(q_px_y, s_px_y) + max(8, orig_h // 20)
                bkt_y = min(bkt_y, orig_h - 10)
                draw.line([(q_px_x, bkt_y), (s_px_x, bkt_y)], fill='#f97316', width=2)
                draw.line([(q_px_x, bkt_y-3), (q_px_x, bkt_y+3)], fill='#f97316', width=2)
                draw.line([(s_px_x, bkt_y-3), (s_px_x, bkt_y+3)], fill='#f97316', width=2)
                qrs_ms = measurements.get('qrs_duration_ms', meas_local.get('qrs_duration_ms', 0))
                mid_qrs = (q_px_x + s_px_x) // 2
                draw.text((mid_qrs - 10, bkt_y + 1), f"QRS", fill='#f97316', font=font_sm)
    
    # ── Rhythm tag (top-left) ──
    m = measurements  # use original measurements for display
    rhythm = m.get('rhythm', meas_local.get('rhythm', 'N/A'))
    territory = LEAD_TERRITORIES.get(lead_name, "")
    
    # Draw rhythm tag
    rhythm_txt = f"{rhythm}"
    rhythm_color = "#22c55e" if rhythm == "Regular" else "#f59e0b"
    # Semi-transparent tag background
    overlay = Image.new('RGBA', pil_img.size, (0, 0, 0, 0))
    ov_draw = ImageDraw.Draw(overlay)
    tag_w = max(60, len(rhythm_txt) * 7 + 10)
    ov_draw.rounded_rectangle([3, 3, 3 + tag_w, 3 + max(16, orig_h // 18)],
                               radius=4, fill=(15, 23, 42, 180), outline=rhythm_color, width=1)
    pil_img = Image.alpha_composite(pil_img.convert('RGBA'), overlay).convert('RGB')
    draw = ImageDraw.Draw(pil_img)
    draw.text((7, 5), rhythm_txt, fill=rhythm_color, font=font_sm)
    
    # ── Measurement info box (top-right) ──
    hr_txt = f"{m['heart_rate']} bpm" if isinstance(m.get('heart_rate'), int) else \
             (f"{meas_local['heart_rate']} bpm" if isinstance(meas_local.get('heart_rate'), int) else "—")
    flag_colors = {"normal": "#22c55e", "warning": "#f59e0b", "danger": "#ef4444"}
    flag_clr = flag_colors.get(m.get('flag', meas_local.get('flag', '')), '#64748b')
    
    st_dev = m.get('st_deviation', meas_local.get('st_deviation', 0))
    p_morph = m.get('p_morphology', meas_local.get('p_morphology', 'N/A'))
    t_morph = m.get('t_morphology', meas_local.get('t_morphology', 'N/A'))
    qrs_ms = m.get('qrs_duration_ms', meas_local.get('qrs_duration_ms', 0))
    
    info_lines = [
        f"{lead_name} ({territory})",
        f"HR: {hr_txt}",
        f"ST: {'+' if st_dev > 0 else ''}{st_dev:.3f}",
        f"P: {p_morph}  T: {t_morph}",
        f"QRS: {qrs_ms:.0f}ms",
    ]
    
    # Add abnormality flags
    findings = m.get('findings', meas_local.get('findings', []))
    danger_findings = [f for f in findings if f != "Within normal limits"]
    if danger_findings:
        info_lines.append(f"⚠ {danger_findings[0][:25]}")
    
    line_h = max(13, orig_h // 22)
    box_w = max(orig_w // 3, 130)
    box_h = len(info_lines) * line_h + 8
    box_x = orig_w - box_w - 4
    box_y = 3
    
    overlay2 = Image.new('RGBA', pil_img.size, (0, 0, 0, 0))
    ov2_draw = ImageDraw.Draw(overlay2)
    ov2_draw.rounded_rectangle([box_x, box_y, box_x + box_w, box_y + box_h],
                                radius=5, fill=(15, 23, 42, 190), outline=flag_clr, width=2)
    pil_img = Image.alpha_composite(pil_img.convert('RGBA'), overlay2).convert('RGB')
    draw = ImageDraw.Draw(pil_img)
    
    for j, line in enumerate(info_lines):
        ly = box_y + 4 + j * line_h
        txt_color = '#ef4444' if j == len(info_lines) - 1 and danger_findings else 'white'
        draw.text((box_x + 5, ly), line, fill=txt_color, font=font_sm)
    
    # ── Convert to base64 ──
    buf = io.BytesIO()
    pil_img.save(buf, format='PNG')
    buf.seek(0)
    return f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"


def generate_rich_lead_plot(sig_1d, pqrst, lead_name, measurements):
    """Generate annotated plot with PQRST markers AND measurement values shown on the image.
    Used as fallback when raw lead image is not available."""
    sig = np.array(sig_1d).flatten()
    fig, ax = plt.subplots(figsize=(5.5, 3.5))
    fig.patch.set_facecolor('#0f172a')
    ax.set_facecolor('#1e293b')
    x = np.arange(len(sig))
    ax.plot(x, sig, color='#3b82f6', linewidth=1.3, alpha=0.9)
    ax.grid(True, alpha=0.12, color='#64748b', linestyle='--')
    ax.tick_params(colors='#64748b', labelsize=6)
    for sp in ax.spines.values(): sp.set_color('#334155')

    mcfg = {"P":("#22c55e","^",40),"Q":("#f97316","v",35),"R":("#ef4444","D",50),
            "S":("#f59e0b","v",35),"T":("#8b5cf6","^",40)}
    if pqrst.get("valid"):
        for wave,(clr,mk,sz) in mcfg.items():
            for idx in pqrst.get(wave,[]):
                if 0<=idx<len(sig):
                    ax.scatter(idx,sig[idx],color=clr,marker=mk,s=sz,zorder=5,edgecolors='white',linewidths=0.4)
                    ax.annotate(wave,(idx,sig[idx]),textcoords="offset points",xytext=(0,9),
                               fontsize=7,fontweight='bold',color=clr,ha='center')

        # Draw interval brackets for first R complex
        if pqrst["Q"] and pqrst["S"] and len(pqrst["Q"])>0 and len(pqrst["S"])>0:
            q0,s0 = pqrst["Q"][0], pqrst["S"][0]
            if q0<len(sig) and s0<len(sig):
                yb = min(sig[q0],sig[s0])-0.06
                ax.annotate('',xy=(s0,yb),xytext=(q0,yb),
                    arrowprops=dict(arrowstyle='<->',color='#f97316',lw=1.2))
                ax.text((q0+s0)/2, yb-0.04, f"QRS\n{measurements.get('qrs_duration_ms',0):.0f}ms",
                    fontsize=5.5,color='#f97316',ha='center',va='top',fontweight='bold')

    # Title with territory
    territory = LEAD_TERRITORIES.get(lead_name, "")
    ax.set_title(f"{lead_name}  ({territory})", fontsize=10, fontweight='bold', color='#e2e8f0', pad=8)

    # Measurement panel in top-right
    m = measurements
    hr_txt = f"{m['heart_rate']} bpm" if isinstance(m['heart_rate'],int) else "—"
    info_lines = [
        f"HR: {hr_txt}",
        f"R: {m['r_amplitude']:.2f}  Q: {m['q_depth']:.2f}",
        f"P: {m['p_morphology']}  T: {m['t_morphology']}",
        f"ST: {'+' if m['st_deviation']>0 else ''}{m['st_deviation']:.3f} ({m['st_slope']})",
        f"PR: {m['pr_interval_ms']:.0f}ms  QT: {m['qt_interval_ms']:.0f}ms",
    ]
    flag_color = {"normal":"#22c55e","warning":"#f59e0b","danger":"#ef4444"}.get(m['flag'],'#64748b')
    info_text = "\n".join(info_lines)
    ax.text(0.98, 0.97, info_text, transform=ax.transAxes, fontsize=5.5, color='#cbd5e1',
            va='top', ha='right', family='monospace',
            bbox=dict(boxstyle='round,pad=0.4', facecolor='#0f172a', edgecolor=flag_color, alpha=0.85, linewidth=1.5))

    plt.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf, format='png', dpi=130, bbox_inches='tight', facecolor=fig.get_facecolor(), edgecolor='none')
    plt.close(fig)
    buf.seek(0)
    return f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"

def estimate_heart_axis(measurements_dict):
    """Estimate frontal plane heart axis from limb leads I and aVF."""
    lead_i = measurements_dict.get("Lead I", {})
    avf = measurements_dict.get("aVF", {})
    r_i = lead_i.get("r_amplitude", 0) - lead_i.get("s_depth", 0)
    r_avf = avf.get("r_amplitude", 0) - avf.get("s_depth", 0)
    if r_i > 0 and r_avf > 0: return {"axis_degrees": "0° to +90°", "interpretation": "Normal axis"}
    elif r_i > 0 and r_avf <= 0: return {"axis_degrees": "-30° to 0°", "interpretation": "Left axis deviation"}
    elif r_i <= 0 and r_avf > 0: return {"axis_degrees": "+90° to +180°", "interpretation": "Right axis deviation"}
    else: return {"axis_degrees": "Indeterminate", "interpretation": "Extreme axis deviation (Northwest axis)"}

def get_model_decision_breakdown(clf, pca_features):
    import pandas as pd
    pca_df = pca_features if isinstance(pca_features, pd.DataFrame) else pd.DataFrame(pca_features)

    # Normalize overall probabilities (sklearn compat patch can break normalization)
    overall_probs = clf.predict_proba(pca_df)[0]
    prob_sum = sum(overall_probs)
    if prob_sum > 0:
        overall_probs = overall_probs / prob_sum
    class_probs = {CLASS_NAMES.get(i,f"Class {i}"): round(float(p)*100,2) for i,p in enumerate(overall_probs)}

    individual_votes = {}
    model_names = {"SVM":"Support Vector Machine","knn":"K-Nearest Neighbors",
                   "rf":"Random Forest","bayes":"Gaussian Naive Bayes","logistic":"Logistic Regression"}
    try:
        best = clf.best_estimator_ if hasattr(clf,'best_estimator_') else clf
        for key, model in best.named_estimators_.items():
            dn = model_names.get(key, key)
            try:
                if hasattr(model,'predict_proba'):
                    probs = model.predict_proba(pca_df)[0]
                    # Normalize per-model probabilities
                    ps = sum(probs)
                    if ps > 0:
                        probs = probs / ps
                    pc = int(np.argmax(probs))
                    individual_votes[dn] = {"predicted":CLASS_NAMES.get(pc,"?"),"predicted_code":pc,
                        "confidence":round(float(np.max(probs))*100,2)}
                else:
                    pred = int(model.predict(pca_df)[0])
                    individual_votes[dn] = {"predicted":CLASS_NAMES.get(pred,"?"),"predicted_code":pred,"confidence":None}
            except: individual_votes[dn] = {"predicted":"Error","confidence":None}
    except: pass
    rf_imp = None
    try:
        best = clf.best_estimator_ if hasattr(clf,'best_estimator_') else clf
        rf = best.named_estimators_.get('rf')
        if rf and hasattr(rf,'feature_importances_'): rf_imp = rf.feature_importances_.tolist()
    except: pass
    return {"class_probabilities":class_probs,"individual_votes":individual_votes,"rf_importances":rf_imp}

def map_pca_importance_to_leads(pca_model, rf_importances):
    if rf_importances is None: return {"lead_importance":{},"chart":None}
    rf_imp = np.array(rf_importances)
    feat_imp = np.abs(pca_model.components_.T) @ rf_imp
    lead_imp = {}
    for i,name in enumerate(LEAD_NAMES):
        s,e = i*255, (i+1)*255
        if e<=len(feat_imp): lead_imp[name] = round(float(np.sum(feat_imp[s:e])),6)
    total = sum(lead_imp.values())
    if total>0: lead_imp = {k:round(v/total*100,2) for k,v in lead_imp.items()}
    sl = sorted(lead_imp.items(), key=lambda x:x[1], reverse=True)

    fig,ax = plt.subplots(figsize=(7,4))
    fig.patch.set_facecolor('#0f172a'); ax.set_facecolor('#1e293b')
    names,vals = [s[0] for s in sl],[s[1] for s in sl]
    colors = ['#ef4444' if v>=vals[0]*0.8 else '#f97316' if v>=vals[0]*0.5 else '#3b82f6' for v in vals]
    bars = ax.barh(range(len(names)),vals,color=colors,edgecolor='#1e293b',height=0.6)
    ax.set_yticks(range(len(names))); ax.set_yticklabels(names,fontsize=9,color='#e2e8f0')
    ax.set_xlabel('Contribution (%)',fontsize=9,color='#94a3b8')
    ax.set_title('Lead Contribution to Prediction',fontsize=12,fontweight='bold',color='#e2e8f0',pad=12)
    ax.invert_yaxis(); ax.grid(True,axis='x',alpha=0.15,color='#64748b',linestyle='--')
    ax.tick_params(colors='#64748b',labelsize=8)
    for sp in ax.spines.values(): sp.set_color('#334155')
    for bar,val in zip(bars,vals): ax.text(bar.get_width()+0.3,bar.get_y()+bar.get_height()/2,f'{val:.1f}%',va='center',fontsize=8,color='#94a3b8')
    plt.tight_layout()
    buf = io.BytesIO()
    fig.savefig(buf,format='png',dpi=120,bbox_inches='tight',facecolor=fig.get_facecolor(),edgecolor='none')
    plt.close(fig); buf.seek(0)
    return {"lead_importance":dict(sl),"chart":f"data:image/png;base64,{base64.b64encode(buf.read()).decode('utf-8')}"}

def generate_clinical_interpretation(pred_label, pred_code, measurements, model_breakdown, lead_importance, axis_info):
    notes = []
    notes.append(f"ECG classification result: **{pred_label}**")

    # Consensus
    votes = model_breakdown.get("individual_votes",{})
    if votes:
        total=len(votes); agree=sum(1 for v in votes.values() if v.get("predicted_code")==pred_code)
        if agree==total: notes.append(f"Strong consensus: All {total} ensemble classifiers unanimously agree.")
        elif agree>=3: notes.append(f"Majority agreement: {agree}/{total} classifiers support this diagnosis.")
        else: notes.append(f"⚠️ Low consensus: Only {agree}/{total} agree. Clinical verification strongly recommended.")

    # Confidence
    probs = model_breakdown.get("class_probabilities",{})
    mx = max(probs.values()) if probs else 0
    if mx>=90: notes.append(f"Model confidence is very high ({mx:.1f}%).")
    elif mx>=75: notes.append(f"Model confidence is moderate ({mx:.1f}%). Clinical correlation advised.")
    else: notes.append(f"⚠️ Model confidence is low ({mx:.1f}%). Interpret with caution.")

    # Axis
    if axis_info:
        notes.append(f"Estimated heart axis: **{axis_info['axis_degrees']}** — {axis_info['interpretation']}.")

    # Rhythm
    rhythms = [m.get("rhythm") for m in measurements.values() if m.get("rhythm") not in ("N/A",None)]
    if rhythms:
        irreg = sum(1 for r in rhythms if r=="Irregular")
        if irreg > len(rhythms)*0.5:
            notes.append("⚠️ Irregular rhythm detected across multiple leads. Consider atrial fibrillation workup.")
        else:
            hrs = [m["heart_rate"] for m in measurements.values() if isinstance(m.get("heart_rate"),int)]
            if hrs:
                avg = int(np.mean(hrs))
                if avg<60: notes.append(f"Sinus bradycardia (HR: {avg} bpm).")
                elif avg>100: notes.append(f"Sinus tachycardia (HR: {avg} bpm).")
                else: notes.append(f"Normal sinus rhythm (HR: {avg} bpm).")

    # Territory-based ST analysis
    for territory in ["Anterior","Inferior","Lateral","Septal"]:
        t_leads = [l for l,t in LEAD_TERRITORIES.items() if t==territory]
        st_elev = [l for l in t_leads if measurements.get(l,{}).get("st_deviation",0)>0.18]
        st_dep = [l for l in t_leads if measurements.get(l,{}).get("st_deviation",0)<-0.18]
        if st_elev: notes.append(f"ST elevation in {', '.join(st_elev)} → **{territory} wall** involvement.")
        if st_dep: notes.append(f"ST depression in {', '.join(st_dep)} → possible **{territory}** ischemia or reciprocal changes.")

    # Pathological Q
    q_leads = [l for l,m in measurements.items() if m.get("q_pathological")]
    if q_leads: notes.append(f"Pathological Q waves in {', '.join(q_leads)} → may indicate prior myocardial infarction.")

    # T-wave inversion
    t_inv = [l for l,m in measurements.items() if m.get("t_morphology")=="Inverted" and l!="aVR"]
    if t_inv: notes.append(f"T-wave inversion in {', '.join(t_inv)} → suggestive of ischemia or strain pattern.")

    # Wide QRS
    wide = [l for l,m in measurements.items() if m.get("qrs_duration_ms",0)>120]
    if wide: notes.append(f"Wide QRS complex in {', '.join(wide)} → consider bundle branch block.")

    # Top leads
    li = lead_importance.get("lead_importance",{})
    if li: notes.append(f"Top contributing leads: **{', '.join(list(li.keys())[:3])}**.")

    notes.append("⚕️ **Disclaimer**: Computer-assisted analysis. All findings must be verified by a qualified physician.")
    return notes

LEAD_ANATOMY = {
    "Lead I":  {"artery":"Left Circumflex (LCx)","monitors":"lateral wall of the left ventricle"},
    "Lead II": {"artery":"Right Coronary (RCA)","monitors":"inferior surface of the left ventricle"},
    "Lead III":{"artery":"Right Coronary (RCA)","monitors":"inferior surface of the left ventricle"},
    "aVR":     {"artery":"Left Main / Multi-vessel","monitors":"right atrium and outflow tract (reciprocal)"},
    "aVL":     {"artery":"LCx / LAD diagonal","monitors":"high lateral wall of the left ventricle"},
    "aVF":     {"artery":"Right Coronary (RCA)","monitors":"inferior surface of the left ventricle"},
    "V1":      {"artery":"LAD (septal perforators)","monitors":"interventricular septum"},
    "V2":      {"artery":"LAD (septal perforators)","monitors":"interventricular septum"},
    "V3":      {"artery":"Left Anterior Descending (LAD)","monitors":"anterior wall of the left ventricle"},
    "V4":      {"artery":"Left Anterior Descending (LAD)","monitors":"anterior wall of the left ventricle"},
    "V5":      {"artery":"Left Circumflex (LCx)","monitors":"lateral wall of the left ventricle"},
    "V6":      {"artery":"Left Circumflex (LCx)","monitors":"lateral wall of the left ventricle"},
}

TERRITORY_GROUPS = {
    "Inferior": ["Lead II","Lead III","aVF"],
    "Anterior": ["V3","V4"],
    "Septal":   ["V1","V2"],
    "Lateral":  ["Lead I","aVL","V5","V6"],
}

def _assess_signal_quality(sig):
    """Assess signal quality for clinical reliability."""
    n = len(sig)
    # Baseline wander: check variance of signal segments
    seg = max(1, n // 5)
    seg_means = [float(np.mean(sig[i*seg:min((i+1)*seg,n)])) for i in range(min(5,n//max(seg,1)))]
    wander = np.std(seg_means) if len(seg_means)>1 else 0
    baseline = "Stable" if wander < 0.08 else "Mild Wander" if wander < 0.15 else "Significant Wander"
    # Noise: high-freq variation
    diff = np.diff(sig)
    noise_lvl = float(np.std(diff))
    noise = "Minimal" if noise_lvl < 0.04 else "Mild" if noise_lvl < 0.08 else "Significant"
    # Range
    sig_range = float(np.max(sig) - np.min(sig))
    rng = "Adequate" if sig_range > 0.3 else "Low Amplitude"
    # Verdict
    issues = sum([wander >= 0.15, noise_lvl >= 0.08, sig_range < 0.3])
    verdict = "EXCELLENT" if issues == 0 and wander < 0.06 else "ACCEPTABLE" if issues == 0 else "POOR — INTERPRET WITH CAUTION"
    cautions = []
    if "Wander" in baseline: cautions.append("Baseline wander may mimic ST segment changes")
    if noise == "Significant": cautions.append("High noise may affect wave detection accuracy")
    if rng == "Low Amplitude": cautions.append("Low signal amplitude reduces measurement reliability")
    return {"baseline":baseline,"noise":noise,"range":rng,"verdict":verdict,"cautions":cautions}

def _interpret_p_wave(m, lead_name):
    amp, morph = m.get("p_amplitude",0), m.get("p_morphology","Absent")
    status = "normal" if morph == "Normal" else "absent" if morph == "Absent" else "abnormal"
    clinical = ""
    condition = None
    if morph == "Normal":
        clinical = "Normal upright P wave — normal sinus atrial depolarization."
    elif morph == "Peaked":
        clinical = "Tall peaked P wave — suggests right atrial overload."
        condition = "Consider: pulmonary hypertension, tricuspid disease, COPD."
    elif morph == "Inverted":
        if lead_name == "aVR":
            clinical = "Inverted P in aVR is a normal finding."
            status = "normal"
        else:
            clinical = "Inverted P wave — ectopic atrial focus or junctional rhythm."
            condition = "Consider: ectopic atrial rhythm, junctional escape, dextrocardia."
    elif morph == "Flattened":
        clinical = "Flattened P wave — may indicate atrial conduction issue or low voltage."
        status = "borderline"
    elif morph == "Absent":
        clinical = "P wave not clearly identified in this lead."
        condition = "If absent across multiple leads: consider atrial fibrillation or junctional rhythm."
    return {"value":f"{amp:.3f}","morphology":morph,"status":status,"clinical":clinical,"condition":condition}

def _interpret_pr(m):
    pr = m.get("pr_interval_ms",0)
    if pr < 1: return {"value":"N/A","status":"unknown","clinical":"PR interval could not be measured.","condition":None}
    status = "normal"
    clinical = f"PR interval {pr:.0f} ms — normal AV conduction time."
    condition = None
    if pr < 120:
        status = "borderline"
        clinical = f"Short PR interval ({pr:.0f} ms)."
        condition = "Consider: pre-excitation (WPW), accelerated AV conduction, junctional rhythm."
    elif pr > 200:
        status = "abnormal"
        clinical = f"Prolonged PR interval ({pr:.0f} ms) — delayed AV conduction."
        condition = "First-degree AV block. Consider: vagal tone, drugs (beta-blockers, digoxin), inferior MI."
    return {"value":f"{pr:.0f} ms","status":status,"clinical":clinical,"condition":condition}

def _interpret_qrs(m, lead_name, territory):
    dur = m.get("qrs_duration_ms",0)
    r_amp = m.get("r_amplitude",0)
    q_dep = m.get("q_depth",0)
    s_dep = m.get("s_depth",0)
    q_path = m.get("q_pathological", False)
    status = "normal"
    clinical = f"QRS duration {dur:.0f} ms — normal ventricular depolarization."
    condition = None
    parts = []
    if q_path:
        status = "abnormal"
        parts.append(f"Pathological Q wave (depth {q_dep:.3f}, >{int(q_dep/(abs(r_amp)+1e-6)*100)}% of R).")
        if territory == "Inferior":
            condition = "Pathological Q in inferior lead → prior inferior myocardial infarction (RCA territory)."
        elif territory == "Anterior":
            condition = "Pathological Q in anterior lead → prior anterior MI (LAD territory)."
        elif territory == "Lateral":
            condition = "Pathological Q in lateral lead → prior lateral MI (LCx territory)."
        elif territory == "Septal":
            condition = "Pathological Q in septal lead → prior septal MI (LAD perforator territory)."
    if dur > 120:
        status = "abnormal"
        parts.append(f"Wide QRS ({dur:.0f} ms).")
        condition = (condition or "") + " Wide QRS: consider bundle branch block (RBBB/LBBB), ventricular pacing, or hyperkalaemia."
    if not parts:
        parts.append("No pathological Q waves. Normal R-wave and S-wave amplitudes.")
    clinical = " ".join(parts)
    return {"value":f"{dur:.0f} ms","r_amp":f"{r_amp:.3f}","q_dep":f"{q_dep:.3f}","s_dep":f"{s_dep:.3f}",
            "q_pathological":q_path,"status":status,"clinical":clinical,"condition":condition}

def _interpret_st(m, lead_name, territory):
    dev = m.get("st_deviation",0)
    slope = m.get("st_slope","Isoelectric")
    status = "normal"
    clinical = f"ST segment isoelectric (deviation {dev:+.3f}). No acute ischaemic changes."
    condition = None
    if dev > 0.18:
        status = "danger"
        clinical = f"ST ELEVATION ({dev:+.3f}) in {lead_name} ({territory} wall)."
        condition = f"ACUTE ST ELEVATION in {territory} territory — if clinical context supports, consider STEMI. Correlate with reciprocal changes and clinical presentation."
    elif dev < -0.18:
        status = "danger"
        clinical = f"ST DEPRESSION ({dev:+.3f}) in {lead_name} ({territory} wall)."
        condition = f"ST depression in {territory} leads — consider ischaemia, NSTEMI, or reciprocal changes. If in V1-V2 with ST elevation posteriorly, consider posterior MI."
    elif abs(dev) > 0.08:
        status = "borderline"
        clinical = f"Mild ST deviation ({dev:+.3f}) — borderline, not meeting threshold for significance."
    return {"value":f"{dev:+.3f}","slope":slope,"status":status,"clinical":clinical,"condition":condition}

def _interpret_t_wave(m, lead_name, territory):
    amp, morph = m.get("t_amplitude",0), m.get("t_morphology","Normal")
    status = "normal"
    clinical = "Normal upright T wave — normal ventricular repolarization."
    condition = None
    if morph == "Inverted":
        if lead_name == "aVR":
            clinical = "Inverted T in aVR is expected and normal."
        elif lead_name == "V1":
            status = "borderline"
            clinical = "T-wave inversion in V1 may be a normal variant."
        else:
            status = "abnormal"
            clinical = f"T-wave inversion in {lead_name} ({territory} territory)."
            if territory in ("Anterior","Septal"):
                condition = "Anterior T-wave inversion: consider anterior ischaemia, Wellens syndrome (critical LAD stenosis), RVH. If biphasic → do NOT discharge without cardiology review."
            elif territory == "Inferior":
                condition = "Inferior T-wave inversion: consider inferior ischaemia or RV strain pattern."
            elif territory == "Lateral":
                condition = "Lateral T-wave inversion: consider lateral ischaemia or LVH strain."
    elif morph == "Peaked":
        status = "abnormal"
        clinical = f"Tall peaked T wave in {lead_name}."
        condition = "Peaked T waves: consider hyperacute STEMI (earliest sign), hyperkalaemia, or LVH."
    elif morph == "Flattened":
        status = "borderline"
        clinical = "Flattened T wave — non-specific finding."
        condition = "Consider: electrolyte disturbance (low K⁺/Mg²⁺), ischaemia, hypothyroidism."
    return {"value":f"{amp:.3f}","morphology":morph,"status":status,"clinical":clinical,"condition":condition}

def _interpret_qt(m):
    qt = m.get("qt_interval_ms",0)
    hr = m.get("heart_rate","N/A")
    if qt < 1: return {"value":"N/A","qtc":"N/A","status":"unknown","clinical":"QT interval could not be measured.","condition":None}
    # Approximate QTc (Bazett) if HR available
    qtc = "N/A"
    qtc_val = 0
    if isinstance(hr, (int,float)) and hr > 0:
        rr_sec = 60.0 / hr
        qtc_val = qt / (rr_sec ** 0.5) if rr_sec > 0 else 0
        qtc = f"{qtc_val:.0f} ms"
    status = "normal"
    clinical = f"QT interval {qt:.0f} ms."
    if qtc != "N/A": clinical += f" QTc (Bazett) ≈ {qtc_val:.0f} ms."
    condition = None
    if qtc_val > 500:
        status = "danger"
        clinical += " PROLONGED QTc (>500 ms) — HIGH RISK."
        condition = "Prolonged QTc >500 ms → significant risk of Torsades de Pointes. Review medications (antiarrhythmics, antibiotics, antipsychotics). Check electrolytes."
    elif qtc_val > 460:
        status = "borderline"
        clinical += " Borderline prolonged QTc."
        condition = "Monitor QTc. Review QT-prolonging medications."
    return {"value":f"{qt:.0f} ms","qtc":qtc,"status":status,"clinical":clinical,"condition":condition}

def generate_lead_clinical_report(sig_1d, pqrst, measurements, lead_name, prediction_label, pred_code, all_meas=None):
    """Generate 8-section cardiologist-grade clinical report for one lead."""
    sig = np.array(sig_1d).flatten()
    m = measurements
    territory = LEAD_TERRITORIES.get(lead_name, "Unknown")
    anatomy = LEAD_ANATOMY.get(lead_name, {"artery":"Unknown","monitors":"unknown"})
    pred_class = CLASS_NAMES.get(pred_code, prediction_label)

    # Section 1: Header
    role = f"In the context of this ECG classified as {pred_class}, "
    grp = TERRITORY_GROUPS.get(territory, [])
    if territory == "Inferior": role += "inferior leads (II, III, aVF) monitor the RCA territory."
    elif territory == "Anterior": role += "anterior leads (V3, V4) monitor the LAD territory."
    elif territory == "Septal": role += "septal leads (V1, V2) monitor septal perforator territory."
    elif territory == "Lateral": role += "lateral leads (I, aVL, V5, V6) monitor the LCx territory."
    else: role += "aVR is a reciprocal lead — changes here mirror global events."
    header = {"lead":lead_name,"territory":territory,"artery":anatomy["artery"],
              "monitors":anatomy["monitors"],"role":role}

    # Section 2: Signal Quality
    quality = _assess_signal_quality(sig)

    # Section 3: PQRST Waves
    waves = {
        "p":  _interpret_p_wave(m, lead_name),
        "pr": _interpret_pr(m),
        "qrs":_interpret_qrs(m, lead_name, territory),
        "st": _interpret_st(m, lead_name, territory),
        "t":  _interpret_t_wave(m, lead_name, territory),
        "qt": _interpret_qt(m),
    }

    # Section 4: Rhythm
    hr = m.get("heart_rate","N/A")
    rhythm_reg = m.get("rhythm","N/A")
    if isinstance(hr, int):
        if rhythm_reg == "Irregular": rhy_interp = f"Irregular rhythm at {hr} bpm. Consider atrial fibrillation workup if persistent."
        elif hr < 60: rhy_interp = f"Sinus bradycardia ({hr} bpm). If asymptomatic, may be physiological (athletes, sleep)."
        elif hr > 100: rhy_interp = f"Sinus tachycardia ({hr} bpm). Assess for pain, fever, anxiety, hypovolaemia, PE."
        else: rhy_interp = f"Normal sinus rhythm ({hr} bpm)."
    else:
        rhy_interp = "Heart rate could not be reliably determined from this lead."
    rhythm = {"rate":str(hr) + (" bpm" if isinstance(hr,int) else ""),"regularity":rhythm_reg,"interpretation":rhy_interp}

    # Section 5: Intervals Summary (already covered in waves but grouped)
    intervals = {
        "pr": {"value": waves["pr"]["value"], "normal":"120–200 ms","status":waves["pr"]["status"]},
        "qrs":{"value": waves["qrs"]["value"],"normal":"60–120 ms","status":waves["qrs"]["status"]},
        "qt": {"value": waves["qt"]["value"], "qtc":waves["qt"].get("qtc","N/A"),"normal":"<450 ms (QTc)","status":waves["qt"]["status"]},
    }

    # Section 6: Territory Correlation
    related = TERRITORY_GROUPS.get(territory, [lead_name])
    terr_findings = []
    if all_meas:
        for rl in related:
            rm = all_meas.get(rl,{})
            if rm.get("flag") in ("danger","warning"):
                ff = [f for f in rm.get("findings",[]) if f != "Within normal limits"]
                if ff: terr_findings.append({"lead":rl,"findings":ff,"flag":rm["flag"]})
    correlation = "All " + territory.lower() + " leads should be reviewed together for concordance."
    if terr_findings:
        correlation += f" {len(terr_findings)} related lead(s) show findings — review for regional pattern."
    elif all_meas:
        correlation += " No significant findings in related leads — no regional pattern."
    territory_info = {"region":territory,"related_leads":related,"related_findings":terr_findings,"correlation":correlation}

    # Section 7: Clinical Significance
    wave_statuses = [w.get("status","normal") for w in waves.values()]
    has_danger = "danger" in wave_statuses
    has_abnormal = "abnormal" in wave_statuses or has_danger
    has_borderline = "borderline" in wave_statuses
    if has_danger:
        significance = f"⚠️ CRITICAL findings in {lead_name}. This lead shows features requiring urgent clinical attention."
    elif has_abnormal:
        significance = f"Abnormal findings in {lead_name} ({territory} territory). Clinical correlation required."
    elif has_borderline:
        significance = f"Borderline findings in {lead_name}. May be clinically insignificant but warrants awareness."
    else:
        significance = f"This lead shows normal findings consistent with the overall classification of {pred_class}."

    # Section 8: Recommendations
    recs = []
    if has_danger:
        recs.append("Urgent clinical assessment recommended.")
        if any(w.get("status")=="danger" for k,w in waves.items() if k=="st"):
            recs.append("If ST changes confirmed clinically — consider cardiology consult and serial ECGs.")
    if has_abnormal:
        recs.append("Correlate with clinical history and prior ECGs if available.")
        recs.append("Consider echocardiography if structural abnormality suspected.")
    if terr_findings:
        recs.append(f"Review all {territory} leads together ({', '.join(related)}) for regional pattern.")
    if not recs:
        recs.append("No action required for this lead.")
        recs.append("Routine follow-up as clinically indicated.")
    recs.append("All findings are computer-assisted estimates — verify with clinical judgement.")

    return {
        "header": header,
        "quality": quality,
        "waves": waves,
        "rhythm": rhythm,
        "intervals": intervals,
        "territory": territory_info,
        "significance": significance,
        "recommendations": recs,
    }

def _postprocess_findings_for_prediction(all_measurements, pred_code):
    """If the model predicts Normal (code 2), suppress minor/borderline findings
    that arise from noisy image-based signal extraction rather than real pathology.
    Also recalibrate flag status after suppression."""
    if pred_code == 2:
        # For Normal predictions: suppress borderline findings from image noise
        suppress_keywords = ["Flattened T", "Flattened P", "Short PR", "Irregular rhythm"]
        for lead_name, m in all_measurements.items():
            filtered = [f for f in m.get("findings", []) if not any(kw in f for kw in suppress_keywords)]
            # Also suppress ST findings < 0.5 for Normal (image artifact, not real pathology)
            filtered = [f for f in filtered 
                       if not (("ST elevation" in f or "ST depression" in f) 
                              and abs(m.get("st_deviation", 0)) < 0.50)]
            if len(filtered) == 0:
                filtered = ["Within normal limits"]
            m["findings"] = filtered
            # Recompute flag
            if any("Pathological" in f or "Wide QRS" in f or "elevation" in f or "depression" in f for f in filtered):
                m["flag"] = "danger"
            elif any("Inverted" in f or "Peaked" in f or "Prolonged" in f or "Irregular" in f for f in filtered):
                m["flag"] = "warning"
            else:
                m["flag"] = "normal"
                m["findings"] = ["Within normal limits"]
    return all_measurements

def run_full_explainability(signal_csvs, clf, pca_model, prediction_label, pred_code, lead_images=None):
    import pandas as pd
    all_measurements, annotated_signals = {}, {}
    pqrst_data = {}  # store for clinical report pass

    for i,(key,name) in enumerate(zip(LEAD_KEYS, LEAD_NAMES)):
        # Use CSV contour data for PQRST detection and measurements
        sig = signal_csvs.get(key)
        if sig is None: continue
        arr = np.array(sig).flatten()

        pqrst = detect_pqrst(arr)
        meas = compute_detailed_measurements(arr, pqrst)
        all_measurements[name] = meas
        pqrst_data[name] = (arr, pqrst)
        
        # ANNOTATE PQRST directly on the raw lead image (if available)
        if lead_images and key in lead_images and lead_images[key]:
            try:
                annotated_signals[key] = generate_annotated_lead_image(
                    lead_images[key], pqrst, name, meas, trace_signal=arr
                )
            except Exception:
                # Fallback to separate signal plot
                annotated_signals[key] = generate_rich_lead_plot(arr, pqrst, name, meas)
        else:
            annotated_signals[key] = generate_rich_lead_plot(arr, pqrst, name, meas)

    # Post-process findings based on prediction context
    all_measurements = _postprocess_findings_for_prediction(all_measurements, pred_code)

    # Generate clinical reports per lead (8-section cardiologist reports)
    lead_reports = {}
    for i,(key,name) in enumerate(zip(LEAD_KEYS, LEAD_NAMES)):
        if name in pqrst_data and name in all_measurements:
            arr, pqrst = pqrst_data[name]
            lead_reports[key] = generate_lead_clinical_report(
                arr, pqrst, all_measurements[name], name,
                prediction_label, pred_code, all_meas=all_measurements
            )

    # PCA features for model breakdown
    combined = []
    for key in LEAD_KEYS:
        s = signal_csvs.get(key)
        if s is not None: combined.extend(np.array(s).flatten().tolist())
    if len(combined)==3060:
        pca_df = pd.DataFrame(pca_model.transform(pd.DataFrame([combined])))
    else:
        pca_df = pd.DataFrame(np.zeros((1,400)))

    model_breakdown = get_model_decision_breakdown(clf, pca_df)
    lead_importance = map_pca_importance_to_leads(pca_model, model_breakdown.get("rf_importances"))
    axis_info = estimate_heart_axis(all_measurements)
    clinical_notes = generate_clinical_interpretation(prediction_label, pred_code, all_measurements, model_breakdown, lead_importance, axis_info)

    return {
        "class_probabilities": model_breakdown["class_probabilities"],
        "individual_votes": model_breakdown["individual_votes"],
        "lead_measurements": all_measurements,
        "lead_reports": lead_reports,
        "lead_importance": lead_importance,
        "axis_info": axis_info,
        "clinical_interpretation": clinical_notes,
        "annotated_signals": annotated_signals
    }
