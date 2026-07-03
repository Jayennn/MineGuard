# 🛡️ MineGuard
### AI-Powered PPE Detection & Real-time Face Recognition for Mining Safety

<p align="center">

[![Frontend](https://img.shields.io/badge/Frontend-React%20%7C%20TypeScript-61DAFB?style=for-the-badge&logo=react&logoColor=white)](https://react.dev/)
[![Backend](https://img.shields.io/badge/Backend-FastAPI-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![AI Model](https://img.shields.io/badge/AI-YOLOv8%20%7C%20DeepFace-E53935?style=for-the-badge)](https://github.com/ultralytics/ultralytics)
[![Dataset](https://img.shields.io/badge/Dataset-Roboflow-F28C28?style=for-the-badge&logo=roboflow&logoColor=white)](https://app.roboflow.com/bhisma-aprian-prayogi/construction-ppe-detector-kideco-2)

</p>

---

## 📖 Overview

**MineGuard** adalah platform **Computer Vision** berbasis AI yang dirancang untuk meningkatkan **Health, Safety, and Environment (HSE)** di industri pertambangan melalui deteksi **Personal Protective Equipment (PPE)** secara otomatis serta **Face Recognition** secara real-time.

Proyek ini dikembangkan untuk **Hackathon KIC 2026** sebagai solusi modern terhadap proses audit keselamatan kerja yang selama ini masih dilakukan secara manual.

MineGuard mengintegrasikan beberapa teknologi AI modern:

- 🎯 **YOLOv8** untuk deteksi pekerja dan APD
- 👤 **DeepFace / InsightFace** untuk identifikasi pekerja
- ⚡ **FastAPI** sebagai AI Backend berperforma tinggi
- 🌐 **React + TypeScript + Tailwind CSS** untuk Dashboard Command Center modern
- 📊 Dashboard analitik untuk monitoring kepatuhan APD secara real-time

---

# 📑 Table of Contents

- [✨ Key Features](#-key-features)
- [🏗 System Architecture](#-system-architecture)
- [🧠 AI Workflow](#-ai-workflow)
- [🖥 Dashboard Modules](#-dashboard-modules)
- [🛠 Technology Stack](#-technology-stack)
- [🚀 Installation](#-installation)
- [🤖 AI Model](#-ai-model)
- [❓ Troubleshooting](#-troubleshooting)

---

# ✨ Key Features

## 🚨 Automated HSE Compliance Auditor

Secara otomatis mendeteksi pekerja yang tidak menggunakan APD, seperti:

- Safety Helmet
- Safety Vest
- Safety Boots
- Safety Goggles
- Safety Gloves

Seluruh proses dilakukan secara **real-time** menggunakan model YOLOv8.

---

## 👤 Real-time Face Recognition

Ketika pelanggaran APD terdeteksi:

1. Area wajah di-crop otomatis.
2. Sistem menghasilkan Face Embedding.
3. Embedding dibandingkan dengan database pekerja.
4. Nama dan Worker ID langsung ditampilkan.

Matching dilakukan menggunakan **Cosine Similarity**.

---

## 📈 AI Quick Insights

Dashboard menyediakan analisis otomatis berupa:

- Tren pelanggaran 14 hari terakhir
- Area dengan pelanggaran tertinggi
- Shift dengan tingkat kepatuhan terendah
- AI Recommendation untuk Safety Briefing

---

## 📹 Live CCTV Matrix

Mendukung monitoring hingga **6 kamera secara bersamaan** dengan fitur:

- Live Video
- PPE Detection Overlay
- Face Recognition
- Dynamic Verification Toggle
- Camera Status

---

## 📸 Automatic Evidence Snapshot

Setiap pelanggaran akan otomatis disimpan beserta:

- Timestamp
- Worker ID
- Worker Name
- Camera ID
- Violation Type
- High Resolution Snapshot

Seluruh data tersimpan dalam database sehingga mudah digunakan untuk investigasi internal.

---

# 🏗 System Architecture

```text
               +----------------------+
               |   CCTV Live Stream   |
               +----------+-----------+
                          |
                          v
              +-------------------------+
              |      YOLOv8 Detector    |
              | Person + PPE Detection  |
              +-----------+-------------+
                          |
        +-----------------+----------------+
        |                                  |
        | PPE Complete                     | PPE Missing
        |                                  |
        v                                  v
 Display Green Status             Face Recognition Engine
                                 (DeepFace / InsightFace)
                                          |
                                          v
                              Face Embedding Extraction
                                          |
                                          v
                               Worker Database Matching
                                          |
                                          v
                         Save Violation + Update Dashboard
```

---

# 🧠 AI Workflow

MineGuard memisahkan proses AI menjadi dua tahap utama agar inferensi tetap cepat.

## Stage 1 — PPE Detection

YOLOv8 melakukan:

- Person Detection
- Helmet Detection
- Vest Detection
- Boots Detection
- Goggles Detection
- Gloves Detection

Jika seluruh APD lengkap maka proses selesai.

---

## Stage 2 — Face Recognition

Jika ditemukan APD yang hilang:

- Crop wajah
- Face Detection
- Face Alignment
- Embedding Extraction
- Cosine Similarity Matching
- Worker Identification

---

## ⚡ Performance Optimization

Face Recognition merupakan proses paling berat.

Untuk menjaga FPS tetap tinggi digunakan:

- IoU Tracking
- Frame Cache
- Frame Interval Recognition

DeepFace hanya dijalankan **setiap 5 frame**, sedangkan frame lainnya menggunakan tracking object.

Pendekatan ini mampu mengurangi beban GPU hingga sekitar **80%**.

---

# 🖥 Dashboard Modules

## 📊 Dashboard

Menampilkan informasi utama:

### KPI Cards

- Violations Today
- Violations This Month
- Workers Detected
- Active Cameras

---

### Analytics

- Violation Trend (Bar Chart)
- PPE Violation Distribution (Donut Chart)
- Top Violation Locations
- Shift Distribution

---

## 👤 Face Registration

Digunakan untuk registrasi pekerja baru.

Field yang tersedia:

- Worker ID
- Full Name
- Department
- Position
- Status

Fitur:

- Upload Photo
- Edit Worker
- Delete Worker
- Search Worker

---

## 📹 Camera Monitoring

Menampilkan:

- 6 Live CCTV
- Camera Name
- Location
- Detection Status
- PPE Overlay
- Violation Counter
- Worker Counter

---

# 🛠 Technology Stack

## Frontend

| Technology | Purpose |
|------------|---------|
| React | UI Framework |
| TypeScript | Type Safety |
| Tailwind CSS | Styling |
| Lucide React | Icons |
| Recharts | Dashboard Visualization |

---

## Backend

| Technology | Purpose |
|------------|---------|
| FastAPI | REST API |
| Uvicorn | ASGI Server |
| Python | AI Backend |

---

## AI

| Technology | Purpose |
|------------|---------|
| YOLOv8 | PPE Detection |
| DeepFace | Face Recognition |
| InsightFace | Face Embedding |
| RetinaFace | Face Detection |

---

## Dataset

Dataset PPE dikembangkan menggunakan **Roboflow** dan dilatih khusus untuk lingkungan pertambangan.

Target class:

- Person
- Helmet
- Vest
- Boots
- Gloves
- Goggles

---


# 🚀 Installation

## Requirements

- Node.js 18+
- Python 3.9+
- Git
- CUDA Toolkit *(Recommended)*
- cuDNN *(Recommended)*

---
### 1. Clone Repository

```bash
git clone <repository-url>
cd MineGuard
```

### 2. Install Frontend Dependencies

```bash
npm install
```

### 3. Install Python Dependencies

```bash
pip install -r requirements.txt
```

### 4. Run AI Backend

```bash
cd local_deployment

python -m uvicorn main:app --reload --port 8000
```

### 5. Run Frontend

Buka terminal baru lalu jalankan:

```bash
npm run dev
```

Frontend akan berjalan di:

```
http://localhost:5173
```

Backend AI berjalan di:

```
http://127.0.0.1:8000
```

---

# 🤖 AI Model

## PPE Detection

Model:

- YOLOv8

Target:

- Person
- Helmet
- Vest
- Boots
- Gloves
- Goggles

Input Size:

```
640 × 640
```

---

## Face Recognition

Menggunakan:

- DeepFace
- InsightFace
- RetinaFace
- ArcFace Embedding

Similarity:

```
Cosine Similarity
```

---

## Performance Optimization

MineGuard menggunakan:

- IoU Tracking
- Frame Skipping
- Tracking Cache

DeepFace hanya dipanggil setiap **5 frame**.

---


# ❓ Troubleshooting

## FastAPI Offline

**Problem**

```
FASTAPI SERVER OFFLINE
```

**Solution**

Pastikan backend berjalan.

```bash
python -m uvicorn main:app --reload --port 8000
```

---

## CCTV Lag

**Problem**

Video terasa lambat.

**Solution**

Gunakan:

```python
imgsz = 640
```

Pastikan inferensi menggunakan GPU.

---

## Unknown Face

**Problem**

Semua wajah dikenali sebagai **Unknown**.

**Solution**

- Gunakan foto registrasi berkualitas tinggi.
- Pastikan pencahayaan cukup.
- Sesuaikan nilai Cosine Similarity Threshold pada backend.

---

# 📌 Future Improvements

Beberapa fitur yang direncanakan pada pengembangan berikutnya:

- 🔔 Telegram / WhatsApp Notification
- 📱 Mobile Monitoring Dashboard
- ☁ Cloud Deployment
- 🎥 RTSP Camera Support
- 📡 MQTT Integration
- 📊 AI Predictive Safety Analytics
- 📍 Heatmap of PPE Violations
- 🧑‍💼 Employee Attendance via Face Recognition

---

# 👨‍💻 Authors

Developed for **Hackathon KIC 2026**

**MineGuard Team** **CicibukCicakitCicampunk**

AI-powered Mining Safety Monitoring Platform

---

## ⭐ Support

Jika proyek ini bermanfaat, jangan lupa memberikan ⭐ pada repository ini.

Kontribusi, issue, dan pull request selalu diterima.