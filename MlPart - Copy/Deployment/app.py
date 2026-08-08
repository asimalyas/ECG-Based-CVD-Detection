import os

from flask import Flask, request, jsonify
from Ecg import ECG  # your new class file

app = Flask(__name__)
ecg = ECG(base_dir=os.getcwd())

@app.route("/predict", methods=["POST"])
def predict():
    try:
        file = request.files['ecg_image']
        img = ecg.get_image(file)
        gray = ecg.to_gray(img)
        if ecg.check_similarity(gray) < 0.5:
            return jsonify({"error": "Uploaded ECG format not recognized"}), 400
        
        leads = ecg.divide_leads(img)
        ecg.extract_signal_scaled(leads)
        df = ecg.combine_1d_signals()
        df_pca = ecg.reduce_dimensionality(df)
        result = ecg.predict(df_pca)
        return jsonify({"prediction": result})
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)