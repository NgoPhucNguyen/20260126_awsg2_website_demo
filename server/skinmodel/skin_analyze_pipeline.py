import cv2
import numpy as np
import mediapipe as mp
import tensorflow as tf
import json
import os
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
MODEL_PATHS = {
    'acne':              os.path.join(BASE_DIR, 'done_model', 'acne_model.tflite'),
    'wrinkles_eyes':     os.path.join(BASE_DIR, 'done_model', 'wrinkles_eyes_model.tflite'),
    'wrinkles_forehead': os.path.join(BASE_DIR, 'done_model', 'wrinkles_forehead_model.tflite'),
    'wrinkles_mouth':    os.path.join(BASE_DIR, 'done_model', 'wrinkles_mouth_model.tflite')
}
SKINTONE_JSON = os.path.join(BASE_DIR, 'skintone_constants.json')
IMG_SIZE = 300

mp_face_mesh = mp.solutions.face_mesh
face_mesh = mp_face_mesh.FaceMesh(
    static_image_mode=True,
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5
)

LANDMARKS = {
    'left_cheek':  [234, 93,  132, 58,  172],
    'right_cheek': [454, 323, 361, 288, 397]
}

# ==============================================================================
# HÀM BỔ TRỢ
# ==============================================================================
def load_tflite_model(model_path):
    interpreter = tf.lite.Interpreter(model_path=model_path)
    interpreter.allocate_tensors()
    return interpreter, interpreter.get_input_details(), interpreter.get_output_details()

def predict_tflite(img_array, model_bundle):
    interpreter, input_details, output_details = model_bundle
    # Model nhận mảng float32 đã chuẩn hóa 0-1
    img_input = np.expand_dims(img_array / 255.0, axis=0).astype(np.float32)
    interpreter.set_tensor(input_details[0]['index'], img_input)
    interpreter.invoke()
    return interpreter.get_tensor(output_details[0]['index'])[0]

def calculate_softmax_score(probs):
    values = np.array([1.0, 2.5, 5.0])
    score = float(np.sum(probs * values))
    return round(float(np.clip(score, 1.0, 5.0)), 2)

def get_landmark_px(landmarks, indices, img_w, img_h):
    return [(int(landmarks[i].x * img_w), int(landmarks[i].y * img_h)) for i in indices]

def crop_by_landmarks(img, landmarks, indices, img_w, img_h, padding=0.15):
    pts = get_landmark_px(landmarks, indices, img_w, img_h)
    xs, ys = [p[0] for p in pts], [p[1] for p in pts]
    bw, bh = max(xs)-min(xs), max(ys)-min(ys)
    x1 = max(0,     min(xs) - int(bw * padding))
    y1 = max(0,     min(ys) - int(bh * padding))
    x2 = min(img_w, max(xs) + int(bw * padding))
    y2 = min(img_h, max(ys) + int(bh * padding))
    return img[y1:y2, x1:x2]

def get_skintone_from_landmarks(img_bgr, landmarks, img_w, img_h, json_path, debug_mode=False):
    if not os.path.exists(json_path):
        return {"error": "JSON not found"}

    with open(json_path, 'r') as f:
        levels = json.load(f)

    img_lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)

    def get_cheek_pixels(indices):
        pts = get_landmark_px(landmarks, indices, img_w, img_h)
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        x1, x2 = max(0, min(xs)-20), min(img_w, max(xs)+20)
        y1, y2 = max(0, min(ys)-20), min(img_h, max(ys)+20)
        roi = img_lab[y1:y2, x1:x2]
        return roi.reshape(-1, 3) if roi.size > 0 else np.zeros((1, 3))

    all_px  = np.vstack([
        get_cheek_pixels(LANDMARKS['left_cheek']),
        get_cheek_pixels(LANDMARKS['right_cheek'])
    ])
    raw = np.mean(all_px, axis=0)
    avg_lab = np.array([raw[0]/255.0*100.0, raw[1]-128.0, raw[2]-128.0])

    if debug_mode:
        print(f"\n🎨 LAB sau WB - norm: L={avg_lab[0]:.1f} a={avg_lab[1]:.1f} b={avg_lab[2]:.1f}", file=sys.stderr)
        if avg_lab[0] < 30 or avg_lab[0] > 80:
            print(f"⚠️  L={avg_lab[0]:.1f} ngoài vùng da bình thường!", file=sys.stderr)

    dists = {}
    for key, item in levels.items():
        target = np.array([item['L'], item['a'], item['b']])
        dists[int(key)] = float(np.sqrt(np.sum((target - avg_lab)**2)))

    sorted_lvls = sorted(dists, key=dists.get)
    l_near, l_sec = sorted_lvls[0], sorted_lvls[1]
    d_near, d_sec = dists[l_near], dists[l_sec]
    total = d_near + d_sec + 1e-6
    score = (l_near * d_sec + l_sec * d_near) / total

    max_level = float(max(levels.keys(), key=int))
    score = float(np.clip(score, 1.0, max_level))

    flipped = round(max_level - score + 1.0, 2)
    return flipped

def gray_world_wb(img):
    img_f = img.astype(np.float32)
    g_mean = np.mean(img_f[:, :, 1])
    s_b = g_mean / (np.mean(img_f[:, :, 0]) + 1e-6)
    s_r = g_mean / (np.mean(img_f[:, :, 2]) + 1e-6)
    img_f[:, :, 0] = np.clip(img_f[:, :, 0] * s_b, 0, 255)
    img_f[:, :, 2] = np.clip(img_f[:, :, 2] * s_r, 0, 255)
    return img_f.astype(np.uint8)

