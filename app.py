import cv2
import numpy as np
import os
import time
import json
import threading
from datetime import datetime
from scipy.spatial.distance import cosine
from ultralytics import YOLO
from deepface import DeepFace
import streamlit as st
import pyttsx3
import pygame

# =====================================================================
# 1. KONFIGURASI SISTEM & STREAMLIT
# =====================================================================
st.set_page_config(
    page_title="MineGuard MVP - KIC 2026", 
    page_icon="🛡️", 
    layout="wide"
)

LOCATION = "Area Tambang Kideco (Simulasi)"
LOG_FILE = "violations_log.json"

# Inisialisasi pygame mixer untuk alarm MP3
try:
    pygame.mixer.init()
except Exception as e:
    print(f"Gagal inisialisasi Pygame Mixer: {e}")

# =====================================================================
# 2. FUNGSI UTILITAS (AUDIO ALARM & LOGGING)
# =====================================================================
def trigger_alarm_system(text, enable_audio):
    """
    Menjalankan Alarm MP3 dan Text-to-Speech (TTS) di thread terpisah.
    Mencegah live streaming video mengalami 'freeze' atau patah-patah.
    """
    def target_audio():
        # 1. Putar alarm.mp3 jika file tersedia
        if os.path.exists("alarm.mp3"):
            try:
                pygame.mixer.music.load("alarm.mp3")
                pygame.mixer.music.play()
                # Tunggu alarm selesai diputar sebelum masuk ke suara pemberitahuan
                while pygame.mixer.music.get_busy():
                    time.sleep(0.1)
            except Exception as e:
                print(f"Error memutar alarm.mp3: {e}")
        
        # 2. Jalankan Peringatan Suara (TTS) jika diaktifkan
        if enable_audio:
            try:
                speaker = pyttsx3.init()
                speaker.setProperty('rate', 140)
                speaker.say(text)
                speaker.runAndWait()
            except Exception as e:
                print(f"Audio TTS Error: {e}")
                
    threading.Thread(target=target_audio, daemon=True).start()

def log_violation(worker_id, violation_str):
    """Mencatat log pelanggaran ke file JSON sebagai Audit Trail"""
    now = datetime.now()
    log_entry = {
        "timestamp": now.strftime("%Y-%m-%d %H:%M:%S"),
        "worker_id": worker_id,
        "location": LOCATION,
        "violation": violation_str
    }
    
    logs = []
    if os.path.exists(LOG_FILE):
        try:
            with open(LOG_FILE, "r") as f:
                logs = json.load(f)
        except json.JSONDecodeError:
            logs = []
            
    logs.append(log_entry)
    with open(LOG_FILE, "w") as f:
        json.dump(logs, f, indent=4)

# =====================================================================
# 3. LOADING MODEL AI (DI-CACHE AGAR HEMAT MEMORI)
# =====================================================================
@st.cache_resource
def load_models_and_db():
    """Memuat model YOLO dan Database Wajah hanya 1 kali saat aplikasi dijalankan"""
    # 1. Load YOLOv8 Model
    model_path = "weights/model_orang.pt" if os.path.exists("weights/model_orang.pt") else "model_orang.pt"
    if not os.path.exists(model_path):
        model_path = "best3.pt"
        
    try:
        model = YOLO(model_path)
    except Exception:
        model = None
    
    # 2. Load ArcFace Encodings dari folder database
    encodings, names = [], []
    db_path = "karyawan_db"
    os.makedirs(db_path, exist_ok=True)
    
    for file_name in os.listdir(db_path):
        if file_name.endswith((".jpg", ".png", ".jpeg")):
            name = os.path.splitext(file_name)[0].upper()
            try:
                res = DeepFace.represent(img_path=os.path.join(db_path, file_name), model_name="ArcFace", enforce_detection=False)
                if len(res) > 0:
                    encodings.append(res[0]["embedding"])
                    names.append(name)
            except:
                pass
    return model, encodings, names

model_apd, known_face_encodings, known_face_names = load_models_and_db()

# Auto-mapping nama class YOLO
map_kelas = {
    'Hardhat': 'helmet', 'NO-Hardhat': 'no-helmet',
    'Safety Vest': 'vest', 'NO-Safety Vest': 'no-vest',
    'Person': 'person', 'Gloves': 'gloves', 'NO-Gloves': 'no-gloves',
    'Goggles': 'goggles', 'NO-Goggles': 'no-goggles'
}

# =====================================================================
# 4. ANTARMUKA STREAMLIT (UI DASHBOARD)
# =====================================================================
st.title("🛡️ MineGuard: Intelligent Safety Monitoring")
st.markdown("**Minimum Viable Product (MVP)** | Tim *CiCibukCiCakitCiCampunk* - Hackathon KIC 2026")

