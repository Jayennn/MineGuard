# =============================================================================
# MineGuard MVP - KIC 2026 | Tim CiCibukCiCakitCiCampunk
# Versi Optimasi: Target 20-30 FPS di CPU AMD Ryzen 5 5500U
# =============================================================================
# STRATEGI OPTIMASI YANG DITERAPKAN:
#   [1] Hardware-level camera downscaling (640x480 via OpenCV CAP_PROP)
#   [2] Async DeepFace thread + frame-skip (hanya tiap N frame)
#   [3] ONNX Runtime fallback untuk YOLO (aktifkan manual via USE_ONNX=True)
#   [4] YOLO half=False + optimal imgsz untuk CPU AMD (tanpa CUDA)
#   [5] Frame queue non-blocking agar main loop tidak pernah di-block thread
# =============================================================================

import cv2
import numpy as np
import os
import time
import json
import threading
import queue
from datetime import datetime
from scipy.spatial.distance import cosine
from ultralytics import YOLO
from deepface import DeepFace
import streamlit as st
import pyttsx3
import pygame

# =====================================================================
# SECTION 0 — KONSTANTA KONFIGURASI OPTIMASI (UBAH DI SINI)
# =====================================================================

# [OPT-1] Resolusi kamera: turunkan ke 480x360 jika masih lag
CAM_WIDTH  = 640
CAM_HEIGHT = 480

# [OPT-2] Deteksi wajah dijalankan setiap N frame (lebih besar = lebih ringan)
# Ryzen 5 5500U: rekomendasi 45-60. Jika masih lag, naikkan ke 90.
FACE_DETECT_EVERY_N_FRAMES = 45

# [OPT-3] ONNX Mode: Set True jika sudah export model ke .onnx
# Cara export: model.export(format='onnx') lalu rename ke model_orang.onnx
USE_ONNX = False
ONNX_MODEL_PATH = "model_orang.onnx"

# [OPT-4] Ukuran inferensi YOLO — 320 jauh lebih cepat dari 640 di CPU
YOLO_IMGSZ = 320

# Batas confidence YOLO dan threshold ArcFace
YOLO_CONF       = 0.25
ARCFACE_THRESH  = 0.55  # Lebih rendah = lebih ketat (disarankan 0.50-0.60)

# Lokasi dan file log
LOCATION = "Area Tambang Kideco (Simulasi)"
LOG_FILE  = "violations_log.json"

# =====================================================================
# SECTION 1 — STREAMLIT PAGE CONFIG
# =====================================================================
st.set_page_config(
    page_title="MineGuard MVP - KIC 2026",
    page_icon="🛡️",
    layout="wide"
)

# Inject CSS ringan untuk tampilan lebih profesional
st.markdown("""
<style>
    /* Kurangi padding default Streamlit */
    .block-container { padding-top: 1rem; padding-bottom: 1rem; }
    
    /* Styling HUD status */
    .status-safe     { color: #4CAF50; font-weight: bold; font-size: 1.1rem; }
    .status-violation{ color: #F44336; font-weight: bold; font-size: 1.1rem; }
    
    /* FPS meter */
    .fps-meter {
        background: #1a1a2e; color: #00ff88;
        font-family: monospace; font-size: 0.85rem;
        padding: 6px 12px; border-radius: 6px;
        display: inline-block;
    }
    
    /* Sidebar subheader */
    .sidebar-label {
        font-size: 0.78rem; color: #888;
        text-transform: uppercase; letter-spacing: 0.05em;
        margin-bottom: 4px;
    }
</style>
""", unsafe_allow_html=True)

# =====================================================================
# SECTION 2 — FUNGSI UTILITAS: AUDIO & LOGGING
# =====================================================================

# Inisialisasi pygame mixer (satu kali, global)
try:
    pygame.mixer.init()
    _pygame_ok = True
except Exception as e:
    _pygame_ok = False
    print(f"[WARN] Pygame mixer gagal init: {e}")

# Lock untuk mencegah 2 thread audio berjalan bersamaan
_audio_lock = threading.Lock()