# ==============================================================================
# PIPELINE CHÍNH (Tích hợp Debug)
# ==============================================================================
def run_skin_pipeline(image_path, debug_mode=False):
    debug_dir = os.path.join(BASE_DIR, "debug_output")
    if debug_mode:
        os.makedirs(debug_dir, exist_ok=True)
        print("🚀 Bắt đầu phân tích hình ảnh (Có Debug)...", file=sys.stderr)

    full_img = cv2.imread(image_path)
    if full_img is None: return {"error": "File not found"}
    full_img = gray_world_wb(full_img)
    img_h, img_w, _ = full_img.shape
    
    mesh_results = face_mesh.process(cv2.cvtColor(full_img, cv2.COLOR_BGR2RGB))
    if not mesh_results.multi_face_landmarks:
        if debug_mode: print("❌ FaceMesh: Không tìm thấy mặt!", file=sys.stderr)
        return {"error": "No face detected"}

    landmarks = mesh_results.multi_face_landmarks[0].landmark
    
    # ── [DEBUG] VẼ TỌA ĐỘ ─────────────────────────────
    if debug_mode:
        print("✅ FaceMesh: Đã bắt được khuôn mặt", file=sys.stderr)
        debug_full = full_img.copy()
        for i in range(len(landmarks)):
            px = int(landmarks[i].x * img_w)
            py = int(landmarks[i].y * img_h)
            cv2.circle(debug_full, (px, py), 1, (0, 255, 0), -1)
        cv2.imwrite(os.path.join(debug_dir, "00_overview_landmarks.jpg"), debug_full)
        print("📸 Đã lưu: 00_overview_landmarks.jpg", file=sys.stderr)

    # ── CẮT ẢNH ───────────────────────────────────────
    all_pts = [(int(lm.x*img_w), int(lm.y*img_h)) for lm in landmarks]
    xs, ys  = [p[0] for p in all_pts], [p[1] for p in all_pts]
    face_crop = full_img[max(0,min(ys)-20):min(img_h,max(ys)+20),
                         max(0,min(xs)-20):min(img_w,max(xs)+20)]

    crops = {
        'acne':              face_crop,
        'wrinkles_forehead': crop_by_landmarks(full_img, landmarks, [10,54,284,109,338,67,297], img_w, img_h, 0.1),
        'wrinkles_eyes':     crop_by_landmarks(full_img, landmarks, [33,133,362,263,70,300,159,386], img_w, img_h, 0.2),
        'wrinkles_mouth':    crop_by_landmarks(full_img, landmarks, [61,291,17,0,37,267,84,314], img_w, img_h, 0.2),
    }

    final_results = {}
    
    # ── CHẠY MODEL ────────────────────────────────────
    for key, model_path in MODEL_PATHS.items():
        if not os.path.exists(model_path): continue
        crop = crops.get(key)
        if crop is None or crop.size == 0:
            if debug_mode: print(f"⚠️  {key}: crop rỗng", file=sys.stderr)
            continue
            
        model_bundle = load_tflite_model(model_path)
        
        # Tiền xử lý: Ép khung 300x300 và đổi sang RGB
        resized_crop = cv2.resize(crop, (IMG_SIZE, IMG_SIZE), interpolation=cv2.INTER_LANCZOS4)
        crop_rgb     = cv2.cvtColor(resized_crop, cv2.COLOR_BGR2RGB)
        
        # ── [DEBUG] LƯU ẢNH CHUẨN ĐẦU VÀO MODEL ────────
        if debug_mode:
            # Lưu lại đúng tấm ảnh `resized_crop` (ảnh gốc BGR đã resize)
            # Đây chính xác 100% là hình hài mà model đang nhìn thấy
            cv2.imwrite(os.path.join(debug_dir, f"01_model_input_{key}.jpg"), resized_crop)
            print(f"📸 Đã lưu Model Input: {key} (Size chuẩn: {IMG_SIZE}x{IMG_SIZE})", file=sys.stderr)

        probs = predict_tflite(crop_rgb, model_bundle)
        final_results[key] = {
            "score":      calculate_softmax_score(probs),
            "confidence": round(float(np.max(probs)), 2)
        }

    # ── ĐO MÀU DA ─────────────────────────────────────
    final_results['skintone'] = get_skintone_from_landmarks(
        full_img, landmarks, img_w, img_h, SKINTONE_JSON, debug_mode
    )
    
    if debug_mode:
        print("✅ Phân tích hoàn tất!\n", file=sys.stderr)
        
    return final_results

# ==============================================================================
# CHẠY TỪ NODEJS
# ==============================================================================
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Thiếu đường dẫn ảnh"}))
        sys.exit(1)

    image_path = sys.argv[1]
    if not os.path.exists(image_path):
        print(json.dumps({"error": "Không tìm thấy file ảnh"}))
        sys.exit(1)

    # Tắt log thừa của TensorFlow
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'

    # Kiểm tra cờ --debug từ NodeJS
    DEBUG_MODE = "--debug" in sys.argv 

    # Gọi hàm duy nhất (Vừa phân tích, vừa lưu ảnh debug nếu được yêu cầu)
    output = run_skin_pipeline(image_path, debug_mode=DEBUG_MODE)

    # In ra stdout DUY NHẤT một dòng JSON để NodeJS đọc
    print(json.dumps(output, ensure_ascii=False))