# Layout UI (1 Kolom Kiri untuk Kontrol & Registrasi, 1 Kolom Kanan untuk Video)
col_control, col_monitor = st.columns([1, 2.3])

with col_control:
    st.header("⚙️ Konfigurasi K3")
    st.markdown("Pilih APD yang wajib dideteksi:")
    
    wajib_helm = st.checkbox("🪖 Wajib Helm", value=True)
    wajib_rompi = st.checkbox("🦺 Wajib Rompi", value=True)
    wajib_kacamata = st.checkbox("🥽 Wajib Kacamata", value=True)
    wajib_sepatu = st.checkbox("🥾 Wajib Sepatu (Strict Mode)", value=True)
    
    st.markdown("---")
    st.subheader("🔊 Sistem Peringatan")
    enable_audio = st.checkbox("Aktifkan Suara Teguran (TTS)", value=True)
    st.caption("💡 Jika file 'alarm.mp3' diletakkan di folder proyek, sirine alarm akan otomatis berbunyi sebelum suara teguran.")
    
    # =====================================================================
    # METODE 2: REGISTRASI KARYAWAN INTERAKTIF
    # =====================================================================
    st.markdown("---")
    st.subheader("👤 Registrasi Karyawan Baru")
    
    nama_baru = st.text_input("Nama Karyawan (Gunakan huruf kapital/tanpa spasi)", "").strip().upper()
    metode_reg = st.radio("Metode Input Wajah:", ["Upload Foto", "Ambil Foto via Kamera"])
    
    foto_disimpan = None
    if metode_reg == "Upload Foto":
        uploaded_img = st.file_uploader("Pilih Foto Wajah (JPG/PNG)", type=["jpg", "jpeg", "png"])
        if uploaded_img is not None:
            foto_disimpan = uploaded_img.read()
            
    elif metode_reg == "Ambil Foto via Kamera":
        camera_img = st.camera_input("Posisikan wajah di tengah kamera")
        if camera_img is not None:
            foto_disimpan = camera_img.read()
            
    if st.button("💾 Daftarkan Wajah Karyawan"):
        if nama_baru == "":
            st.error("❌ Nama karyawan tidak boleh kosong!")
        elif foto_disimpan is None:
            st.error("❌ Foto wajah belum dimasukkan!")
        else:
            os.makedirs("karyawan_db", exist_ok=True)
            path_simpan = os.path.join("karyawan_db", f"{nama_baru}.jpg")
            
            with open(path_simpan, "wb") as f:
                f.write(foto_disimpan)
                
            st.success(f"✅ Berhasil mendaftarkan {nama_baru} ke Database AI!")
            
            # Reset cache agar wajah baru langsung dikenali tanpa restart aplikasi
            st.cache_resource.clear()
            time.sleep(1)
            st.rerun()
            
    st.markdown("---")
    st.subheader("🎥 Kontrol Kamera")
    cam_index = st.number_input("Index Webcam (0=Internal, 1=USB)", min_value=0, max_value=5, value=0)
    
    # Tombol Jalankan Utama
    run_system = st.checkbox("▶️ JALANKAN MINEGUARD AI", value=False)

with col_monitor:
    st.header("🔴 Live Video Analytics")
    FRAME_WINDOW = st.empty()

