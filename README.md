<p align="center">
  <img src="https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=white" alt="React" />
  <img src="https://img.shields.io/badge/FastAPI-0.100+-009688?style=for-the-badge&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/Scikit--Learn-Ensemble-F7931E?style=for-the-badge&logo=scikit-learn&logoColor=white" alt="Scikit-Learn" />
  <img src="https://img.shields.io/badge/Supabase-Auth%20%2B%20Storage-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white" alt="Supabase" />
  <img src="https://img.shields.io/badge/TypeScript-5.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Python-3.10-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python" />
</p>

<h1 align="center">🫀 Hybrid Multimodal Fusion Framework for<br/>Cardiovascular Disease Detection Using ECG</h1>

<p align="center">
  <strong>A full-stack clinical decision support system that classifies cardiovascular diseases from 12-lead ECG images using an ensemble machine learning pipeline, real-time Server-Sent Event streaming, cardiologist-grade explainability, and role-based clinical workflows.</strong>
</p>

<p align="center">
  <a href="#-demo">Demo</a> •
  <a href="#-key-features">Features</a> •
  <a href="#-system-architecture">Architecture</a> •
  <a href="#-ml-pipeline">ML Pipeline</a> •
  <a href="#-explainability-engine">Explainability</a> •
  <a href="#-user-roles--workflows">Roles & Workflows</a> •
  <a href="#-technology-stack">Tech Stack</a> •
  <a href="#-installation--setup">Setup</a> •
  <a href="#-api-reference">API</a> •
  <a href="#-project-structure">Structure</a>
</p>

---

## 📋 Table of Contents

