# 🛡️ Sistem Deteksi K3 Terintegrasi - Versi Desktop

Aplikasi deteksi keselamatan kerja real-time yang menggunakan:
- **YOLOv8m** untuk deteksi APD (Helm, Rompi Keselamatan, Kacamata)
- **DeepFace + ArcFace** untuk pengenalan wajah pekerja
- **Text-to-Speech** untuk peringatan audio otomatis

---

## 📋 Persyaratan Sistem

- **OS**: Windows 10/11, macOS 10.15+, atau Linux (Ubuntu 18.04+)
- **Python**: 3.8 - 3.11
- **RAM**: Minimal 8GB (rekomendasi 16GB)
- **Webcam**: Terintegrasi atau eksternal
- **Disk**: ~10GB untuk model AI

---

## 🚀 Instalasi

### Step 1: Clone atau Download Repository
```bash
# Pastikan Anda memiliki semua file:
# - k3_detector_desktop.py
# - requirements.txt
# - best3.pt (model YOLO Anda)
```

### Step 2: Buat Virtual Environment (Recommended)
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### Step 3: Install Dependencies
```bash
pip install --upgrade pip
pip install -r requirements.txt
```

⏳ **Waktu instalasi**: 5-15 menit tergantung kecepatan internet

### Step 4: Persiapkan Database Wajah

```bash
# Buat folder untuk database
mkdir karyawan_db

# Letakkan foto karyawan di folder ini dengan format:
# NAMA_KARYAWAN.jpg
# Contoh:
#   - BUDI_SANTOSO.jpg
#   - SITI_NURHALIZA.jpg
#   - AHMAD_SYAIFUL.jpg
```

**Tips Foto Database:**
- Format: JPG atau PNG
- Resolusi: Minimal 200x200 pixel
- Pencahayaan: Cukup terang, wajah jelas
- Wajah: Menoleh lurus ke depan
- Jumlah: 2-3 foto per orang (berbeda sudut/ekspresi) untuk akurasi lebih baik

### Step 5: Persiapkan Model YOLO

Pastikan file `best3.pt` ada di folder yang sama dengan script:
```
├── k3_detector_desktop.py
├── requirements.txt
├── best3.pt  ← File model YOLO Anda
├── karyawan_db/
│   ├── BUDI_SANTOSO.jpg
│   ├── SITI_NURHALIZA.jpg
│   └── ...
└── README.md
```

---

## ▶️ Menjalankan Aplikasi

### Windows
```bash
python k3_detector_desktop.py
```

### macOS / Linux
```bash
python3 k3_detector_desktop.py
```

---

## 🎮 Cara Menggunakan

1. **Jalankan Script** → Jendela aplikasi akan terbuka dengan feed webcam
2. **Aktifkan Aturan K3** → Gunakan checkbox untuk mengaktifkan/nonaktifkan:
   - 🪖 Wajib Helm
   - 🦺 Wajib Rompi
   - 🥽 Wajib Kacamata
   - 🔊 Audio (untuk peringatan suara)

3. **Monitor Real-time**:
   - **Layar Video**: Menampilkan frame dengan deteksi kotak
   - **Status Bar**: Menunjukkan kondisi kepatuhan
   - **HUD (Heads-Up Display)**: Info pekerja, status, dan timer validasi

4. **Interpretasi Warna Kotak**:
   - 🟢 **Hijau**: APD aman terdeteksi (Helm/Rompi/Kacamata)
   - 🟡 **Cyan**: Pelanggaran tapi aturan dinonaktifkan
   - 🔴 **Merah**: PELANGGARAN aktif (sesuai aturan yang diaktifkan)
   - 🔵 **Biru**: Deteksi keberadaan manusia

5. **Sistem Peringatan**:
   - Validasi: Tunggu 10 detik untuk memastikan pelanggaran nyata
   - Sanksi Aktif: Jika masih melanggar setelah 10 detik
   - Audio: Peringatan otomatis setiap 6 detik (jika audio aktif)

---

## ⚙️ Konfigurasi

Anda bisa mengedit file `k3_detector_desktop.py` untuk menyesuaikan:

### 1. Threshold Pengenalan Wajah
```python
# Baris ~230
if min_dist < 0.60:  # Ubah 0.60 untuk sensitifitas
    cached_person = f"{best_match} ({((1-min_dist)*100):.1f}%)"
```
- **0.40 - 0.50**: Ketat (akurasi tinggi, mungkin lebih banyak "TIDAK DIKENAL")
- **0.55 - 0.65**: Seimbang (rekomendasi)
- **0.70+**: Longgar (sensitif, risiko false positives)

### 2. Confidence Model YOLO
```python
# Baris ~245
results = model_apd(frame, conf=0.15, verbose=False)[0]
```
- **0.15**: Default (sensitif terhadap deteksi kecil)
- **0.20 - 0.30**: Lebih ketat

### 3. Durasi Validasi (Sebelum Sanksi)
```python
# Baris ~266
remaining = max(0, 10 - int(duration))  # Ubah 10 untuk durasi lain
```

### 4. Interval Peringatan
```python
# Baris ~272
if current_person not in last_warning_time or (now - last_warning_time[current_person] > 6):
```
- Ubah `6` untuk interval peringatan (dalam detik)

---

## 🐛 Troubleshooting

### ❌ "Tidak bisa mengakses webcam"
```bash
# Windows: Check Device Manager apakah kamera aktif
# Linux: 
sudo apt install cheese  # Test webcam
sudo usermod -a -G video $USER  # Tambah permission

# macOS: System Preferences > Security & Privacy > Camera
```

### ❌ "ModuleNotFoundError: No module named 'torch'"
```bash
# Re-install dengan force reinstall
pip install --force-reinstall torch torchvision
```

### ❌ Model tidak ditemukan atau error CUDA
```bash
# Gunakan CPU mode (lebih lambat tapi tidak butuh GPU)
# Sudah default di script ini
```

### ⚠️ Pengenalan wajah selalu "TIDAK DIKENAL"
- Periksa foto database di folder `karyawan_db/`
- Pastikan foto jelas dan terang
- Coba tambah lebih banyak foto dari berbagai sudut
- Lower threshold (ubah `0.60` menjadi `0.70`)

### ⚠️ Deteksi APD tidak akurat
- Pastikan kondisi pencahayaan bagus
- Sesuaikan confidence threshold YOLO
- Cek apakah model `best3.pt` adalah versi terbaru

### 🔊 Audio tidak terdengar
- Verifikasi speaker/headphone terhubung
- Test: `python -m pyttsx3 "Test"` di terminal
- Coba ubah engine atau volume sistem

---

## 📊 Struktur File

```
project-folder/
├── k3_detector_desktop.py      # Script utama
├── requirements.txt            # Dependencies
├── best3.pt                    # Model YOLO (download sendiri)
├── karyawan_db/                # Database wajah
│   ├── BUDI_SANTOSO.jpg
│   ├── SITI_NURHALIZA.jpg
│   └── AHMAD_SYAIFUL.jpg
└── README.md                   # Panduan ini
```

---

## 🔄 Update & Maintenance

### Cek versi library
```bash
pip list | grep -E "ultralytics|deepface|opencv"
```

### Update ke versi terbaru
```bash
pip install --upgrade ultralytics deepface opencv-python
```

---

## 📝 Logging & Debug

Untuk melihat detail debug:

```python
# Tambahkan di awal file setelah import:
import logging
logging.basicConfig(level=logging.DEBUG)
```

---

## ⚖️ Lisensi & Kredit

- **YOLOv8**: Ultralytics (Apache 2.0)
- **DeepFace**: SerengBoy (MIT)
- **OpenCV**: Open Source
- **pyttsx3**: Nateshmbhat (MIT)

---

## 🆘 Support & Issues

Jika ada masalah:

1. **Check error message** di terminal
2. **Coba rerun dengan `-v` untuk verbose**:
   ```bash
   python -u k3_detector_desktop.py
   ```
3. **Verifikasi file** `best3.pt` dan folder `karyawan_db/`
4. **Test webcam** terlebih dahulu dengan aplikasi lain

---

## 📞 Contact

Untuk bantuan atau saran improvement, hubungi developer.

**Last Updated**: 2026
**Version**: 1.0 (Desktop)

---

Selamat menggunakan Sistem Deteksi K3 Terintegrasi! 🛡️