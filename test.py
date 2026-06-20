from IPython.display import display, Javascript
from google.colab.output import eval_js
import cv2
import numpy as np
import PIL.Image
import io
import base64
import os
import time
import json
from scipy.spatial.distance import cosine
from ultralytics import YOLO
from deepface import DeepFace

# =====================================================================
# 1. SETUP MODEL YOLOv8m HUGGING FACE & DATABASE WAJAH ARCFACE
# =====================================================================
print("⏳ Mengunduh dan memuat Model YOLOv8m PPE dari Hugging Face...")
# Jika nanti mau balik ke model buatanmu sendiri, cukup ganti jalur di bawah ini jadi: YOLO('best.pt')
model_apd = YOLO("best3.pt")
print("✅ Model YOLOv8m Siap!")

known_face_encodings = []
known_face_names = []

db_path = "karyawan_db"
if not os.path.exists(db_path):
    os.makedirs(db_path)

print("⏳ Mengekstrak Database Wajah menggunakan model ArcFace... Mohon tunggu.")
for file_name in os.listdir(db_path):
    if file_name.endswith((".jpg", ".png", ".jpeg")):
        name = os.path.splitext(file_name)[0].upper()
        image_path = os.path.join(db_path, file_name)
        try:
            res = DeepFace.represent(img_path=image_path, model_name="ArcFace", enforce_detection=False)
            if len(res) > 0:
                known_face_encodings.append(res[0]["embedding"])
                known_face_names.append(name)
        except Exception as e:
            print(f"Gagal membaca {file_name}: {e}")

print("✅ Database Wajah Siap!")

violation_tracker = {}
last_warning_time = {}
frame_count = 0
cached_person = "UNKNOWN"
cached_face_box = None

# =====================================================================
# 2. JEMBATAN WEBCAM + FRONTEND 3 TOGGLES (HELM, ROMPI, KACAMATA)
# =====================================================================
def start_webcam():
  js = Javascript('''
    window.startWebcam = async function() {
      const div = document.createElement('div');
      div.style.padding = '15px';
      div.style.background = '#1e1e1e';
      div.style.color = '#fff';
      div.style.borderRadius = '8px';
      div.style.marginBottom = '10px';
      div.style.display = 'inline-block';
      div.style.fontFamily = 'Arial, sans-serif';

      const btn = document.createElement('button');
      btn.innerHTML = "🔊 AKTIFKAN AUDIO K3";
      btn.style.padding = '10px 15px';
      btn.style.backgroundColor = '#d32f2f';
      btn.style.color = 'white';
      btn.style.border = 'none';
      btn.style.borderRadius = '5px';
      btn.style.cursor = 'pointer';
      btn.style.fontWeight = 'bold';
      div.appendChild(btn);

      const toggleContainer = document.createElement('div');
      toggleContainer.style.marginTop = '15px';
      toggleContainer.style.display = 'flex';
      toggleContainer.style.gap = '15px';

      toggleContainer.innerHTML = `
        <label><input type="checkbox" id="wajib-helm" checked> 🪖 Wajib Helm</label>
        <label><input type="checkbox" id="wajib-rompi" checked> 𦚺 Wajib Rompi</label>
        <label><input type="checkbox" id="wajib-kacamata" checked> 🥽 Wajib Kacamata</label>
      `;
      div.appendChild(toggleContainer);

      const chkHelm = toggleContainer.querySelector('#wajib-helm');
      const chkRompi = toggleContainer.querySelector('#wajib-rompi');
      const chkKacamata = toggleContainer.querySelector('#wajib-kacamata');

      const video = document.createElement('video');
      video.style.display = 'block';
      video.style.marginTop = '12px';
      video.style.borderRadius = '4px';

      window.speakText = function(text) {
        const url = "https://translate.google.com/translate_tts?ie=UTF-8&tl=id&client=tw-ob&q=" + encodeURIComponent(text);
        const audio = new Audio(url);
        audio.play().catch(error => console.error(error));
      };

      btn.onclick = function() {
        window.speakText("Sistem K3 Terpadu Aktif.");
        btn.style.backgroundColor = '#2e7d32';
        btn.innerHTML = "✅ SUARA AKTIF";
      };

      const stream = await navigator.mediaDevices.getUserMedia({video: true});
      div.appendChild(video);
      video.srcObject = stream;
      await video.play();

      document.body.appendChild(div);
      google.colab.output.setIframeHeight(document.documentElement.scrollHeight, true);

      const canvas = document.createElement('canvas');
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      window.captureFrame = async function() {
        canvas.getContext('2d').drawImage(video, 0, 0);
        const paketData = {
          img: canvas.toDataURL('image/jpeg', 0.7),
          wajib_helm: chkHelm.checked,
          wajib_rompi: chkRompi.checked,
          wajib_kacamata: chkKacamata.checked
        };
        return JSON.stringify(paketData);
      };
      return "READY";
    }
    ''')
  display(js)
  eval_js('window.startWebcam()')

# =====================================================================
# 3. RUN CORE ENGINE LOOP (YOLOv8m FILTERED + ARCFACE MATCHING)
# =====================================================================
start_webcam()
display_handle = display(None, display_id=True)
print("🚀 Engine YOLOv8m & DeepFace Real-time Berjalan!")

