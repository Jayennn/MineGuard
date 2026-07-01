# ==========================================
# MINEGUARD BACKEND - HACKATHON KIC 2026
# File: main.py (FastAPI Backend Server with YOLO Vision, Face Recognition & Audio Alarm TTS)
# Run locally using: uvicorn main:app --reload --port 8000
# ==========================================

import os
import glob
import time
import subprocess
import asyncio
import random
import threading
import cv2
import numpy as np
from typing import Optional
from fastapi import FastAPI, Response, Query, Form, UploadFile, File, Request
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from ultralytics import YOLO
from pydantic import BaseModel

app = FastAPI(
    title="MineGuard HSE Command Center API",
    description="Backend API with AI Vision, Face Recognition, and Audio Alerts for Kideco Innovation Charter (KIC) 2026 Hackathon",
    version="1.2.0"
)

# Enable CORS for decoupled front-end on port 3000 or other local environments
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Ensure local directories exist
os.makedirs("faces", exist_ok=True)
os.makedirs("assets", exist_ok=True)

# Mount static files to serve registered face images
app.mount("/faces", StaticFiles(directory="faces"), name="faces")

# --- LOAD MODEL (Ultralytics YOLO) ---
try:
    model = YOLO("best.pt")
    has_model = True
    print("[YOLO] Model 'best.pt' loaded successfully.")
except Exception as e:
    has_model = False
    print(f"[YOLO] Warning: 'best.pt' not loaded ({e}). Running in high-fidelity simulation mode.")

# --- CLASS MAP ASLI ---
CLASS_MAP = {
    0: 'helmet', 
    1: 'gloves', 
    2: 'vest', 
    3: 'boots', 
    4: 'goggles', 
    5: 'none', 
    6: 'Person', 
    7: 'no_helmet', 
    8: 'no_goggle', 
    9: 'no_gloves', 
    10: 'no_boots'
}

# --- INTEGRASI FACE RECOGNITION ---
try:
    import face_recognition
    HAS_FACE_REC = True
    print("[FaceRec] face_recognition library imported successfully.")
except Exception as e:
    HAS_FACE_REC = False
    print(f"[FaceRec] Warning: face_recognition not available. Falling back to high-fidelity coordinator and database simulation: {e}")

KNOWN_FACE_ENCODINGS = []
KNOWN_FACE_METADATA = []

def load_known_faces():
    global KNOWN_FACE_ENCODINGS, KNOWN_FACE_METADATA
    if not HAS_FACE_REC:
        return
    
    KNOWN_FACE_ENCODINGS = []
    KNOWN_FACE_METADATA = []
    
    supported_exts = ["*.jpg", "*.jpeg", "*.png"]
    files = []
    for ext in supported_exts:
        files.extend(glob.glob(os.path.join("faces", ext)))
        
    for filepath in files:
        try:
            filename = os.path.basename(filepath)
            base, _ = os.path.splitext(filename)
            
            # Extract Worker ID and Name (e.g., WK-1192_Bhisma_Prayogi)
            if "_" in base:
                parts = base.split("_", 1)
                worker_id = parts[0]
                name = parts[1].replace("_", " ")
            else:
                worker_id = "WK-UNKNOWN"
                name = base.replace("_", " ")
                
            img = face_recognition.load_image_file(filepath)
            encodings = face_recognition.face_encodings(img)
            if encodings:
                KNOWN_FACE_ENCODINGS.append(encodings[0])
                KNOWN_FACE_METADATA.append({
                    "id": worker_id,
                    "name": name
                })
                print(f"[FaceRec] Loaded known face: ID={worker_id}, Name={name}")
            else:
                print(f"[FaceRec] Warning: Face not found in file {filepath}")
        except Exception as ex:
            print(f"[FaceRec] Error loading image {filepath}: {ex}")

# Load faces on startup
load_known_faces()

# --- AUDIO ALARM & SMART TEXT-TO-SPEECH (TTS) ---
try:
    from gtts import gTTS
    HAS_GTTS = True
    print("[AudioTTS] gTTS imported successfully (high-quality Google voice).")
