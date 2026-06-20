import cv2
import numpy as np
import os
import time
import json
from datetime import datetime
from collections import deque
from scipy.spatial.distance import cosine
from ultralytics import YOLO
from deepface import DeepFace
import tkinter as tk
from tkinter import ttk
import threading
from PIL import Image, ImageTk
import pyttsx3
import platform

# =====================================================================
# KONFIGURASI
# =====================================================================
LOCATION = "Area Produksi"          # Ganti sesuai lokasi Anda
LOG_FILE = "violations_log.json"    # File JSON untuk menyimpan log

# =====================================================================
# 1. SETUP MODEL YOLOv8m & DATABASE WAJAH ARCFACE
# =====================================================================
print("⏳ Memuat Model YOLOv8m PPE...")
try:
    model_apd = YOLO("model_orang.pt")
    print("✅ Model YOLOv8m Siap!")
except Exception as e:
    print(f"❌ Error loading model: {e}")
    print("📌 Pastikan file 'model_orang.pt' ada di folder yang sama dengan script ini")
    model_apd = None

known_face_encodings = []
known_face_names = []

db_path = "karyawan_db"
if not os.path.exists(db_path):
    os.makedirs(db_path)
    print(f"📁 Dibuat folder: {db_path}")
    print("📌 Letakkan foto karyawan dengan format nama: NAMA.jpg di folder ini")

print("⏳ Mengekstrak Database Wajah menggunakan model ArcFace...")
for file_name in os.listdir(db_path):
    if file_name.endswith((".jpg", ".png", ".jpeg")):
        name = os.path.splitext(file_name)[0].upper()
        image_path = os.path.join(db_path, file_name)
        try:
            res = DeepFace.represent(img_path=image_path, model_name="ArcFace", enforce_detection=False)
            if len(res) > 0:
                known_face_encodings.append(res[0]["embedding"])
                known_face_names.append(name)
                print(f"✅ {name} ditambahkan ke database")
        except Exception as e:
            print(f"⚠️  Gagal membaca {file_name}: {e}")

print(f"✅ Database Wajah Siap! Total: {len(known_face_names)} orang\n")

# =====================================================================
# 2. INISIALISASI TEXT-TO-SPEECH
# =====================================================================
engine = pyttsx3.init()
engine.setProperty('rate', 150)

def speak_warning(text):
    """Fungsi untuk memberikan peringatan audio"""
    try:
        engine.say(text)
        engine.runAndWait()
    except Exception as e:
        print(f"⚠️  Error audio: {e}")

# =====================================================================
# 3. FUNGSI LOGGING PELANGGARAN
# =====================================================================
def log_violation(worker_id, violation_str):
    """Simpan pelanggaran ke file JSON dengan timestamp dan lokasi"""
    now = datetime.now()
    timestamp_str = now.strftime("%Y-%m-%d %H:%M:%S")
    
    log_entry = {
        "timestamp": timestamp_str,
        "worker_id": worker_id,
        "location": LOCATION,
        "violation": violation_str
    }
    
    # Baca log yang sudah ada atau buat list baru
    logs = []
    if os.path.exists(LOG_FILE):
        try:
            with open(LOG_FILE, "r") as f:
                logs = json.load(f)
        except:
            logs = []
    
    logs.append(log_entry)
    with open(LOG_FILE, "w") as f:
        json.dump(logs, f, indent=2)
    
    print(f"📝 Log pelanggaran: {log_entry}")

# =====================================================================
# 4. VARIABEL GLOBAL
# =====================================================================
violation_tracker = {}
last_warning_time = {}
last_log_time = {}          # Untuk mencegah duplikat log per pekerja dalam 60 detik
frame_count = 0
cached_person = "UNKNOWN"
cached_face_box = None
running = True
fps_values = deque(maxlen=30)   # Untuk rata-rata FPS