def trigger_alarm_system(text: str, enable_tts: bool):
    """
    Jalankan alarm.mp3 (jika ada) + TTS di thread daemon terpisah.
    Menggunakan lock agar tidak ada tumpang tindih suara.
    """
    def _run():
        with _audio_lock:
            # 1. Alarm MP3
            if _pygame_ok and os.path.exists("alarm.mp3"):
                try:
                    pygame.mixer.music.load("alarm.mp3")
                    pygame.mixer.music.play()
                    while pygame.mixer.music.get_busy():
                        time.sleep(0.05)
                except Exception as e:
                    print(f"[WARN] alarm.mp3 error: {e}")

            # 2. Text-to-Speech pyttsx3
            if enable_tts:
                try:
                    spk = pyttsx3.init()
                    spk.setProperty('rate', 145)
                    spk.say(text)
                    spk.runAndWait()
                    spk.stop()
                except Exception as e:
                    print(f"[WARN] TTS error: {e}")

    t = threading.Thread(target=_run, daemon=True)
    t.start()


def log_violation(worker_id: str, violation_str: str):
    """Simpan log pelanggaran ke violations_log.json (append-safe)."""
    entry = {
        "timestamp": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "worker_id": worker_id,
        "location":  LOCATION,
        "violation": violation_str
    }
    logs = []
    if os.path.exists(LOG_FILE):
        try:
            with open(LOG_FILE, "r") as f:
                logs = json.load(f)
        except (json.JSONDecodeError, ValueError):
            logs = []
    logs.append(entry)
    with open(LOG_FILE, "w") as f:
        json.dump(logs, f, indent=2, ensure_ascii=False)


# =====================================================================
# SECTION 3 — LOAD MODEL & DATABASE WAJAH (CACHED)
# =====================================================================

@st.cache_resource(show_spinner="Memuat model AI dan database karyawan...")
def load_models_and_db():
    """
    Load YOLO + ArcFace encodings satu kali saat startup.
    Dengan @st.cache_resource, tidak akan reload saat ada interaksi UI.
    """
    # --- 3A. Load YOLO ---
    if USE_ONNX and os.path.exists(ONNX_MODEL_PATH):
        # ONNX Runtime via Ultralytics: lebih cepat 1.5-2x di CPU AMD
        model = YOLO(ONNX_MODEL_PATH, task="detect")
        print(f"[INFO] Menggunakan ONNX model: {ONNX_MODEL_PATH}")
    else:
        # Cari model .pt (coba beberapa path umum)
        candidates = ["weights/best.pt", "model_orang.pt", "best3.pt", "best.pt"]
        model_path = next((p for p in candidates if os.path.exists(p)), None)
        if model_path:
            model = YOLO(model_path)
            print(f"[INFO] Menggunakan PyTorch model: {model_path}")
        else:
            model = None
            print("[ERROR] Tidak ada file model ditemukan!")

    # --- 3B. Load ArcFace Encodings ---
    encodings, names = [], []
    db_path = "karyawan_db"
    os.makedirs(db_path, exist_ok=True)

    valid_ext = (".jpg", ".jpeg", ".png")
    for fname in os.listdir(db_path):
        if not fname.lower().endswith(valid_ext):
            continue
        name = os.path.splitext(fname)[0].upper()
        fpath = os.path.join(db_path, fname)
        try:
            res = DeepFace.represent(
                img_path=fpath,
                model_name="ArcFace",
                enforce_detection=False,
                detector_backend="opencv"
            )
            if res and len(res) > 0:
                encodings.append(np.array(res[0]["embedding"], dtype=np.float32))
                names.append(name)
                print(f"[INFO] Wajah terdaftar: {name}")
        except Exception as e:
            print(f"[WARN] Gagal encode {fname}: {e}")

    return model, encodings, names


model_apd, known_face_encodings, known_face_names = load_models_and_db()

# Mapping nama class YOLO (dari label dataset ke label internal sistem)
CLASS_MAP = {
    'Hardhat':        'helmet',
    'NO-Hardhat':     'no-helmet',
    'Safety Vest':    'vest',
    'NO-Safety Vest': 'no-vest',
    'Person':         'person',
    'Gloves':         'gloves',
    'NO-Gloves':      'no-gloves',
    'Goggles':        'goggles',
    'NO-Goggles':     'no-goggles',
    'Boots':          'boots',
    'NO-Boots':       'no-boots',
    # Lowercase fallback (jika nama kelas di model sudah lowercase)
    'hardhat':        'helmet',
    'no-hardhat':     'no-helmet',
    'safety vest':    'vest',
    'no-safety vest': 'no-vest',
    'person':         'person',
    'gloves':         'gloves',
    'no-gloves':      'no-gloves',
    'goggles':        'goggles',
    'no-goggles':     'no-goggles',
    'boots':          'boots',
    'no-boots':       'no-boots',
    'vest':           'vest',
    'no-vest':        'no-vest',
    'helmet':         'helmet',
    'no-helmet':      'no-helmet',
}