# 🎯 FILTER KELAS: Hanya pedulikan 7 objek ini, sisanya diabaikan
kelas_fokus = ["Hardhat", "NO-Hardhat", "Safety Vest", "NO-Safety Vest", "Goggles", "NO-Goggles", "Person"]

while True:
    try:
        raw_data = eval_js('window.captureFrame()')
        if not raw_data: break

        paket = json.loads(raw_data)
        head, data = paket['img'].split(',')
        binary_data = base64.b64decode(data)
        image_np = np.frombuffer(binary_data, dtype=np.uint8)
        frame = cv2.imdecode(image_np, cv2.IMREAD_COLOR)
        if frame is None: continue

        frame_count += 1

        # --- PEMETAAN ATURAN DARI SAKELAR FRONTEND ---
        critical_violations = []
        if paket['wajib_helm']:     critical_violations.append("NO-Hardhat")
        if paket['wajib_rompi']:    critical_violations.append("NO-Safety Vest")
        if paket['wajib_kacamata']: critical_violations.append("NO-Goggles")

        # --- JALUR 1: FACE RECOGNITION (DEEPFACE ARCFACE ENGINE) ---
        if frame_count % 5 == 0 or cached_person == "UNKNOWN":
            try:
                face_objs = DeepFace.represent(img_path=frame, model_name="ArcFace", detector_backend="opencv", enforce_detection=True)
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

        if cached_face_box:
            x, y, w, h = cached_face_box
            cv2.rectangle(frame, (x, y), (x+w, y+h), (255, 0, 255), 2)
            cv2.putText(frame, cached_person, (x, y - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 0, 255), 2)

        # --- JALUR 2: DETEKSI APD VIA YOLOv8m (DENGAN FILTER & CONF 0.15) ---
        results = model_apd(frame, conf=0.15, verbose=False)[0]
        status_k3 = "AMAN (PATUH)"
        pelanggaran = []

        for box in results.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            cls_name = model_apd.names[int(box.cls[0])]

            # Jika objek yang terdeteksi bukan bagian dari fokus kita, abaikan (buang dari layar)
            if cls_name not in kelas_fokus:
                continue

            # Logika pewarnaan kotak berdasarkan status aturan
            if cls_name in ['NO-Hardhat', 'NO-Safety Vest', 'NO-Goggles']:
                if cls_name in critical_violations:
                    status_k3 = "PELANGGARAN!"
                    pelanggaran.append(cls_name)
                    color = (0, 0, 255)  # MERAH: Pelanggaran aktif (Ditilang)
                else:
                    color = (0, 255, 255) # CYAN: Pelanggaran diabaikan (Aturan OFF)
            elif cls_name == "Person":
                color = (255, 0, 0) # BIRU: Kotak untuk keberadaan manusia
            else:
                color = (0, 255, 0) # HIJAU: Untuk objek aman (Hardhat, Safety Vest, Goggles)

            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            cv2.putText(frame, cls_name, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.5, color, 1)

        # --- JALUR 3: ANTI-FALSE ALARM LOGIC (10 DETIK) ---
        current_person = cached_person.split(' (')[0] if '(' in cached_person else cached_person
        display_countdown = ""

        # Eksekusi sanksi suara hanya jika orang teridentifikasi nyata
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
                if current_person not in last_warning_time or (now - last_warning_time[current_person] > 6):
                    # Format ucapan suara teks Bahasa Indonesia
                    detail_bahasa = ", ".join(pelanggaran).lower().replace("no-hardhat", "tanpa helm").replace("no-safety vest", "tanpa rompi").replace("no-goggles", "tanpa kacamata")

                    pesan = f"Peringatan. Bapak {current_person.lower()}, Anda terdeteksi {detail_bahasa}."
                    eval_js(f"window.speakText('{pesan}')")
                    last_warning_time[current_person] = now
        else:
            if current_person in violation_tracker:
                del violation_tracker[current_person]

        # --- JALUR 4: HUD MAIN SCREEN DISPLAY ---
        cv2.rectangle(frame, (10, 10), (440, 115), (0, 0, 0), -1)
        cv2.putText(frame, f"PEKERJA : {cached_person}", (20, 35), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)

        warna_status = (0, 255, 0) if status_k3 == "AMAN (PATUH)" else (0, 0, 255)
        cv2.putText(frame, f"STATUS  : {status_k3}", (20, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.5, warna_status, 2)

        if pelanggaran:
            cv2.putText(frame, f"ALASAN  : {', '.join(pelanggaran)}", (20, 82), cv2.FONT_HERSHEY_SIMPLEX, 0.38, warna_status, 1)
        if display_countdown:
            cv2.putText(frame, f"TIMER   : {display_countdown}", (20, 102), cv2.FONT_HERSHEY_SIMPLEX, 0.45, (0, 165, 255), 2)

        _, bbox_array = cv2.imencode('.jpeg', frame)
        res_img = PIL.Image.open(io.BytesIO(bbox_array))
        display_handle.update(res_img)
    except Exception as e:
        print(f"\n❌ Sesi kamera ditutup / Error: {e}")
        break