except Exception as e:
    HAS_GTTS = False
    print(f"[AudioTTS] Warning: gTTS not available ({e}). Falling back to pyttsx3/spd-say.")

try:
    import pyttsx3
    HAS_PYTTSX3 = True
    print("[AudioTTS] pyttsx3 imported successfully.")
except Exception as e:
    HAS_PYTTSX3 = False
    print(f"[AudioTTS] Warning: pyttsx3 not available ({e}). Using printed diagnostics fallback.")

try:
    import pygame
    HAS_PYGAME = True
    pygame.mixer.init()
    print("[AudioAlarm] pygame.mixer initialized successfully.")
except Exception as e:
    HAS_PYGAME = False
    print(f"[AudioAlarm] Warning: pygame.mixer not available ({e}). Using printed diagnostics fallback.")

LAST_ALERT_TIME = 0.0
ALERT_LOCK = threading.Lock()

def speak_text(text: str):
    """Speaks warning text using gTTS (high-quality Google voice) or pyttsx3 or spd-say."""
    print(f"[SPEECH TTS SPEAKER] \"{text}\"")
    
    # 1. Try high-quality Google TTS (gTTS)
    if HAS_GTTS:
        try:
            tts = gTTS(text=text, lang='id')
            temp_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "temp_tts.mp3")
            tts.save(temp_path)
            
            # Play in background and wait for completion
            proc = subprocess.Popen([
                "ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", temp_path
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            proc.wait()
            
            # Cleanup temp file
            try:
                os.remove(temp_path)
            except Exception:
                pass
            return
        except Exception as e:
            print(f"[SPEECH TTS gTTS ERROR] gTTS speech failed: {e}")

    # 2. Try pyttsx3 (local robotic)
    if HAS_PYTTSX3:
        try:
            engine = pyttsx3.init()
            engine.setProperty('rate', 150)
            engine.setProperty('volume', 1.0)
            engine.say(text)
            engine.runAndWait()
            return
        except Exception as e:
            print(f"[SPEECH TTS ERROR] engine speak failed: {e}")
    
    # 3. Fallback to system spd-say on Linux
    try:
        subprocess.run(["spd-say", "-l", "id", text], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    except Exception as e:
        print(f"[SPEECH TTS FALLBACK ERROR] spd-say failed: {e}")

def play_alarm_mjpeg():
    """Plays alarm.mp3 for exactly 2 seconds and stops."""
    # Find alarm.mp3 path dynamically
    script_dir = os.path.dirname(os.path.abspath(__file__))
    possible_paths = [
        os.path.join(script_dir, "assets", "alarm.mp3"),
        os.path.join(script_dir, "..", "assets", "alarm.mp3"),
        "assets/alarm.mp3"
    ]
    alarm_path = None
    for p in possible_paths:
        if os.path.exists(p):
            alarm_path = p
            break
            
    if not alarm_path:
        print("[ALARM AUDIO WARNING] File alarm.mp3 not found in any expected location.")
        time.sleep(2.0)
        return

    print(f"[ALARM AUDIO SPEAKER] Playing {alarm_path} for 2.0 seconds...")
    played_via_pygame = False
    
    if HAS_PYGAME:
        try:
            pygame.mixer.music.load(alarm_path)
            pygame.mixer.music.play(-1)
            played_via_pygame = True
        except Exception as e:
            print(f"[ALARM AUDIO ERROR] pygame playback failed: {e}")
            
    if played_via_pygame:
        time.sleep(2.0)
        try:
            pygame.mixer.music.stop()
            print("[ALARM AUDIO STOP] Stopped alarm.mp3 via pygame.")
        except Exception as e:
            pass
    else:
        # Fallback to ffplay on Linux
        try:
            proc = subprocess.Popen([
                "ffplay", "-nodisp", "-autoexit", "-loglevel", "quiet", alarm_path
            ], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
            time.sleep(2.0)
            proc.terminate()
            proc.wait()
            print("[ALARM AUDIO STOP] Stopped alarm.mp3 via ffplay.")
        except Exception as e:
            print(f"[ALARM AUDIO FALLBACK ERROR] ffplay playback failed: {e}")
            time.sleep(2.0)

def trigger_audio_alert_thread(worker_id: str, name: str, is_unknown: bool):
    """Triggers non-blocking warning sequence in a background thread with 5s cooldown."""
    global LAST_ALERT_TIME
    with ALERT_LOCK:
        now = time.time()
        if now - LAST_ALERT_TIME < 5.0:
            return
        LAST_ALERT_TIME = now
        
    def worker():
        if is_unknown:
            # Unknown Face Path
            play_alarm_mjpeg()
            speak_text("Peringatan Terdeteksi Pelanggaran APD")
        else:
            # Recognized Face Path
            speak_text(f"Peringatan {name} terdeteksi pelanggaran APD")
            
    t = threading.Thread(target=worker, daemon=True)
    t.start()

# --- GLOBAL STATIC COMPLIANCE DATA ---
DASHBOARD_METRICS = {
    "violations_today": 47,
    "violations_today_percentage": "+12% vs yesterday",
    "violations_this_month": 798,
    "violations_this_month_percentage": "-4.8% vs last month",
    "workers_detected_this_month": 1862,
    "workers_detected_percentage": "-10% vs last month"
}

TOP_VIOLATIONS_LOCATION = [
    {"rank": 1, "site": "Pit B", "severity": "Critical", "cases": 412, "percentage": 32.1},
    {"rank": 2, "site": "Workshop", "severity": "Critical", "cases": 210, "percentage": 28.8},
    {"rank": 3, "site": "Pit A", "severity": "Medium", "cases": 186, "percentage": 10.8},
    {"rank": 4, "site": "Loading Point", "severity": "Low", "cases": 50, "percentage": 9.8}
]

SHIFTS_METRICS = [
    {"shift": "Morning", "time_range": "06.00 - 14.00", "cases": 412, "percentage": 32.1},
    {"shift": "Afternoon", "time_range": "14.00 - 22.00", "cases": 578, "percentage": 45.0},
    {"shift": "Night", "time_range": "22.00 - 06.00", "cases": 270, "percentage": 21.9}
]

PPE_RANKINGS = [
    {"type": "No Safety Helmet", "count": 412, "percentage": 32.1, "color": "#E30613"},
    {"type": "No Safety Goggles", "count": 210, "percentage": 28.8, "color": "#A855F7"},
    {"type": "No Safety Boots", "count": 186, "percentage": 10.8, "color": "#3B82F6"},
    {"type": "No Safety Vest", "count": 50, "percentage": 9.8, "color": "#10B981"}
]

HOURLY_TREND = [
    {"hour": "00.00", "count": 35}, {"hour": "01.00", "count": 25}, {"hour": "02.00", "count": 12},
    {"hour": "03.00", "count": 16}, {"hour": "04.00", "count": 45}, {"hour": "05.00", "count": 42},
    {"hour": "06.00", "count": 28}, {"hour": "07.00", "count": 10}, {"hour": "08.00", "count": 32},
    {"hour": "09.00", "count": 2},  {"hour": "10.00", "count": 3},  {"hour": "11.00", "count": 10},
    {"hour": "12.00", "count": 35}, {"hour": "13.00", "count": 25}, {"hour": "14.00", "count": 12},
    {"hour": "15.00", "count": 15}, {"hour": "16.00", "count": 46}, {"hour": "17.00", "count": 44},
    {"hour": "18.00", "count": 28}, {"hour": "19.00", "count": 34}, {"hour": "20.00", "count": 2},
    {"hour": "21.00", "count": 3},  {"hour": "22.00", "count": 5},  {"hour": "23.00", "count": 8},
    {"hour": "24.00", "count": 43}
]

CAMERA_REGISTRY = {
    "CAM-WS-03": {"location": "Workshop", "violations_24h": 84, "detected_24h": 108},
    "CAM-LP-05": {"location": "Pit A", "violations_24h": 32, "detected_24h": 108},
    "CAM-PB-07": {"location": "Pit B", "violations_24h": 24, "detected_24h": 48},
    "CAM-WS-01": {"location": "Workshop", "violations_24h": 24, "detected_24h": 48},
    "CAM-WS-02": {"location": "Workshop", "violations_24h": 24, "detected_24h": 48}
}

REGISTERED_WORKERS = [
    {"id": "WK-1234", "name": "Vanessa Pakan", "department": "IT & Digitalization", "position": "Manager", "status": "Active", "photoUrl": "https://api.dicebear.com/7.x/adventurer/svg?seed=Vanessa"},
    {"id": "WK-1192", "name": "Bhisma Prayogi", "department": "Safety & HSE", "position": "Safety Officer", "status": "Active", "photoUrl": "https://api.dicebear.com/7.x/adventurer/svg?seed=Bhisma"},
    {"id": "WK-3014", "name": "Gian Al Haritz", "department": "Maintenance", "position": "Technician", "status": "Active", "photoUrl": "https://api.dicebear.com/7.x/adventurer/svg?seed=Gian"},
    {"id": "WK-0872", "name": "Travis Edrick", "department": "Safety & HSE", "position": "Supervisor", "status": "Active", "photoUrl": "https://api.dicebear.com/7.x/adventurer/svg?seed=Travis"}
]

@app.get("/")
def read_root():
    return {
        "status": "Online",
        "system": "MineGuard HSE Command Center",
        "hackathon": "Kideco Innovation Charter 2026",
        "has_vision_model": has_model,
        "has_face_recognition": HAS_FACE_REC,
        "known_faces_loaded": len(KNOWN_FACE_METADATA)
    }

@app.get("/api/dashboard/metrics")
def get_metrics():
    metrics = DASHBOARD_METRICS.copy()
    if random.random() > 0.8:
        metrics["violations_today"] += 1
    return metrics

@app.get("/api/dashboard/charts")
def get_charts():
    return {
        "hourly_trend": HOURLY_TREND,
        "location_metrics": TOP_VIOLATIONS_LOCATION,
        "shift_metrics": SHIFTS_METRICS,
        "ppe_rankings": PPE_RANKINGS
    }

@app.get("/api/workers")
def get_workers():
    return REGISTERED_WORKERS

@app.post("/api/workers")
async def register_worker(
    id: str = Form(...),
    name: str = Form(...),
    department: str = Form(...),
    position: str = Form(...),
    status: str = Form(...),
    photo: Optional[UploadFile] = File(None)
):
    name_with_underscore = name.replace(" ", "_")
    filename = f"{id}_{name_with_underscore}.jpg"
    filepath = os.path.join("faces", filename)
    
    photo_url = f"https://api.dicebear.com/7.x/adventurer/svg?seed={name.replace(' ', '')}"
    
    if photo:
        try:
            content = await photo.read()
            with open(filepath, "wb") as f:
                f.write(content)
            photo_url = f"http://localhost:8000/faces/{filename}"
            print(f"[Backend] Saved face image to {filepath}")
        except Exception as e:
            print(f"[Backend] Error writing photo file: {e}")

    # Check if worker already exists to update it, or prepend a new one
    global REGISTERED_WORKERS
    existing_worker = next((w for w in REGISTERED_WORKERS if w["id"] == id), None)
    
    worker_data = {
        "id": id,
        "name": name,
        "department": department,
        "position": position,
        "status": status,
        "photoUrl": photo_url
    }
    
    if existing_worker:
        # Update existing worker
        REGISTERED_WORKERS = [worker_data if w["id"] == id else w for w in REGISTERED_WORKERS]
    else:
        # Prepend new worker
        REGISTERED_WORKERS.insert(0, worker_data)
        
    # Reload known faces in real-time!
    load_known_faces()
    
    return {"message": "Pekerja berhasil didaftarkan!", "worker": worker_data}

@app.delete("/api/workers/{worker_id}")
def delete_worker(worker_id: str):
    global REGISTERED_WORKERS
    
    # Check if worker exists
    exists = any(w["id"] == worker_id for w in REGISTERED_WORKERS)
    if not exists:
        return {"error": f"Worker ID {worker_id} tidak ditemukan"}, 404
        
    # Search for files starting with worker_id in the faces/ folder
    deleted_files = []
    search_pattern = os.path.join("faces", f"{worker_id}_*")
    for fpath in glob.glob(search_pattern):
        try:
            os.remove(fpath)
            deleted_files.append(fpath)
            print(f"[Backend] Deleted image file: {fpath}")
        except Exception as e:
            print(f"[Backend] Error deleting file {fpath}: {e}")
            
    # Remove from list in memory
    REGISTERED_WORKERS = [w for w in REGISTERED_WORKERS if w["id"] != worker_id]
    
    # Reload known faces in real-time!
    load_known_faces()
    
    return {
        "message": f"Worker ID {worker_id} berhasil dihapus",
        "deleted_images": deleted_files
    }

# --- CCTV LIVE STREAM GENERATOR (YOLO, FACE REC & INVERSE LOGIC) ---

async def generate_video_feed(
    request: Request,
    camera_id: str
):
    """
    Simulates or reads camera stream, runs YOLO predictions, matches faces, 
    and evaluates compliance with Inverse Logic. High reliability guaranteed!
    """
    if camera_id == "STAGE-LIVE":
        cap = cv2.VideoCapture(0)
    else:
        cap = cv2.VideoCapture("assets/simulasi_tambang.mp4")

    use_simulation = False
    if not cap.isOpened():
        use_simulation = True
        print(f"[{camera_id}] Camera source not accessible. Falling back to high-fidelity site simulation.")

    COLOR_MAP = {
        'Person_OK': (76, 175, 80),    # Emerald Green (Light theme friendly)
        'helmet': (136, 255, 0),       # Neon Green
        'vest': (0, 255, 255),         # Yellow
        'boots': (255, 217, 0),        # Cyan
        'goggles': (240, 32, 160),     # Purple
        'gloves': (255, 255, 255),     # White
        'warning': (19, 6, 227)        # Bright Crimson Red
    }

    t = 0
    box_x = 100
    box_y = 130
    dir_x = 2
    dir_y = 1

    try:
        while True:
            if await request.is_disconnected():
                print(f"[{camera_id}] Client disconnected (request state).")
                break
            
            # Read rules dynamically on every frame from global settings
            req_helmet = COMPLIANCE_SETTINGS["req_helmet"]
            req_vest = COMPLIANCE_SETTINGS["req_vest"]
            req_boots = COMPLIANCE_SETTINGS["req_boots"]
            req_goggles = COMPLIANCE_SETTINGS["req_goggles"]
            req_gloves = COMPLIANCE_SETTINGS["req_gloves"]

            frame = None
            if not use_simulation:
                ret, r_frame = cap.read()
                if ret:
                    frame = cv2.resize(r_frame, (480, 270))
                else:
                    if camera_id != "STAGE-LIVE":
                        cap.set(cv2.CAP_PROP_POS_FRAMES, 0)
                        ret, r_frame = cap.read()
                        if ret:
                            frame = cv2.resize(r_frame, (480, 270))
                        else:
                            use_simulation = True
                    else:
                        use_simulation = True

            if use_simulation or frame is None:
                # Custom High-Fidelity Mine Site Simulation background (Clean blueprint style scaled to 480x270)
                frame = np.zeros((270, 480, 3), dtype=np.uint8)
                for y in range(270):
                    # Elegant Slate-White gradient
                    frame[y, :] = [245 - int(y/4), 247 - int(y/5), 250 - int(y/6)]
                
                # Radar grids
                for i in range(0, 480, 40):
                    cv2.line(frame, (i, 0), (i, 270), (225, 230, 235), 1)
                for j in range(0, 270, 40):
                    cv2.line(frame, (0, j), (480, j), (225, 230, 235), 1)
                
                # Equipment layout shapes
                cv2.rectangle(frame, (80, 180), (220, 280), (210, 215, 225), -1)
                cv2.rectangle(frame, (80, 180), (220, 280), (180, 185, 195), 1)
                cv2.putText(frame, "HEAVY LOADER EQUIP_PB07", (90, 205), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (120, 130, 140), 1)

            persons = []
            ppes = []

            # 1. Real YOLO Processing
            if not use_simulation and has_model:
                results = model.predict(frame, conf=0.40, verbose=False)
                boxes = results[0].boxes
                
                for box in boxes:
                    cls_id = int(box.cls[0].item())
                    conf = float(box.conf[0].item())
                    xyxy = box.xyxy[0].tolist()
                    
                    if cls_id == 6:  # Person
                        if conf >= 0.70:
                            persons.append({
                                "xyxy": xyxy,
                                "conf": conf,
                                "label": "Worker"
                            })
                    elif cls_id in [0, 1, 2, 3, 4]:
                        ppes.append({
                            "cls_id": cls_id,
                            "name": CLASS_MAP[cls_id],
                            "xyxy": xyxy,
                            "conf": conf
                        })
            else:
                # 2. Simulated High-Fidelity Motion Environment
                box_x += dir_x
                box_y += dir_y
                if box_x < 50 or box_x > 450: dir_x *= -1
                if box_y < 100 or box_y > 200: dir_y *= -1

                # Person 1 (Bhisma Prayogi - Enrolled Worker scaled to 480x270)
                persons.append({
                    "xyxy": [300, 75, 390, 232],
                    "conf": 0.94,
                    "worker_id": "WK-1192",
                    "worker_name": "Bhisma Prayogi"
                })
                # Person 1 PPE compliance boxes
                ppes.append({"cls_id": 0, "name": "helmet", "xyxy": [326, 78, 363, 105], "conf": 0.98})
                ppes.append({"cls_id": 2, "name": "vest", "xyxy": [311, 108, 378, 176], "conf": 0.94})
                ppes.append({"cls_id": 3, "name": "boots", "xyxy": [318, 206, 371, 231], "conf": 0.91})
                ppes.append({"cls_id": 4, "name": "goggles", "xyxy": [331, 101, 358, 112], "conf": 0.89})
 
                # Person 2 (Unknown Worker / Moving Box scaled to 480x270)
                s_box_x = int(box_x * 0.75)
                s_box_y = int(box_y * 0.75)
                persons.append({
                    "xyxy": [s_box_x, s_box_y, s_box_x + 82, s_box_y + 142],
                    "conf": 0.88,
                    "worker_id": "Unknown",
                    "worker_name": "Unknown"
                })
                # Person 2 missing vest, goggles, and gloves
                ppes.append({"cls_id": 0, "name": "helmet", "xyxy": [s_box_x + 22, s_box_y + 3, s_box_x + 60, s_box_y + 26], "conf": 0.93})
                ppes.append({"cls_id": 3, "name": "boots", "xyxy": [s_box_x + 15, s_box_y + 120, s_box_x + 67, s_box_y + 138], "conf": 0.89})

            # Calculate centers of PPE detections
            for ppe in ppes:
                px1, py1, px2, py2 = ppe["xyxy"]
                ppe["center_x"] = (px1 + px2) / 2.0
                ppe["center_y"] = (py1 + py2) / 2.0

            # Draw positive PPE detections (disabled for cleaner video stream layout)
            # for ppe in ppes:
            #     px1, py1, px2, py2 = [int(v) for v in ppe["xyxy"]]
            #     color = COLOR_MAP.get(ppe["name"], (100, 100, 100))
            #     cv2.rectangle(frame, (px1, py1), (px2, py2), color, 1)
            #     cv2.putText(frame, f"{ppe['name']} {int(ppe['conf']*100)}%", (px1, py1 - 3), cv2.FONT_HERSHEY_SIMPLEX, 0.3, color, 1, cv2.LINE_AA)

            # Evaluate compliance for each Person
            for i, person in enumerate(persons):
                x1, y1, x2, y2 = [int(v) for v in person["xyxy"]]
                
                # Filter PPE inside this person
                person_ppes = []
                for ppe in ppes:
                    cx, cy = ppe["center_x"], ppe["center_y"]
                    if x1 <= cx <= x2 and y1 <= cy <= y2:
                        person_ppes.append(ppe)

                has_helmet = any(p["cls_id"] == 0 for p in person_ppes)
                has_gloves = any(p["cls_id"] == 1 for p in person_ppes)
                has_vest = any(p["cls_id"] == 2 for p in person_ppes)
                has_boots = any(p["cls_id"] == 3 for p in person_ppes)
                has_goggles = any(p["cls_id"] == 4 for p in person_ppes)

                # Evaluate checklist violations dynamically
                violations = []
                if req_helmet and not has_helmet:
                    violations.append("NO HELMET")
                if req_vest and not has_vest:
                    violations.append("NO VEST")
                if req_boots and not has_boots:
                    violations.append("NO BOOTS")
                if req_goggles and not has_goggles:
                    violations.append("NO GOGGLES")
                if req_gloves and not has_gloves:
                    violations.append("NO GLOVES")

                # IDENTIFY IDENTITY VIA ACTUAL FACE RECOGNITION (OR SIMULATION PATH)
                worker_id = person.get("worker_id", "Unknown")
                worker_name = person.get("worker_name", "Unknown")
                is_unknown_worker = (worker_id == "Unknown" or worker_name == "Unknown")

                if HAS_FACE_REC and not use_simulation:
                    # Crop person box with safety padding around the head/sides to avoid cutting off face details
                    h_box = y2 - y1
                    w_box = x2 - x1
                    crop_y1 = max(y1 - int(h_box * 0.20), 0)
                    crop_y2 = min(y2 + int(h_box * 0.05), 180)
                    crop_x1 = max(x1 - int(w_box * 0.15), 0)
                    crop_x2 = min(x2 + int(w_box * 0.15), 320)
                    
                    crop = frame[crop_y1:crop_y2, crop_x1:crop_x2]
                    if crop.size > 0:
                        rgb_crop = cv2.cvtColor(crop, cv2.COLOR_BGR2RGB)
                        face_locs = face_recognition.face_locations(rgb_crop)
                        if face_locs:
                            face_encs = face_recognition.face_encodings(rgb_crop, face_locs)
                            if face_encs:
                                matches = face_recognition.compare_faces(KNOWN_FACE_ENCODINGS, face_encs[0], tolerance=0.6)
                                if True in matches:
                                    match_idx = matches.index(True)
                                    worker_id = KNOWN_FACE_METADATA[match_idx]["id"]
                                    worker_name = KNOWN_FACE_METADATA[match_idx]["name"]
                                    is_unknown_worker = False

                # DRAW COMPLIANCE BOX
                if len(violations) == 0:
                    border_color = COLOR_MAP['Person_OK']
                    cv2.rectangle(frame, (x1, y1), (x2, y2), border_color, 1)
                    
                    tag_y = max(y1 - 15, 5)
                    cv2.rectangle(frame, (x1, tag_y), (x2, y1), border_color, -1)
                    cv2.putText(frame, f"{worker_id} (OK)", (x1 + 2, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.3, (255, 255, 255), 1, cv2.LINE_AA)
                else:
                    border_color = COLOR_MAP['warning']
                    
                    # Highlight overlay
                    overlay = frame.copy()
                    cv2.rectangle(overlay, (x1, y1), (x2, y2), border_color, -1)
                    cv2.addWeighted(overlay, 0.1, frame, 0.9, 0, frame)
                    
                    cv2.rectangle(frame, (x1, y1), (x2, y2), border_color, 1)
                    
                    tag_y = max(y1 - 15, 5)
                    cv2.rectangle(frame, (x1, tag_y), (x2, y1), border_color, -1)
                    cv2.putText(frame, f"⚠️ {worker_id}", (x1 + 2, y1 - 4), cv2.FONT_HERSHEY_SIMPLEX, 0.3, (255, 255, 255), 1, cv2.LINE_AA)
                    
                    # Draw warning list tags
                    text_y = y1 + 10
                    for violation in violations:
                        text_w = 60
                        cv2.rectangle(frame, (x2 + 2, text_y - 10), (x2 + 2 + text_w, text_y + 6), (30, 30, 30), -1)
                        cv2.rectangle(frame, (x2 + 2, text_y - 10), (x2 + 2 + text_w, text_y + 6), border_color, 1)
                        cv2.putText(frame, f"! {violation}", (x2 + 4, text_y + 2), cv2.FONT_HERSHEY_SIMPLEX, 0.25, (255, 255, 255), 1, cv2.LINE_AA)
                        text_y += 15

                    # Trigger non-blocking Audio Alert thread
                    trigger_audio_alert_thread(worker_id, worker_name, is_unknown_worker)

            # REC Indicator (disabled for cleaner video stream layout)
            # t += 1
            # if t % 20 < 10:
            #     cv2.circle(frame, (30, 30), 8, (19, 6, 227), -1)
            # cv2.putText(frame, "REC AI FEED", (48, 34), cv2.FONT_HERSHEY_SIMPLEX, 0.4, (50, 50, 50), 1, cv2.LINE_AA)
            
            # Watermarks (disabled for cleaner video stream layout)
            # cv2.rectangle(frame, (510, 15), (625, 40), (255, 255, 255), -1)
            # cv2.rectangle(frame, (510, 15), (625, 40), (200, 205, 210), 1)
            # cv2.putText(frame, camera_id, (520, 31), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (227, 6, 19), 1, cv2.LINE_AA)

            # loc_text = CAMERA_REGISTRY.get(camera_id, {"location": "Site"}).get("location", "Pit Area")
            # cv2.rectangle(frame, (480, 315), (625, 345), (255, 255, 255), -1)
            # cv2.rectangle(frame, (480, 315), (625, 345), (200, 205, 210), 1)
            # cv2.putText(frame, f"LOC: {loc_text}", (490, 333), cv2.FONT_HERSHEY_SIMPLEX, 0.35, (50, 50, 50), 1, cv2.LINE_AA)

            ret, jpeg = cv2.imencode('.jpg', frame)
            if not ret:
                continue
            
            yield (b'--frame\r\n'
                   b'Content-Type: image/jpeg\r\n\r\n' + jpeg.tobytes() + b'\r\n')
            
            await asyncio.sleep(0.04)

    except asyncio.CancelledError:
        print(f"[{camera_id}] Streaming cancelled.")
    finally:
        if not use_simulation:
            cap.release()

# Global active compliance rules settings to avoid stream reloads
COMPLIANCE_SETTINGS = {
    "req_helmet": True,
    "req_vest": True,
    "req_boots": True,
    "req_goggles": True,
    "req_gloves": False
}

class ComplianceSettingsModel(BaseModel):
    req_helmet: bool
    req_vest: bool
    req_boots: bool
    req_goggles: bool
    req_gloves: bool

@app.post("/api/cctv/settings")
def update_settings(settings: ComplianceSettingsModel):
    global COMPLIANCE_SETTINGS
    COMPLIANCE_SETTINGS = settings.dict()
    print(f"[Backend] Updated compliance rules: {COMPLIANCE_SETTINGS}")
    return {"status": "success", "settings": COMPLIANCE_SETTINGS}

@app.get("/api/cctv/stream/{camera_id}")
async def stream_cctv(
    request: Request,
    camera_id: str
):
    """Multipart MJPEG video feed stream that applies dynamic compliance check toggles."""
    return StreamingResponse(
        generate_video_feed(request, camera_id),
        media_type="multipart/x-mixed-replace; boundary=frame"
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)