# =====================================================================
# 5. CORE ENGINE (LOOPING VIDEO STREAM)
# =====================================================================
if run_system:
    if model_apd is None:
        st.error("❌ Model YOLO (best3.pt / model_orang.pt) tidak ditemukan!")
    else:
        cap = cv2.VideoCapture(cam_index)
        
        violation_tracker = {}
        last_warning_time = {}
        last_log_time = {}
        frame_count = 0
        cached_person = "UNKNOWN"
        cached_face_box = None
        
        if enable_audio or os.path.exists("alarm.mp3"):
            trigger_alarm_system("Sistem Mine Guard diaktifkan.", enable_audio)
            
        while run_system:
            ret, frame = cap.read()
            if not ret:
                st.error("❌ Gagal membaca sinyal webcam.")
                break
                
            frame_count += 1
            critical_violations = []
            if wajib_helm:     critical_violations.append("no-helmet")
            if wajib_rompi:    critical_violations.append("no-vest")
            if wajib_kacamata: critical_violations.append("no-goggles")
            
            # --- JALUR 1: PENGENALAN WAJAH (Setiap 10 Frame) ---
            if frame_count % 10 == 0 or cached_person == "UNKNOWN":
                try:
                    face_objs = DeepFace.represent(img_path=frame, model_name="ArcFace", detector_backend="opencv", enforce_detection=False)
                    wajah_ditemukan = False
                    
                    if face_objs and len(face_objs) > 0:
                        face = face_objs[0]
                        if "facial_area" in face and face["facial_area"]['w'] > 0:
                            area = face["facial_area"]
                            cached_face_box = (area['x'], area['y'], area['w'], area['h'])
                            
                            min_dist, best_match = 1.0, "UNKNOWN"
                            for i, known_emb in enumerate(known_face_encodings):
                                dist = cosine(face["embedding"], known_emb)
                                if dist < min_dist:
                                    min_dist, best_match = dist, known_face_names[i]
                                    
                            if min_dist < 0.60:
                                cached_person = best_match
                            else:
                                cached_person = "UNKNOWN"
                            wajah_ditemukan = True
                    
                    if not wajah_ditemukan:
                        cached_person = "UNKNOWN"
                        cached_face_box = None
                except:
                    pass
            
            # --- JALUR 2: DETEKSI APD (YOLOv8) ---
            results = model_apd(frame, conf=0.25, imgsz=640, verbose=False)[0]
            status_k3 = "AMAN (PATUH)"
            pelanggaran_frame = []
            ada_orang, ada_boots = False, False
            box_orang = None
            
            for box in results.boxes:
                x1, y1, x2, y2 = map(int, box.xyxy[0])
                cls_raw = model_apd.names[int(box.cls[0])]
                cls_name = map_kelas.get(cls_raw, cls_raw.lower())
                conf_score = float(box.conf[0])
                
                if cls_name == "person":
                    ada_orang = True
                    box_orang = (x1, y1, x2, y2)
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 255, 0), 1)
                    continue
                
                if cls_name == "boots" and conf_score > 0.40:
                    ada_boots = True
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    continue
                
                if cls_name in ['no-helmet', 'no-vest', 'no-goggles']:
                    if cls_name in critical_violations:
                        status_k3 = "PELANGGARAN!"
                        pelanggaran_frame.append(cls_name.upper())
                        cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                        cv2.putText(frame, cls_name.upper(), (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
                elif cls_name in ['helmet', 'vest', 'goggles']:
                    cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            
            if ada_orang and not ada_boots and wajib_sepatu:
                status_k3 = "PELANGGARAN!"
                pelanggaran_frame.append("NO-BOOTS")
                if box_orang:
                    px1, py1, px2, py2 = box_orang
                    y_kaki = py2 - int((py2 - py1) * 0.25)
                    cv2.rectangle(frame, (px1, y_kaki), (px2, py2), (0, 0, 255), 3)
                    cv2.putText(frame, "NO-BOOTS DETECTED", (px1, y_kaki - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 255), 2)
            
            # --- JALUR 3: AUDIO WARNING & JSON LOGGING ---
            if status_k3 == "PELANGGARAN!":
                now = time.time()
                pelanggaran_unik = list(set(pelanggaran_frame))
                detail_str = ", ".join(pelanggaran_unik)
                
                if cached_person not in last_warning_time or (now - last_warning_time[cached_person] > 8.0):
                    nama_panggil = "Pekerja Tidak Dikenal" if cached_person == "UNKNOWN" else f"Bapak {cached_person.lower()}"
                    detail_audio = detail_str.lower().replace("no-", "tanpa ").replace("boots", "sepatu safety").replace("vest", "rompi")
                    pesan_suara = f"Peringatan. {nama_panggil}. Anda melanggar aturan {detail_audio}."
                    
                    # Trigger gabungan alarm.mp3 + TTS suara teks
                    trigger_alarm_system(pesan_suara, enable_audio)
                    last_warning_time[cached_person] = now
                
                if cached_person not in last_log_time or (now - last_log_time[cached_person] > 30.0):
                    log_violation(cached_person, detail_str)
                    last_log_time[cached_person] = now

            # --- JALUR 4: DRAW HUD ON VIDEO ---
            if cached_face_box:
                fx, fy, fw, fh = cached_face_box
                cv2.rectangle(frame, (fx, fy), (fx+fw, fy+fh), (255, 0, 255), 2)
                cv2.putText(frame, cached_person, (fx, fy - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 0, 255), 2)

            cv2.rectangle(frame, (10, 10), (450, 110), (0, 0, 0), -1)
            cv2.putText(frame, f"IDENTITAS : {cached_person}", (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
            warna_hud = (0, 255, 0) if status_k3 == "AMAN (PATUH)" else (0, 0, 255)
            cv2.putText(frame, f"STATUS K3 : {status_k3}", (20, 65), cv2.FONT_HERSHEY_SIMPLEX, 0.5, warna_hud, 2)
            if pelanggaran_frame:
                cv2.putText(frame, f"ALASAN    : {', '.join(list(set(pelanggaran_frame)))}", (20, 95), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 0, 255), 1)
            
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            FRAME_WINDOW.image(frame_rgb, use_column_width=True)
            
        cap.release()