# =====================================================================
# SECTION 4 — ASYNC FACE RECOGNITION ENGINE
# =====================================================================
# Arsitektur: Main loop video TIDAK menunggu DeepFace.
# Thread wajah bekerja di background, hasil dikirim via queue.
# Main loop hanya membaca queue (non-blocking) dan update cache.

class AsyncFaceRecognizer:
    """
    Worker thread yang menjalankan DeepFace ArcFace secara independen.
    Main loop tidak pernah di-block oleh komputasi wajah.
    """
    def __init__(self, encodings, names, threshold=ARCFACE_THRESH):
        self.encodings  = encodings
        self.names      = names
        self.threshold  = threshold

        # Queue input: frame yang perlu dianalisis (maxsize=1 = selalu frame terbaru)
        self._in_q  = queue.Queue(maxsize=1)
        # Queue output: hasil nama + bounding box
        self._out_q = queue.Queue(maxsize=5)

        self._stop_event = threading.Event()
        self._thread = threading.Thread(target=self._worker, daemon=True)
        self._thread.start()

    def submit_frame(self, frame: np.ndarray):
        """Kirim frame ke worker. Jika queue penuh, frame lama dibuang (drop-oldest)."""
        try:
            self._in_q.get_nowait()  # Buang frame lama jika ada
        except queue.Empty:
            pass
        try:
            self._in_q.put_nowait(frame.copy())
        except queue.Full:
            pass

    def get_result(self):
        """
        Ambil hasil terbaru (non-blocking).
        Return: (name_str, face_box_tuple_or_None) atau None jika belum ada hasil baru.
        """
        try:
            return self._out_q.get_nowait()
        except queue.Empty:
            return None

    def stop(self):
        self._stop_event.set()

    def _worker(self):
        """Loop worker: proses frame dari queue, kirim hasil ke output queue."""
        while not self._stop_event.is_set():
            try:
                frame = self._in_q.get(timeout=0.5)
            except queue.Empty:
                continue

            name     = "UNKNOWN"
            face_box = None

            try:
                face_objs = DeepFace.represent(
                    img_path=frame,
                    model_name="ArcFace",
                    detector_backend="opencv",
                    enforce_detection=False
                )

                if face_objs and len(face_objs) > 0:
                    face = face_objs[0]
                    fa   = face.get("facial_area", {})

                    if fa.get("w", 0) > 20:  # Wajah cukup besar untuk diproses
                        face_box = (fa["x"], fa["y"], fa["w"], fa["h"])
                        emb = np.array(face["embedding"], dtype=np.float32)

                        if self.encodings:
                            dists = [cosine(emb, k) for k in self.encodings]
                            best_idx  = int(np.argmin(dists))
                            best_dist = dists[best_idx]
                            if best_dist < self.threshold:
                                name = self.names[best_idx]
            except Exception as e:
                print(f"[WARN] DeepFace worker error: {e}")

            # Kirim hasil (non-blocking, buang jika queue penuh)
            try:
                self._out_q.put_nowait((name, face_box))
            except queue.Full:
                pass


# =====================================================================
# SECTION 5 — STREAMLIT UI LAYOUT
# =====================================================================
st.title("🛡️ MineGuard: Intelligent Safety Monitoring")
st.markdown(
    "**Minimum Viable Product (MVP)** | Tim *CiCibukCiCakitCiCampunk* — Hackathon KIC 2026 | "
    f"Model: {'ONNX ⚡' if USE_ONNX else 'PyTorch'} | Kamera: {CAM_WIDTH}×{CAM_HEIGHT}"
)

col_ctrl, col_mon = st.columns([1, 2.3])