# =====================================================================
# 5. GUI TKINTER
# =====================================================================
class K3DetectorApp:
    def __init__(self, root):
        self.root = root
        self.root.title("🛡️  Sistem Deteksi K3 Terintegrasi - Desktop")
        self.root.geometry("1000x750")
        self.root.configure(bg="#1e1e1e")
        
        # Variabel toggle (checkbox)
        self.wajib_helm = tk.BooleanVar(value=True)
        self.wajib_rompi = tk.BooleanVar(value=True)
        self.wajib_kacamata = tk.BooleanVar(value=True)
        self.enable_audio = tk.BooleanVar(value=True)
        
        self.setup_ui()
        self.cap = cv2.VideoCapture(1)   # Ganti indeks jika perlu
        
        if not self.cap.isOpened():
            print("❌ Tidak bisa mengakses webcam!")
        
        self.camera_thread = threading.Thread(target=self.run_detection_loop, daemon=True)
        self.camera_thread.start()
        
        self.root.protocol("WM_DELETE_WINDOW", self.on_closing)
    
    def setup_ui(self):
        """Setup user interface"""
        # Header
        header_frame = tk.Frame(self.root, bg="#d32f2f", height=60)
        header_frame.pack(fill=tk.X)
        header_label = tk.Label(
            header_frame, 
            text="🛡️  SISTEM DETEKSI K3 TERINTEGRASI", 
            bg="#d32f2f", 
            fg="white",
            font=("Arial", 16, "bold"),
            pady=10
        )
        header_label.pack()
        
        # Control Panel
        control_frame = tk.LabelFrame(
            self.root, 
            text="⚙️  PANEL KONTROL", 
            bg="#2a2a2a", 
            fg="white",
            font=("Arial", 10, "bold"),
            padx=15,
            pady=10
        )
        control_frame.pack(fill=tk.X, padx=10, pady=10)
        
        # Checkboxes untuk toggles
        checkboxes_frame = tk.Frame(control_frame, bg="#2a2a2a")
        checkboxes_frame.pack(fill=tk.X, pady=5)
        
        cb_helm = tk.Checkbutton(
            checkboxes_frame,
            text="🪖 Wajib Helm",
            variable=self.wajib_helm,
            bg="#2a2a2a",
            fg="white",
            selectcolor="#2a2a2a",
            activebackground="#2a2a2a",
            activeforeground="white",
            font=("Arial", 10)
        )
        cb_helm.pack(side=tk.LEFT, padx=10)
        
        cb_rompi = tk.Checkbutton(
            checkboxes_frame,
            text="🦺 Wajib Rompi",
            variable=self.wajib_rompi,
            bg="#2a2a2a",
            fg="white",
            selectcolor="#2a2a2a",
            activebackground="#2a2a2a",
            activeforeground="white",
            font=("Arial", 10)
        )
        cb_rompi.pack(side=tk.LEFT, padx=10)
        
        cb_kacamata = tk.Checkbutton(
            checkboxes_frame,
            text="🥽 Wajib Kacamata",
            variable=self.wajib_kacamata,
            bg="#2a2a2a",
            fg="white",
            selectcolor="#2a2a2a",
            activebackground="#2a2a2a",
            activeforeground="white",
            font=("Arial", 10)
        )
        cb_kacamata.pack(side=tk.LEFT, padx=10)
        
        # Audio toggle
        cb_audio = tk.Checkbutton(
            checkboxes_frame,
            text="🔊 Aktifkan Audio",
            variable=self.enable_audio,
            bg="#2a2a2a",
            fg="white",
            selectcolor="#2a2a2a",
            activebackground="#2a2a2a",
            activeforeground="white",
            font=("Arial", 10)
        )
        cb_audio.pack(side=tk.LEFT, padx=10)
        
        # Video display
        self.video_label = tk.Label(self.root, bg="black")
        self.video_label.pack(padx=10, pady=10, fill=tk.BOTH, expand=True)
        
        # Status bar
        self.status_bar = tk.Label(
            self.root,
            text="🟢 Sistem Berjalan",
            bg="#2e7d32",
            fg="white",
            font=("Arial", 10, "bold"),
            pady=5
        )
        self.status_bar.pack(fill=tk.X)
    
    def run_detection_loop(self):
        """Loop utama deteksi (berjalan di thread terpisah)"""
        global running, violation_tracker, last_warning_time, last_log_time
        global frame_count, cached_person, cached_face_box, fps_values
        
        kelas_fokus = ["Hardhat", "NO-Hardhat", "Safety Vest", "NO-Safety Vest", "Goggles", "NO-Goggles", "Person"]
        prev_time = time.time()
        
        while running:
            ret, frame = self.cap.read()
            if not ret:
                print("❌ Gagal membaca frame dari webcam")
                break
            
            frame = cv2.resize(frame, (800, 600))
            frame_count += 1
            
            # --- HITUNG FPS ---
            curr_time = time.time()
            dt = curr_time - prev_time
            prev_time = curr_time
            if dt > 0:
                fps = 1.0 / dt
                fps_values.append(fps)
            avg_fps = sum(fps_values) / len(fps_values) if fps_values else 0
            
            # --- PEMETAAN ATURAN DARI TOGGLE ---
            critical_violations = []
            if self.wajib_helm.get():
                critical_violations.append("NO-Hardhat")
            if self.wajib_rompi.get():
                critical_violations.append("NO-Safety Vest")
            if self.wajib_kacamata.get():
                critical_violations.append("NO-Goggles")
            
            # --- JALUR 1: FACE RECOGNITION (DEEPFACE ARCFACE) ---
            if frame_count % 5 == 0 or cached_person == "UNKNOWN":
                try:
                    face_objs = DeepFace.represent(
                        img_path=frame, 
                        model_name="ArcFace", 
                        detector_backend="opencv", 
                        enforce_detection=True
                    )
                    for face in face_objs:
                        embedding = face["embedding"]
                        area = face["facial_area"]
                        cached_face_box = (area['x'], area['y'], area['w'], area['h'])
                        
                        min_dist = 1.0
                        best_match = "UNKNOWN"
                        for i, known_emb in enumerate(known_face_encodings):
                            dist = cosine(embedding, known_emb)
                            if dist < min_dist:
                                min_dist = dist
                                best_match = known_face_names[i]
                        
                        if min_dist < 0.60:
                            cached_person = f"{best_match} ({((1-min_dist)*100):.1f}%)"
                        else:
                            cached_person = "TIDAK DIKENAL"
                except ValueError:
                    cached_person = "TIDAK ADA ORANG"
                    cached_face_box = None
            
            # Gambar kotak wajah
            if cached_face_box:
                x, y, w, h = cached_face_box
                cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 255), 2)
                cv2.putText(frame, cached_person, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 255), 2)
            
            # --- JALUR 2: DETEKSI APD VIA YOLOv8m ---
            status_k3 = "AMAN (PATUH)"
            pelanggaran = []
            
            if model_apd is not None:
                results = model_apd(frame, conf=0.15, verbose=False)[0]
                
                for box in results.boxes:
                    x1, y1, x2, y2 = map(int, box.xyxy[0])
                    cls_name = model_apd.names[int(box.cls[0])]
                    
                    if cls_name not in kelas_fokus:
                        continue
                    
                    # Logika pewarnaan
                    if cls_name in ['NO-Hardhat', 'NO-Safety Vest', 'NO-Goggles']:
                        if cls_name in critical_violations:
                            status_k3 = "PELANGGARAN!"
                            pelanggaran.append(cls_name)
                            color = (0, 0, 255)  # MERAH
                        else:
                            color = (0, 255, 255)  # CYAN
                    elif cls_name == "Person":
                        color = (255, 0, 0)  # BIRU
                    else:
                        color = (0, 255, 0)  # HIJAU
                    
                    cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
                    cv2.putText(frame, cls_name, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)
            
            # --- JALUR 3: ANTI-FALSE ALARM LOGIC (10 DETIK) + LOGGING ---
            current_person = cached_person.split(' (')[0] if '(' in cached_person else cached_person
            display_countdown = ""
            violation_logged = False
            
            if current_person not in ["UNKNOWN", "TIDAK DIKENAL", "TIDAK ADA ORANG"] and status_k3 == "PELANGGARAN!":
                if current_person not in violation_tracker:
                    violation_tracker[current_person] = time.time()
                
                duration = time.time() - violation_tracker[current_person]
                remaining = max(0, 10 - int(duration))
                
                if remaining > 0:
                    display_countdown = f"VALIDASI: {remaining}s"
                else:
                    display_countdown = "SANKSI AKTIF!"
                    now = time.time()
                    # Audio warning (setiap 6 detik)
                    if current_person not in last_warning_time or (now - last_warning_time[current_person] > 6):
                        if self.enable_audio.get():
                            detail_bahasa = ", ".join(pelanggaran).lower()\
                                .replace("no-hardhat", "tanpa helm")\
                                .replace("no-safety vest", "tanpa rompi")\
                                .replace("no-goggles", "tanpa kacamata")
                            pesan = f"Peringatan. Bapak {current_person.lower()}, Anda terdeteksi {detail_bahasa}."
                            threading.Thread(target=speak_warning, args=(pesan,), daemon=True).start()
                        last_warning_time[current_person] = now
                    
                    # LOGGING (hanya sekali per 60 detik per pekerja)
                    if current_person not in last_log_time or (now - last_log_time[current_person] > 60):
                        violation_str = ", ".join(pelanggaran)
                        log_violation(current_person, violation_str)
                        last_log_time[current_person] = now
                        violation_logged = True
            else:
                if current_person in violation_tracker:
                    del violation_tracker[current_person]
            
            # --- JALUR 4: HUD DISPLAY (termasuk FPS) ---
            cv2.rectangle(frame, (10, 10), (440, 130), (0, 0, 0), -1)
            cv2.putText(frame, f"PEKERJA : {cached_person}", (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
            
            warna_status = (0, 255, 0) if status_k3 == "AMAN (PATUH)" else (0, 0, 255)
            cv2.putText(frame, f"STATUS  : {status_k3}", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, warna_status, 2)
            
            if pelanggaran:
                cv2.putText(frame, f"ALASAN  : {', '.join(pelanggaran)}", (20, 82), cv2.FONT_HERSHEY_SIMPLEX, 0.38, warna_status, 1)
            if display_countdown:
                cv2.putText(frame, f"TIMER   : {display_countdown}", (20, 102), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 165, 255), 2)
            
            # Tampilkan FPS (rata-rata)
            cv2.putText(frame, f"FPS: {avg_fps:.1f}", (20, 122), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 255, 255), 1)
            
            # Update GUI
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            img = Image.fromarray(frame_rgb)
            photo = ImageTk.PhotoImage(image=img)
            self.video_label.imgtk = photo
            self.video_label.configure(image=photo)
            
            # Update status bar
            status_text = "🟢 Sistem Berjalan" if status_k3 == "AMAN (PATUH)" else "🔴 PELANGGARAN TERDETEKSI!"
            self.status_bar.config(text=status_text, bg="#2e7d32" if status_k3 == "AMAN (PATUH)" else "#d32f2f")
    
    def on_closing(self):
        """Fungsi saat window ditutup"""
        global running
        running = False
        self.cap.release()
        self.root.destroy()
        print("✅ Aplikasi ditutup")

# =====================================================================
# 6. MAIN EXECUTION
# =====================================================================
if __name__ == "__main__":
    root = tk.Tk()
    app = K3DetectorApp(root)
    root.mainloop()