import cv2
from ultralytics import YOLO

model = YOLO("best.pt") 

CLASS_COLORS = {
    'helmet': (0, 255, 0),       # Hijau (Aman)
    'vest': (255, 165, 0),         # Oranye (Aman)
    'boots': (255, 0, 0),         # Biru (Aman)
    'gloves': (0, 255, 255),       # Kuning (Aman)
    'goggles': (255, 255, 0),      # Cyan (Aman)
    'no-helmet': (0, 0, 255),      # Merah (PELANGGARAN!)
    'no-vest': (0, 0, 255),        # Merah (PELANGGARAN!)
    'no-goggles': (0, 0, 255),     # Merah (PELANGGARAN!)
    'no-boots': (0, 0, 255),       # Merah (PELANGGARAN!)
    'no-gloves': (0, 0, 255),      # Merah (PELANGGARAN!)
    'person': (200, 200, 200)      # Abu-abu
}

cap = cv2.VideoCapture(0)

if not cap.isOpened():
    print("❌ Eror: Gagal membuka webcam laptop!")
    exit()

print("🚀 CORTEX-SafeZone Aktif! Tekan 'q' pada keyboard untuk keluar.")

while True:
    ret, frame = cap.read()
    if not ret:
        print("Gagal mengambil gambar dari kamera.")
        break


    results = model(frame, conf=0.25, verbose=False)[0]

    for box in results.boxes:
        x1, y1, x2, y2 = map(int, box.xyxy[0])
        cls_id = int(box.cls[0])
        conf_score = float(box.conf[0])
        class_name = model.names[cls_id]

        color = CLASS_COLORS.get(class_name, (255, 255, 255))

        cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)

        label = f"{class_name} {conf_score:.2f}"
        
        cv2.rectangle(frame, (x1, y1 - 20), (x1 + len(label)*10, y1), color, -1)
        cv2.putText(frame, label, (x1, y1 - 5), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)

    cv2.imshow("CORTEX-SafeZone | Live APD & Violation Detection", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
print("Testing selesai, sistem dimatikan.")