# ────────────────────────────────────────────────────────────────────
# KOLOM KIRI: Kontrol & Registrasi
# ────────────────────────────────────────────────────────────────────
with col_ctrl:
    st.header("⚙️ Konfigurasi K3")

    st.markdown('<p class="sidebar-label">APD Wajib Dideteksi</p>', unsafe_allow_html=True)
    wajib_helm      = st.checkbox("🪖 Wajib Helm",               value=True)
    wajib_rompi     = st.checkbox("🦺 Wajib Rompi/Vest",         value=True)
    wajib_kacamata  = st.checkbox("🥽 Wajib Kacamata/Goggles",   value=True)
    wajib_sepatu    = st.checkbox("🥾 Wajib Sepatu Safety (Boots)", value=False,
                                  help="Aktifkan jika model dapat mendeteksi kelas 'boots'")

    st.markdown("---")
    st.subheader("🔊 Sistem Peringatan")
    enable_audio = st.checkbox("Aktifkan Suara Teguran (TTS)", value=True)
    st.caption(
        "💡 Letakkan file `alarm.mp3` di folder proyek untuk mengaktifkan sirine. "
        "TTS berjalan di thread terpisah — video tidak akan freeze."
    )

    st.markdown("---")
    st.subheader("👤 Registrasi Karyawan")

    nama_baru  = st.text_input("Nama Karyawan (HURUF KAPITAL, tanpa spasi)", "").strip().upper()
    metode_reg = st.radio("Metode Input Wajah:", ["Upload Foto", "Ambil Foto via Kamera"])

    foto_bytes = None
    if metode_reg == "Upload Foto":
        uploaded = st.file_uploader("Pilih Foto Wajah (JPG/PNG)", type=["jpg", "jpeg", "png"])
        if uploaded:
            foto_bytes = uploaded.read()
    else:
        cam_snap = st.camera_input("Posisikan wajah di tengah, lalu ambil foto")
        if cam_snap:
            foto_bytes = cam_snap.read()

    if st.button("💾 Daftarkan Karyawan", use_container_width=True):
        if not nama_baru:
            st.error("❌ Nama tidak boleh kosong!")
        elif not foto_bytes:
            st.error("❌ Foto belum dimasukkan!")
        else:
            os.makedirs("karyawan_db", exist_ok=True)
            save_path = os.path.join("karyawan_db", f"{nama_baru}.jpg")
            with open(save_path, "wb") as f:
                f.write(foto_bytes)
            st.success(f"✅ {nama_baru} berhasil didaftarkan!")
            # Clear cache agar wajah baru langsung dikenali tanpa restart
            st.cache_resource.clear()
            time.sleep(0.8)
            st.rerun()

    st.markdown("---")
    st.subheader("🎥 Kontrol Kamera")
    cam_index = st.number_input(
        "Index Kamera (0=Internal, 1=USB Eksternal)",
        min_value=0, max_value=5, value=0
    )

    st.markdown("---")
    # Tombol utama ON/OFF sistem
    run_system = st.checkbox("▶️ JALANKAN MINEGUARD AI", value=False)

    # Panel debug performa (opsional)
    show_debug = st.checkbox("🔧 Tampilkan Info Performa", value=False)

# ────────────────────────────────────────────────────────────────────
# KOLOM KANAN: Live Video Monitor
# ────────────────────────────────────────────────────────────────────
with col_mon:
    st.header("🔴 Live Video Analytics")
    FRAME_WINDOW   = st.empty()
    status_display = st.empty()

    if show_debug:
        debug_cols    = st.columns(4)
        fps_display   = debug_cols[0].empty()
        face_display  = debug_cols[1].empty()
        yolo_display  = debug_cols[2].empty()
        viola_display = debug_cols[3].empty()