- [Problem Statement](#-problem-statement)
- [Demo](#-demo)
- [Key Features](#-key-features)
- [System Architecture](#-system-architecture)
- [AI/ML Pipeline](#-aiml-pipeline)
- [Explainability Engine](#-explainability-engine)
- [User Roles & Workflows](#-user-roles--workflows)
- [Authentication & Authorization](#-authentication--authorization)
- [End-to-End Workflow](#-end-to-end-ecg-workflow)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Model Files](#-model-files)
- [Dataset](#-dataset)
- [Installation & Setup](#-installation--setup)
- [Running the Application](#-running-the-application)
- [API Reference](#-api-reference)
- [Screenshots](#-screenshots)
- [Limitations & Future Work](#-limitations--future-work)
- [Academic Context](#-academic-context)
- [Credits & License](#-credits--license)

---

## 🩺 Problem Statement

Cardiovascular diseases (CVDs) are the **leading cause of death globally**, claiming approximately **17.9 million lives annually** (WHO). Electrocardiograms (ECGs) remain the primary diagnostic tool, yet their interpretation requires trained cardiologists — a scarce resource in developing countries and rural areas.

This project presents a **Hybrid Multimodal Fusion Framework** that:

1. Accepts a standard **12-lead ECG image** (not raw signal data)
2. **Validates** the image structure using Structural Similarity Index (SSIM)
3. **Segments** the image into 13 individual leads via pixel-coordinate cropping
4. **Extracts** 1D voltage signals through contour detection and MinMax scaling
5. **Reduces** dimensionality from 3,060 → 400 features using PCA
6. **Classifies** the ECG into 4 diagnostic categories using an ensemble of 5 classifiers
7. **Explains** the decision via PQRST wave detection, interval measurements, and model vote breakdowns
8. Delivers results through a **role-based clinical web application** with doctor review workflows

---

## 🎬 Demo

### 🔬 AI Pipeline Visualization
Watch the real-time ECG processing pipeline in action — from image upload through lead segmentation, preprocessing, contour extraction, and ensemble classification:

[![ECG Pipeline Demo](https://img.youtube.com/vi/w2KlGjiJKcw/hqdefault.jpg)](https://www.youtube.com/watch?v=w2KlGjiJKcw&feature=youtu.be)

> 🔗 **Pipeline Video:** [https://www.youtube.com/watch?v=w2KlGjiJKcw](https://www.youtube.com/watch?v=w2KlGjiJKcw&feature=youtu.be)

### 🖥️ Full End-to-End Project Demonstration
Complete walkthrough of the clinical platform — authentication, role-based dashboards, ECG upload, AI analysis, explainability reports, and doctor review:

[![Full Project Demo](https://img.youtube.com/vi/UqMDbNdvumw/hqdefault.jpg)](https://www.youtube.com/watch?v=UqMDbNdvumw)

> 🔗 **Full Demo Video:** [https://www.youtube.com/watch?v=UqMDbNdvumw](https://www.youtube.com/watch?v=UqMDbNdvumw)

### 📑 FYP Report Document

> 📄 **Full Project Report (PDF):** [View on OneDrive](https://1drv.ms/b/c/cacb8574e4143f96/IQCqwrsV6Q-cTYa7G69ti-TaAXXVVbeFk05RqabcuNc8ETk?e=TJXQ4W)

---

## ✨ Key Features

### AI/ML Capabilities
- **SSIM-Based ECG Validation** — Rejects non-ECG images by comparing against 4 reference ECGs (threshold ≥ 0.70)
- **Automated 13-Lead Segmentation** — Pixel-coordinate cropping of standard 12-lead + Long Lead II
- **Image-to-Signal Conversion** — Otsu thresholding → contour extraction → 1D voltage signal conversion
- **PCA Dimensionality Reduction** — 3,060 features compressed to 400 principal components
- **Ensemble Classification (93% Accuracy)** — VotingClassifier combining SVM, KNN, Random Forest, Naive Bayes, and Logistic Regression
- **4-Class Diagnosis** — Normal, Abnormal Heartbeat, Myocardial Infarction, History of MI
- **Real-Time SSE Streaming** — 10-step pipeline progress streamed live to the browser via Server-Sent Events

### Explainability (1,300+ lines)
- **PQRST Wave Detection** — Automated delineation using NeuroKit2 with scipy fallback
- **Clinical Measurements** — PR interval, QRS duration, QT interval, ST deviation, heart rate (BPM)
- **Annotated Signal Plots** — Rich visual overlays with PQRST markers, RR intervals, beat numbering
- **Per-Lead Clinical Reports** — 8-section structured reports per lead (signal quality, rhythm, territory correlation)
- **Ensemble Vote Breakdown** — Individual classifier predictions and confidence scores exposed
- **PCA-to-Lead Importance Mapping** — Feature importance traced back through eigenvectors to identify contributing leads
- **Heart Axis Estimation** — Frontal plane QRS axis calculation from Leads I and aVF

### Clinical Platform
- **Role-Based Access Control** — Patient, Doctor, Technician, Admin with distinct dashboards and permissions
- **Admin Approval Workflow** — Doctors and Technicians require administrator approval before accessing the system
- **Multi-Step Upload Wizard** — Patient/Doctor assignment → ECG validation → Review & submit
- **Doctor Report Review** — Full clinical report with Sign-off/Approve and Reject actions with physician notes
- **Searchable Report Directory** — Filter by patient name, date, status, technician
- **Audit Logging** — Immutable event trail for all user actions (signup, login, approval, review)
- **Dark Mode Support** — System-wide theme toggle
- **Print-Ready Reports** — Formatted clinical reports for physical records

---

## 🏗️ System Architecture

```
┌──────────────────────────────────────────────────────────────────────────┐
│                          CLIENT BROWSER                                  │
│  ┌──────────────────────────────────────────────────────────────┐        │
│  │  React 18 + Vite + TypeScript (localhost:3000)               │        │
│  │  ┌────────────┐  ┌────────────┐  ┌───────────────────┐      │        │
│  │  │ App Router  │  │ Dashboards │  │ Clinical Pages    │      │        │
│  │  │ (State     │──│ (Doctor,   │──│ (Upload, Analysis,│      │        │
│  │  │  Machine)  │  │  Patient,  │  │  Reports, Review) │      │        │
│  │  └────────────┘  │  Tech,     │  └───────────────────┘      │        │
│  │                  │  Admin)    │                              │        │
│  │                  └────────────┘                              │        │
│  │  ┌──────────────────────────────────────────────────┐       │        │
│  │  │  API Layer (src/lib/api.tsx)                      │       │        │
│  │  │  authApi · ecgApi · userApi · statsApi · auditApi │       │        │
│  │  └──────────────────┬───────────────────────────────┘       │        │
│  │                     │                                        │        │
│  │  ┌─────────────┐   │   ┌────────────────────┐              │        │
│  │  │ MemoryStore │◄──┘   │ Supabase Client    │              │        │
│  │  │ (Dev DB)    │       │ (Auth + Storage)   │              │        │
│  │  └──────┬──────┘       └────────┬───────────┘              │        │
│  │         │ persist()             │                           │        │
│  │         ▼                       ▼                           │        │
│  │  localStorage          Supabase Cloud                       │        │
│  └──────────────────────────────────────────────────────────────┘        │
│                                                                          │
│  ┌───────────────────── HTTP / SSE ─────────────────────┐               │
│  │  POST /validate-ecg  →  JSON response                │               │
│  │  POST /predict       →  text/event-stream (SSE)      │               │
│  └──────────────────────────┬───────────────────────────┘               │
└──────────────────────────────┼──────────────────────────────────────────┘
                               │
┌──────────────────────────────┼──────────────────────────────────────────┐
│                    FastAPI ML Server (localhost:8000)                     │
│  ┌───────────────────────────┼──────────────────────────────────┐       │
│  │  ProcessPoolExecutor (max_workers=4)                          │       │
│  │  ┌────────────────────────▼───────────────────────────────┐  │       │
│  │  │  Isolated Process (per request)                         │  │       │
│  │  │  ┌──────────────────────────────────────────────────┐  │  │       │
│  │  │  │  class ECG (Ecg.py)                              │  │  │       │
│  │  │  │  getImage → GrayImage → CheckSimilarity          │  │  │       │
│  │  │  │  → DividingLeads → PreprocessingLeads             │  │  │       │
│  │  │  │  → SignalExtraction_Scaling → CombineConvert1D    │  │  │       │
│  │  │  │  → DimensionalReduction → ModelLoad_predict       │  │  │       │
│  │  │  └──────────────────────────────────────────────────┘  │  │       │
│  │  │  ┌──────────────────────────────────────────────────┐  │  │       │
│  │  │  │  ecg_explainability.py                           │  │  │       │
│  │  │  │  PQRST Detection · Measurements · Annotated Plots│  │  │       │
│  │  │  │  Model Votes · Lead Importance · Clinical Report  │  │  │       │
│  │  │  └──────────────────────────────────────────────────┘  │  │       │
│  │  │  ┌──────────────────────────────────────────────────┐  │  │       │
│  │  │  │  Model Files (.pkl)                              │  │  │       │
│  │  │  │  • PCA_ECG (1).pkl (9.4 MB — 3060→400 dims)     │  │  │       │
│  │  │  │  • Heart_Disease_Prediction.pkl (8 MB — Ens. 93%)│  │  │       │
│  │  │  └──────────────────────────────────────────────────┘  │  │       │
│  │  └────────────────────────────────────────────────────────┘  │       │
│  └──────────────────────────────────────────────────────────────┘       │
└─────────────────────────────────────────────────────────────────────────┘
```

---

## 🤖 AI/ML Pipeline

The ML pipeline converts a **2D ECG image** into a **clinical diagnosis** through a 10-step automated process:

### Pipeline Steps

| Step | Process | Algorithm / Tool | Output |
|:----:|:--------|:-----------------|:-------|
| 1 | **Environment Setup** | `tempfile.mkdtemp()`, process isolation | Sandboxed workspace |
| 2 | **Image Loading & Validation** | `skimage.imread`, SSIM (`structural_similarity`) | Similarity score (reject if < 0.70) |
| 3 | **13-Lead Segmentation** | Pixel-coordinate array slicing | 12 leads + Long Lead II |
| 4 | **Otsu Preprocessing** | `gaussian(σ=1)` + `threshold_otsu` → binary | Noise-free binary lead images |
| 5 | **Contour Extraction** | `measure.find_contours(0.8)` + `MinMaxScaler` | 12 × 255-point 1D signals (CSV) |
| 6 | **Feature Concatenation** | `pandas.concat(axis=1)` across 12 CSVs | 3,060-dimensional feature vector |
| 7 | **PCA Reduction** | Pre-trained PCA (`PCA_ECG (1).pkl`) | 400 principal components |
| 8 | **Ensemble Classification** | Pre-trained VotingClassifier | Prediction + confidence |
| 9 | **Explainability Analysis** | `ecg_explainability.py` (PQRST, intervals, votes) | Clinical annotations |
| 10 | **Result Delivery** | SSE final event | Prediction + images + explainability JSON |

### Ensemble Model Architecture

The classifier is a **Soft Voting Ensemble** combining 5 heterogeneous algorithms:

```
                    ┌─────────────────────┐
                    │   400 PCA Features   │
                    └─────────┬───────────┘
                              │
              ┌───────────────┼───────────────┐
              │               │               │
         ┌────┴────┐    ┌────┴────┐    ┌────┴────┐
         │   SVM   │    │   KNN   │    │ Random  │
         │         │    │         │    │ Forest  │
         └────┬────┘    └────┬────┘    └────┬────┘
              │               │               │
         ┌────┴────┐    ┌────┴────┐          │
         │  Naive  │    │Logistic │          │
         │  Bayes  │    │  Reg.   │          │
         └────┬────┘    └────┬────┘          │
              │               │               │
              └───────────────┼───────────────┘
                              │
                    ┌─────────┴───────────┐
                    │   Soft Voting        │
                    │   (Probability Avg)  │
                    └─────────┬───────────┘
                              │
                    ┌─────────┴───────────┐
                    │  Diagnostic Output   │
                    │  0: Abnormal HB      │
                    │  1: Myocardial Inf.   │
                    │  2: Normal            │
                    │  3: History of MI     │
                    └─────────────────────┘
```

### Lead Segmentation Mapping

| Array Index | Lead Name | Cardiac Territory | Pixel Coordinates |
|:-----------:|:---------:|:-----------------:|:-----------------:|
| 1 | Lead I | Lateral | `[300:600, 150:643]` |
| 2 | aVR | Cavity | `[300:600, 646:1135]` |
| 3 | V1 | Septal | `[300:600, 1140:1625]` |
| 4 | V4 | Anterior | `[300:600, 1630:2125]` |
| 5 | Lead II | Inferior | `[600:900, 150:643]` |
| 6 | aVL | Lateral | `[600:900, 646:1135]` |
| 7 | V2 | Septal | `[600:900, 1140:1625]` |
| 8 | V5 | Lateral | `[600:900, 1630:2125]` |
| 9 | Lead III | Inferior | `[900:1200, 150:643]` |
| 10 | aVF | Inferior | `[900:1200, 646:1135]` |
| 11 | V3 | Anterior | `[900:1200, 1140:1625]` |
| 12 | V6 | Lateral | `[900:1200, 1630:2125]` |
| 13 | Long Lead II | Inferior | `[1250:1480, 150:2125]` |

---

## 🔍 Explainability Engine

The system includes a **1,300-line cardiologist-grade explainability module** (`ecg_explainability.py`) that provides clinical transparency for every prediction:

### Capabilities

| Feature | Description |
|:--------|:------------|
| **PQRST Wave Detection** | Automated P, Q, R, S, T peak identification using NeuroKit2 (DWT delineation) with `scipy.signal.find_peaks` fallback |
| **Clinical Measurements** | P/Q/R/S/T amplitudes, Q depth, S depth, PR interval (ms), QRS duration (ms), QT interval (ms), ST deviation & slope, heart rate (BPM), rhythm regularity |
| **Annotated Signal Plots** | PQRST markers drawn on raw lead images with beat numbering, RR interval brackets, QRS duration brackets, rhythm tags, and measurement info boxes |
| **Ensemble Vote Breakdown** | Individual prediction and confidence from each sub-classifier (SVM, KNN, RF, NB, LR) |
| **PCA → Lead Importance** | Random Forest feature importances mapped through PCA eigenvectors back to 12 leads to compute per-lead contribution percentages |
| **Heart Axis Estimation** | Frontal plane QRS axis calculated from Lead I and aVF |
| **Per-Lead Clinical Reports** | 8-section structured report: Header, Signal Quality, PQRST Waves, Rhythm, Intervals, Territory Correlation, Clinical Significance, Recommendations |
| **Clinical Interpretation** | Narrative summary text correlating findings across leads with the ML prediction |

---

## 👥 User Roles & Workflows

### Role Matrix

| Capability | Patient | Technician | Doctor | Admin |
|:-----------|:-------:|:----------:|:------:|:-----:|
| Self-register (auto-approved) | ✅ | ❌ | ❌ | ✅ |
| Self-register (requires admin approval) | — | ✅ | ✅ | — |
| Upload ECG images | ✅ | ✅ | ❌ | ❌ |
| Assign ECG to a doctor | ❌ | ✅ | ❌ | ❌ |
| Run AI analysis | ✅ | ✅ | ✅ | ❌ |
| View own reports | ✅ | ✅ | — | — |
| Review & sign-off reports | ❌ | ❌ | ✅ | ❌ |
| Reject reports with notes | ❌ | ❌ | ✅ | ❌ |
| Search all reports (name, date, status) | ❌ | ❌ | ✅ | ❌ |
| Approve/reject user registrations | ❌ | ❌ | ❌ | ✅ |
| View audit logs | ❌ | ❌ | ❌ | ✅ |
| Manage all users | ❌ | ❌ | ❌ | ✅ |

### Dashboard Views

- **Patient Dashboard** — Health metrics cards, ECG report history, health timeline, health insights
- **Doctor Dashboard** — Pending reviews, reviewed cases, abnormality rate analytics, progress rings
- **Technician Dashboard** — Upload count, workflow progress bars, quick-action upload buttons
- **Admin Dashboard** — Total users, pending approvals, user distribution gauges, audit stream

---

## 🔐 Authentication & Authorization

| Component | Implementation |
|:----------|:---------------|
| **Auth Provider** | Supabase Auth (email/password) |
| **Session Management** | JWT access tokens stored in `localStorage` |
| **Role Enforcement** | Client-side role check via `user_metadata.role` |
| **Approval Gating** | Doctors/Technicians receive `status: "pending"` on signup; blocked from login until admin sets `status: "approved"` |
| **Dev Bypass** | Rate-limit resilient local user creation with `dev_token_*` prefix tokens |
| **Audit Trail** | Every auth event (signup, login, approval, rejection) logged to `audit:*` keys |

---

## 🔄 End-to-End ECG Workflow

```
Patient/Technician                    FastAPI Server                    Doctor
       │                                   │                              │
       │  1. Upload ECG Image               │                              │
       │──────────────────────────────────►  │                              │
       │                                   │                              │
       │  2. POST /validate-ecg            │                              │
       │──────────────────────────────────► │                              │
       │  ◄── {is_ecg, confidence}         │                              │
       │                                   │                              │
       │  3. Save record (status: pending) │                              │
       │──── MemoryStore ─────────────────►│                              │
       │                                   │                              │
       │  4. POST /predict (SSE stream)    │                              │
       │──────────────────────────────────►│                              │
       │  ◄── Step 1: Init                 │                              │
       │  ◄── Step 2: SSIM validation      │                              │
       │  ◄── Step 3: Lead segmentation    │                              │
       │  ◄── Step 4: Otsu preprocessing   │                              │
       │  ◄── Step 5: Contour extraction   │                              │
       │  ◄── Step 6: PCA encoding         │                              │
       │  ◄── Step 7: Classification       │                              │
       │  ◄── Step 8: Explainability       │                              │
       │  ◄── Step 9: Annotated signals    │                              │
       │  ◄── Step 10: Final results       │                              │
       │                                   │                              │
       │  5. Save results + pipeline imgs  │                              │
       │──── MemoryStore ─────────────────►│                              │
       │                                   │                              │
       │                                   │  6. Doctor reviews report     │
       │                                   │ ◄────────────────────────────│
       │                                   │                              │
       │                                   │  7. Sign-off / Reject        │
       │  8. Patient sees final report     │ ◄────────────────────────────│
       │◄──────────────────────────────────│                              │
```

---

## 🛠️ Technology Stack

### Frontend
| Technology | Purpose |
|:-----------|:--------|
| **React 18.3** | UI framework |
| **TypeScript** | Type-safe development |
| **Vite 6.3** | Build tool and dev server |
| **Radix UI** | Accessible primitive components (25+ packages) |
| **Framer Motion** | Animations and micro-interactions |
| **Lucide React** | Medical-grade icon library |
| **Recharts** | Data visualization charts |
| **Supabase JS v2** | Authentication and storage client |

### Backend
| Technology | Purpose |
|:-----------|:--------|
| **FastAPI** | Async Python web framework |
| **Uvicorn** | ASGI server |
| **Scikit-Learn** | Ensemble classifier + PCA |
| **Scikit-Image** | Image processing (SSIM, Otsu, contours) |
| **Matplotlib** | Lead plots and contour visualizations |
| **Pandas / NumPy** | Data manipulation and feature engineering |
| **SciPy** | Signal processing (Savitzky-Golay, peak detection) |
| **NeuroKit2** | PQRST wave delineation |
| **Joblib** | Model serialization/deserialization |

### Infrastructure
| Technology | Purpose |
|:-----------|:--------|
| **Supabase** | Authentication + Object storage (production) |
| **MemoryStore** | Client-side dev database (localStorage-backed) |
| **Docker** | Containerized deployment support |
| **ProcessPoolExecutor** | Isolated process-per-request ML execution |

---

## 📁 Project Structure

```
Cardiovascular Disease Detection UI/
│
├── index.html                          # Vite entry point
├── package.json                        # Frontend dependencies
├── vite.config.ts                      # Vite + React SWC configuration
├── tsconfig.json                       # TypeScript configuration
│
├── src/                                # ── FRONTEND SOURCE ──
│   ├── main.tsx                        # React DOM entry
│   ├── App.tsx                         # Central state-machine router
│   ├── index.css                       # Global styles & design tokens
│   │
│   ├── components/
│   │   ├── layout/
│   │   │   ├── sidebar.tsx             # Role-filtered navigation
│   │   │   └── main-layout.tsx         # App shell with header
│   │   ├── landing/                    # Landing page sections
│   │   ├── ui/
│   │   │   ├── medical-button.tsx      # Custom medical-themed button
│   │   │   ├── medical-card.tsx        # Card with gradient accents
│   │   │   ├── medical-input.tsx       # Form input with icons
│   │   │   ├── medical-table.tsx       # Searchable data table
│   │   │   ├── medical-toast.tsx       # Toast notification system
│   │   │   ├── medical-modal.tsx       # Dialog modal
│   │   │   ├── file-upload.tsx         # Drag-and-drop file uploader
│   │   │   ├── image-modal.tsx         # Fullscreen image zoom viewer
│   │   │   ├── searchable-select.tsx   # Filterable dropdown
│   │   │   ├── explainability-report-section.tsx  # XAI visualization
│   │   │   └── ... (60+ Radix primitives)
│   │   ├── ecg-report-menu.tsx         # Report actions (download, print, delete)
│   │   └── ecg-image-thumbnail.tsx     # Lazy-load ECG preview
│   │
│   ├── pages/
│   │   ├── LandingPage.tsx             # Public marketing page
│   │   ├── auth/
│   │   │   ├── login.tsx               # Email/password login
│   │   │   ├── signup.tsx              # Role-aware registration
│   │   │   ├── forgot-password.tsx     # Password reset request
│   │   │   └── reset-password.tsx      # Password reset completion
│   │   ├── doctor/
│   │   │   ├── dashboard.tsx           # Doctor metrics & pending queue
│   │   │   ├── doctor-reports.tsx      # Searchable report directory
│   │   │   └── report-review.tsx       # Clinical review + sign-off
│   │   ├── patient/
│   │   │   ├── dashboard.tsx           # Health metrics & timeline
│   │   │   ├── patient-reports.tsx     # Date-filtered report list
│   │   │   └── patient-report-view.tsx # Read-only report view
│   │   ├── technician/
│   │   │   └── dashboard.tsx           # Upload stats & quick actions
│   │   ├── admin/
│   │   │   ├── dashboard.tsx           # System overview & user stats
│   │   │   ├── pending-requests.tsx    # Approve/reject registrations
│   │   │   ├── user-management.tsx     # User directory table
│   │   │   └── audit-logs.tsx          # Immutable event log viewer
│   │   ├── upload/
│   │   │   ├── ecg-upload-wizard.tsx   # 3-step upload workflow
│   │   │   └── upload-success.tsx      # Confirmation page
│   │   ├── analysis/
│   │   │   └── ecg-analysis.tsx        # Live SSE pipeline viewer
│   │   ├── settings/
│   │   │   └── settings.tsx            # Profile editor
│   │   └── patients/
│   │       ├── patient-list.tsx        # Patient directory
│   │       ├── patient-profile.tsx     # Patient detail view
│   │       └── add-patient.tsx         # Manual patient entry
│   │
│   ├── lib/
│   │   ├── api.tsx                     # API layer (auth, ECG, users, stats, audit)
│   │   ├── supabase-client.tsx         # Supabase init + MemoryStore class
│   │   └── background-analysis.ts      # Headless background ML runner
│   │
│   ├── contexts/
│   │   └── ThemeContext.tsx             # Dark/light mode provider
│   │
│   └── utils/
│       └── supabase/
│           └── info.tsx                # Supabase project credentials
│
├── MlPart - Copy/                      # ── BACKEND + ML ──
│   └── Deployment/
│       ├── fastapi_app.py              # FastAPI server (SSE + validation)
│       ├── Ecg.py                      # Core ML pipeline class (9 methods)
│       ├── ecg_explainability.py       # Cardiologist-grade XAI module (1,303 lines)
│       ├── requirements.txt            # Python dependencies
│       ├── Dockerfile                  # Docker container definition
│       ├── app.py                      # Legacy Flask API
│       ├── final_app.py                # Streamlit demo app
│       │
│       ├── Heart_Disease_Prediction_using_ECG (4).pkl  # Ensemble classifier (8 MB, 93% accuracy)
│       ├── PCA_ECG (1).pkl                             # PCA transformer (9.4 MB)
│       │
│       ├── SimilarityPictures/         # SSIM reference ECG images
│       │   ├── HB(37).jpg             # Abnormal Heartbeat reference
│       │   ├── MI(24).jpg             # Myocardial Infarction reference
│       │   ├── Normal(46).jpg         # Normal ECG reference
│       │   └── PMI(30).jpg            # History of MI reference
│       │
│       └── Scaled_1DLead_{1-12}.csv   # Pipeline-generated 1D signal outputs
│
└── build/                              # Vite production build output
```

---

## 📦 Model Files

| File | Size | Description |
|:-----|:----:|:------------|
| `Heart_Disease_Prediction_using_ECG (4).pkl` | ~8 MB | Scikit-Learn `VotingClassifier` ensemble (SVM + KNN + Random Forest + Naive Bayes + Logistic Regression). **93% classification accuracy.** Trained on the Mendeley ECG Images dataset. Classifies into 4 CVD categories. Serialized with sklearn 1.0.1. |
| `PCA_ECG (1).pkl` | ~9.4 MB | Scikit-Learn `PCA` transformer. Reduces 3,060 raw signal features (12 leads × 255 samples) to 400 principal components for classifier input. |

---

## 📊 Dataset

The models were trained on the **ECG Images Dataset of Cardiac Patients** — a publicly available dataset from Mendeley Data contributed by researchers from Pakistan.

| Detail | Info |
|:-------|:-----|
| **Dataset Name** | ECG Images Dataset of Cardiac Patients |
| **Authors** | Khan, Ali Haider; Hussain, Muzammil |
| **Year** | 2021 |
| **Version** | V2 |
| **DOI** | `10.17632/gwbz3fsgp8.2` |
| **Link** | [https://data.mendeley.com/datasets/gwbz3fsgp8/2](https://data.mendeley.com/datasets/gwbz3fsgp8/2) |
| **Classes** | Normal, Abnormal Heartbeat, Myocardial Infarction, History of MI |
| **Format** | 12-lead ECG images (JPG) |

**Citation:**
```
Khan, Ali Haider; Hussain, Muzammil (2021), "ECG Images dataset of Cardiac Patients",
Mendeley Data, V2, doi: 10.17632/gwbz3fsgp8.2
```

> ⚠️ **Compatibility Note:** These models were serialized with Scikit-Learn **1.0.1**. The `fastapi_app.py` includes runtime monkey-patches for tree node dtype, scorer, and `monotonic_cst` attribute to ensure compatibility with Scikit-Learn **1.4+**.

---

## 🚀 Installation & Setup

### Prerequisites

- **Node.js** ≥ 18.x and **npm** ≥ 9.x
- **Python** 3.10.x (recommended for sklearn model compatibility)
- **Git**

### 1. Clone the Repository

```bash
git clone https://github.com/asimalyas/ECG-Based-CVD-Detection.git
cd "Cardiovascular Disease Detection UI"
```

### 2. Backend Setup (FastAPI + ML Pipeline)

```bash
# Navigate to backend
cd "MlPart - Copy/Deployment"

# Create Python virtual environment
python -m venv venv
# Activate (Windows)
.\venv\Scripts\activate
# Activate (macOS/Linux)
source venv/bin/activate

# Install dependencies
pip install --upgrade pip
pip install -r requirements.txt

# Install additional dependencies required by the explainability module
pip install numpy scipy neurokit2
```

<details>
<summary><strong>📋 Complete Python Dependencies</strong></summary>

```
scikit-learn
scikit-image
joblib
pandas
numpy
matplotlib
natsort
scipy
neurokit2
fastapi
uvicorn
python-multipart
```

</details>

### 3. Frontend Setup (React + Vite)

```bash
# Navigate back to project root
cd "Cardiovascular Disease Detection UI"

# Install Node.js dependencies
npm install
```

### 4. Supabase Configuration

The project uses **Supabase** for authentication and file storage. The project ID and anonymous key are configured in:

```
src/utils/supabase/info.tsx
```

To use your own Supabase instance:

1. Create a project at [supabase.com](https://supabase.com)
2. Enable **Email Auth** in Authentication settings
3. Create a storage bucket named `make-39210185-ecg-files`
4. Update `src/utils/supabase/info.tsx`:

```typescript
export const projectId = "YOUR_PROJECT_ID"
export const publicAnonKey = "YOUR_ANON_KEY"
```

> **Note:** The system includes a development bypass mode that works without Supabase for local testing. Users created via bypass are stored in the browser's `MemoryStore`.

---

## ▶️ Running the Application

### Start the Backend (ML Server)

```bash
cd "MlPart - Copy/Deployment"
python fastapi_app.py
```

The FastAPI server starts at **`http://localhost:8000`**. Verify at `http://localhost:8000/docs` for the interactive Swagger UI.

### Start the Frontend (React App)

```bash
# In a new terminal, from the project root
npm run dev
```

The Vite dev server starts at **`http://localhost:3000`** and opens automatically in your browser.

### Build for Production

```bash
npm run build
```

Output is written to the `build/` directory.

---

## 📡 API Reference

### FastAPI Endpoints (`localhost:8000`)

#### `POST /validate-ecg`

Validates whether an uploaded image is a structurally valid ECG.

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `file` | `UploadFile` | ECG image file (PNG, JPG, JPEG) |

**Response:**
```json
{
  "is_ecg": true,
  "confidence": 0.847,
  "message": "Valid ECG"
}
```

#### `POST /predict`

Runs the full ML pipeline with real-time streaming progress.

| Parameter | Type | Description |
|:----------|:-----|:------------|
| `file` | `UploadFile` | Validated ECG image file |

**Response:** `text/event-stream` (Server-Sent Events)

```
data: {"step": 1, "message": "Initializing Environment...", "progress": 5}

data: {"step": 3, "message": "Segmenting 12 ECG Leads...", "progress": 30, "partial_images": {"leads": {...}}}

data: {"step": 8, "message": "Running Clinical Explainability...", "progress": 92}

data: {"result": {"success": true, "prediction": "Your ECG is Normal", "confidence": 94.2, "similarity_score": 0.85, "explainability": {...}}}
```

---

## 📸 Screenshots

> Screenshots from the live application are demonstrated in the [Full Demo Video](https://www.youtube.com/watch?v=UqMDbNdvumw).

| View | Description |
|:-----|:------------|
| **Landing Page** | Premium marketing page with feature highlights and workflow steps |
| **Patient Dashboard** | Health metrics, report cards, timeline, and insights |
| **Doctor Dashboard** | Pending queue, progress rings, abnormality analytics |
| **ECG Upload Wizard** | 3-step process: Patient selection → ECG validation → Submit |
| **Live Analysis** | Real-time 10-step pipeline progress with image previews |
| **Clinical Report** | Full diagnostic report with pipeline visualizations and explainability |
| **Doctor Review** | Sign-off/reject interface with physician notes |
| **Admin Panel** | User management, pending approvals, audit log stream |

---

## ⚠️ Limitations & Future Work

### Current Limitations

- **Fixed Image Format** — Lead segmentation uses hardcoded pixel coordinates optimized for a specific 12-lead ECG layout (1572 × 2213 px). Non-standard layouts will fail.
- **Development Storage** — The `MemoryStore` uses browser `localStorage` (5 MB limit) for data persistence. Consecutive heavy analysis runs can trigger `QuotaExceededError` (mitigated but not eliminated).
- **Single-Server ML** — The FastAPI backend processes requests in isolated processes but runs on a single server with `max_workers=4`.
- **No Real Database** — ECG records and user profiles are stored in browser memory rather than a persistent server-side database.
- **Sklearn Version Coupling** — Pre-trained `.pkl` models require runtime compatibility patches for Scikit-Learn > 1.3.

### Future Improvements

- [ ] **Deep Learning Integration** — Replace/augment ensemble classifier with CNN-based models (ResNet, EfficientNet) trained on raw ECG images
- [ ] **Adaptive Lead Detection** — Use object detection (YOLO/Faster R-CNN) to automatically locate lead boundaries instead of fixed coordinates
- [ ] **Persistent Database** — Migrate from `MemoryStore` to Supabase PostgreSQL or dedicated database
- [ ] **DICOM Support** — Accept standard medical imaging format inputs
- [ ] **Multi-Language Reports** — Generate clinical reports in Urdu, Arabic, and other languages
- [ ] **Mobile Application** — React Native companion app for field ECG capture
- [ ] **HIPAA/GDPR Compliance** — End-to-end encryption, audit-grade access controls, data retention policies
- [ ] **Federated Learning** — Privacy-preserving model training across hospital networks

---

## 🎓 Academic Context

This project is developed as a **Final Year Project (FYP)** for a Bachelor's degree program in Computer Science / Software Engineering.

**Project Title:** Hybrid Multimodal Fusion Framework for Cardiovascular Disease Detection Using ECG

📄 **Full FYP Report:** [View Document (PDF)](https://1drv.ms/b/c/cacb8574e4143f96/IQCqwrsV6Q-cTYa7G69ti-TaAXXVVbeFk05RqabcuNc8ETk?e=TJXQ4W)

**Key Contributions:**
1. An end-to-end image-based ECG classification system that does not require raw signal data or specialized hardware
2. A novel combination of traditional image processing (SSIM, Otsu, contour extraction) with ensemble machine learning achieving **93% classification accuracy**
3. A cardiologist-grade explainability module providing clinical-level PQRST wave analysis from image-extracted signals
4. A full-stack clinical decision support platform with role-based workflows matching real hospital operations

---

## 📄 Credits & License

### Authors

- **Muhammad Asim Ilyas** — Full-Stack Development, ML Pipeline, System Architecture

### Acknowledgments

- **Scikit-Learn** for the machine learning framework
- **Scikit-Image** for image processing algorithms
- **Supabase** for authentication and storage infrastructure
- **Radix UI** for accessible component primitives
- **NeuroKit2** for ECG signal processing utilities

---

<p align="center">
  <strong>Made with ❤️ for cardiovascular health</strong><br/>
  <sub>If this project helped you, please consider giving it a ⭐</sub>
</p>