# =====================================================================
# SECTION 6 — CORE ENGINE (VIDEO LOOP UTAMA)
# =====================================================================
if run_system:
    if model_apd is None:
        st.error("❌ Model YOLO tidak ditemukan. Pastikan file model ada di folder proyek.")
        st.stop()

    # ── Inisialisasi Kamera dengan Resolusi Terbatas ──
    cap = cv2.VideoCapture(cam_index)
    # [OPT-1] Set resolusi di level driver — kurangi data sebelum masuk ke Python
    cap.set(cv2.CAP_PROP_FRAME_WIDTH,  CAM_WIDTH)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, CAM_HEIGHT)
    cap.set(cv2.CAP_PROP_FPS, 30)         # Minta 30 FPS dari kamera
    cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)   # Buffer minimal — selalu baca frame terbaru

    if not cap.isOpened():
        st.error(f"❌ Kamera index {cam_index} tidak bisa dibuka.")
        st.stop()

    # ── Inisialisasi Async Face Recognizer ──
    face_engine = AsyncFaceRecognizer(known_face_encodings, known_face_names)

    # ── State Variables ──
    frame_count      = 0
    cached_person    = "UNKNOWN"
    cached_face_box  = None

    last_warning_time = {}   # {worker_id: timestamp_terakhir_warning}
    last_log_time     = {}   # {worker_id: timestamp_terakhir_log}

    # Variabel FPS
    fps_t0    = time.time()
    fps_count = 0
    fps_val   = 0.0

    # Startup announcement
    trigger_alarm_system("Sistem Mine Guard diaktifkan. Selamat bekerja dengan aman.", enable_audio)

    # ── Main Video Loop ──
    while run_system:
        ret, frame = cap.read()
        if not ret:
            st.warning("⚠️ Gagal membaca frame. Mengecek koneksi kamera...")
            time.sleep(0.5)
            continue

        frame_count += 1
        t_frame_start = time.perf_counter()

        # ────────────────────────────────────────────────────────────
        # JALUR 1: FACE RECOGNITION (ASYNC — NON-BLOCKING)
        # ────────────────────────────────────────────────────────────

        # [OPT-2] Kirim frame ke worker hanya setiap N frame
        if frame_count % FACE_DETECT_EVERY_N_FRAMES == 0:
            face_engine.submit_frame(frame)

        # Selalu cek hasil terbaru (non-blocking, pakai cache jika belum ada hasil baru)
        result = face_engine.get_result()
        if result is not None:
            cached_person, cached_face_box = result

        # ────────────────────────────────────────────────────────────
        # JALUR 2: DETEKSI APD (YOLO) — Dijalankan Setiap Frame
        # ────────────────────────────────────────────────────────────

        # [OPT-3/4] YOLO dengan imgsz kecil untuk CPU AMD
        t_yolo_start = time.perf_counter()
        results = model_apd(
            frame,
            conf=YOLO_CONF,
            imgsz=YOLO_IMGSZ,
            half=False,      # Ryzen tidak support FP16 via CPU YOLO
            verbose=False
        )[0]
        t_yolo_ms = (time.perf_counter() - t_yolo_start) * 1000

        # ── Parse Hasil Deteksi YOLO ──
        status_k3        = "AMAN (PATUH)"
        pelanggaran_frame = []
        ada_orang        = False
        ada_boots        = False
        box_orang        = None

        # Bangun daftar pelanggaran kritis berdasarkan checkbox UI
        critical_violations = set()
        if wajib_helm:      critical_violations.add("no-helmet")
        if wajib_rompi:     critical_violations.add("no-vest")
        if wajib_kacamata:  critical_violations.add("no-goggles")

        for box in results.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            cls_raw   = model_apd.names[int(box.cls[0])]
            cls_name  = CLASS_MAP.get(cls_raw, cls_raw.lower())
            conf_val  = float(box.conf[0])

            if cls_name == "person":
                ada_orang = True
                box_orang = (x1, y1, x2, y2)
                cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 215, 0), 1)
                continue

            if cls_name == "boots" and conf_val >= 0.40:
                ada_boots = True
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 128), 2)
                cv2.putText(frame, "BOOTS ✓", (x1, y1 - 8),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 128), 1)
                continue

            if cls_name in critical_violations:
                # Pelanggaran kritis — kotak merah
                status_k3 = "PELANGGARAN!"
                pelanggaran_frame.append(cls_name.upper())
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                label = cls_name.upper().replace("NO-", "NO ")
                cv2.putText(frame, label, (x1, y1 - 8),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 255), 2)

            elif cls_name in ("helmet", "vest", "goggles", "gloves"):
                # APD lengkap — kotak hijau
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 220, 80), 2)
                cv2.putText(frame, cls_name.upper(), (x1, y1 - 8),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.4, (0, 220, 80), 1)

        # ── Deteksi Boots via Inferensi Tidak Langsung ──
        # Jika mode Strict Boots aktif + orang terdeteksi + boots tidak terdeteksi
        if wajib_sepatu and ada_orang and not ada_boots:
            status_k3 = "PELANGGARAN!"
            pelanggaran_frame.append("NO-BOOTS")
            if box_orang:
                px1, py1, px2, py2 = box_orang
                y_kaki = py2 - int((py2 - py1) * 0.22)
                cv2.rectangle(frame, (px1, y_kaki), (px2, py2), (0, 0, 200), 2)
                cv2.putText(frame, "NO BOOTS", (px1, y_kaki - 8),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 200), 2)

        # ────────────────────────────────────────────────────────────
        # JALUR 3: AUDIO ALARM + LOG JSON (DENGAN COOLDOWN)
        # ────────────────────────────────────────────────────────────
        if status_k3 == "PELANGGARAN!" and pelanggaran_frame:
            now            = time.time()
            violations_key = cached_person  # Gunakan ID sebagai key cooldown
            pelanggaran_unik = list(set(pelanggaran_frame))

            # Audio warning: cooldown 8 detik per pekerja
            if violations_key not in last_warning_time or \
               (now - last_warning_time[violations_key] > 8.0):

                nama_panggil  = "Pekerja tidak dikenal" \
                                if cached_person == "UNKNOWN" \
                                else f"Bapak {cached_person.lower()}"
                detail_audio  = (", ".join(pelanggaran_unik)
                                 .lower()
                                 .replace("no-helmet", "tanpa helm")
                                 .replace("no-vest",   "tanpa rompi")
                                 .replace("no-goggles","tanpa kacamata")
                                 .replace("no-boots",  "tanpa sepatu safety")
                                 .replace("no-gloves", "tanpa sarung tangan"))
                pesan_suara   = f"Peringatan. {nama_panggil}. Anda melanggar aturan {detail_audio}."

                trigger_alarm_system(pesan_suara, enable_audio)
                last_warning_time[violations_key] = now

            # Log JSON: cooldown 30 detik per pekerja (hindari spam log)
            if violations_key not in last_log_time or \
               (now - last_log_time[violations_key] > 30.0):
                log_violation(cached_person, ", ".join(pelanggaran_unik))
                last_log_time[violations_key] = now

        # ────────────────────────────────────────────────────────────
        # JALUR 4: RENDER HUD DI ATAS FRAME
        # ────────────────────────────────────────────────────────────

        # Gambar kotak wajah (dari cache, selalu tersedia)
        if cached_face_box:
            fx, fy, fw, fh = cached_face_box
            cv2.rectangle(frame, (fx, fy), (fx + fw, fy + fh), (220, 0, 220), 2)
            cv2.putText(frame, f"ID: {cached_person}", (fx, fy - 10),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.55, (220, 0, 220), 2)

        # HUD info box (pojok kiri atas)
        hud_h = 120 if pelanggaran_frame else 85
        cv2.rectangle(frame, (8, 8), (460, hud_h), (10, 10, 10), -1)
        cv2.rectangle(frame, (8, 8), (460, hud_h), (60, 60, 60), 1)

        cv2.putText(frame, f"IDENTITAS : {cached_person}",
                    (16, 32), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (230, 230, 230), 1)

        warna_status = (50, 220, 50) if status_k3 == "AMAN (PATUH)" else (50, 50, 255)
        cv2.putText(frame, f"STATUS K3 : {status_k3}",
                    (16, 58), cv2.FONT_HERSHEY_SIMPLEX, 0.52, warna_status, 2)

        cv2.putText(frame, f"FPS: {fps_val:.1f}",
                    (16, 80), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (150, 150, 150), 1)

        if pelanggaran_frame:
            detail_text = ", ".join(list(set(pelanggaran_frame)))
            cv2.putText(frame, f"ALASAN    : {detail_text}",
                        (16, 108), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (50, 50, 255), 1)

        # ── Update Streamlit UI ──
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        FRAME_WINDOW.image(frame_rgb, use_column_width=True)

        # Status text di bawah video
        if status_k3 == "AMAN (PATUH)":
            status_display.markdown(
                f'<p class="status-safe">✅ STATUS: AMAN (PATUH) — {cached_person}</p>',
                unsafe_allow_html=True
            )
        else:
            status_display.markdown(
                f'<p class="status-violation">🚨 PELANGGARAN: {", ".join(set(pelanggaran_frame))} — {cached_person}</p>',
                unsafe_allow_html=True
            )

        # ── Update Debug Panel (jika aktif) ──
        if show_debug:
            fps_display.metric("FPS", f"{fps_val:.1f}")
            face_display.metric("Face Worker", f"Tiap {FACE_DETECT_EVERY_N_FRAMES}f")
            yolo_display.metric("YOLO ms", f"{t_yolo_ms:.0f}")
            viola_display.metric("Identitas", cached_person[:10])

        # ── Hitung FPS ──
        fps_count += 1
        if fps_count >= 15:
            elapsed   = time.time() - fps_t0
            fps_val   = fps_count / elapsed if elapsed > 0 else 0
            fps_count = 0
            fps_t0    = time.time()

    # ── Cleanup saat sistem dimatikan ──
    face_engine.stop()
    cap.release()
    st.info("🛑 MineGuard dihentikan. Kamera dilepas.")