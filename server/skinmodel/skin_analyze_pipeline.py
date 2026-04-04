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

# ĐỊNH NGHĨA CÁC VÙNG CẦN THIẾT
LANDMARKS = {
    'left_cheek':  [137, 234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152],
    'right_cheek': [366, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 382],
    'forehead':    [10, 338, 297, 332, 284, 251, 389, 356, 109, 67, 103, 54, 21]
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
    # CHUẨN HÓA VỀ [-1, 1] (Thường chính xác hơn cho các model phổ biến)
    img_input = np.expand_dims((img_array / 127.5) - 1.0, axis=0).astype(np.float32)
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
    # Kiểm tra vùng cắt hợp lệ (không bị quá nhỏ hoặc ra ngoài ảnh)
    if x2 <= x1 or y2 <= y1:
        return np.array([]) 
    return img[y1:y2, x1:x2]

def get_skintone_from_landmarks(img_bgr, landmarks, img_w, img_h, json_path, debug_mode=False):
    if not os.path.exists(json_path):
        return 0

    with open(json_path, 'r') as f:
        levels = json.load(f)

    # ĐO TRÊN ẢNH GỐC ĐỂ KHÔNG BỊ SAI LỆCH MÀU DA
    img_lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)

    def get_cheek_pixels(indices):
        pts = get_landmark_px(landmarks, indices, img_w, img_h)
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        x1, x2 = max(0, min(xs)-10), min(img_w, max(xs)+10)
        y1, y2 = max(0, min(ys)-10), min(img_h, max(ys)+10)
        if x2 <= x1 or y2 <= y1: return np.zeros((1, 3))
        roi = img_lab[y1:y2, x1:x2]
        return roi.reshape(-1, 3) if roi.size > 0 else np.zeros((1, 3))

    all_px  = np.vstack([
        get_cheek_pixels(LANDMARKS['left_cheek']),
        get_cheek_pixels(LANDMARKS['right_cheek'])
    ])
    
    # Dùng MEDIAN để tránh đốm sáng bóng (glare) do đèn
    raw = np.median(all_px, axis=0)
    avg_lab = np.array([raw[0]/255.0*100.0, raw[1]-128.0, raw[2]-128.0])

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
    return round(max_level - score + 1.0, 2)

# ==============================================================================
# PIPELINE CHÍNH (Đã Tích Hợp Debug Cập Nhật)
# ==============================================================================
def run_skin_pipeline(image_path, debug_mode=False):
    debug_dir = os.path.join(BASE_DIR, "debug_output")
    if debug_mode:
        os.makedirs(debug_dir, exist_ok=True)
        print("🚀 Bắt đầu phân tích (Có Debug)...", file=sys.stderr)

    # ĐỌC ẢNH GỐC (BỎ GRAY_WORLD_WB ĐỂ GIỮ NGUYÊN MÀU ĐỎ CỦA MỤN)
    full_img = cv2.imread(image_path)
    if full_img is None: return {"error": "File not found"}
    img_h, img_w, _ = full_img.shape
    
    mesh_results = face_mesh.process(cv2.cvtColor(full_img, cv2.COLOR_BGR2RGB))
    if not mesh_results.multi_face_landmarks:
        if debug_mode: print("❌ FaceMesh: Không tìm thấy mặt!", file=sys.stderr)
        return {"error": "No face detected"}

    landmarks = mesh_results.multi_face_landmarks[0].landmark
    
    if debug_mode:
        debug_full = full_img.copy()
        for i in range(len(landmarks)):
            px = int(landmarks[i].x * img_w)
            py = int(landmarks[i].y * img_h)
            cv2.circle(debug_full, (px, py), 1, (0, 255, 0), -1)
        cv2.imwrite(os.path.join(debug_dir, "00_landmarks.jpg"), debug_full)

    final_results = {}

    # ── ĐO MÀU DA ─────────────────────────────────────
    final_results['skintone'] = get_skintone_from_landmarks(
        full_img, landmarks, img_w, img_h, SKINTONE_JSON, debug_mode
    )

    # ── XỬ LÝ MỤN (MULTI-CROP THÔNG MINH) ───────────────
    # Cắt 3 vùng, có thể mặt nghiêng nên sẽ có vùng bị lỗi/trống
    acne_crops = {
        'forehead': crop_by_landmarks(full_img, landmarks, LANDMARKS['forehead'], img_w, img_h, 0.1),
        'left_cheek': crop_by_landmarks(full_img, landmarks, LANDMARKS['left_cheek'], img_w, img_h, 0.2),
        'right_cheek': crop_by_landmarks(full_img, landmarks, LANDMARKS['right_cheek'], img_w, img_h, 0.2)
    }
    
    if os.path.exists(MODEL_PATHS['acne']):
        acne_model_bundle = load_tflite_model(MODEL_PATHS['acne'])
        acne_scores = []
        
        for region_name, crop in acne_crops.items():
            # Chỉ chạy model nếu vùng cắt hợp lệ (không bị góc nghiêng che khuất)
            if crop.size > 0:
                resized = cv2.resize(crop, (IMG_SIZE, IMG_SIZE), interpolation=cv2.INTER_LANCZOS4)
                if debug_mode:
                    cv2.imwrite(os.path.join(debug_dir, f"01_acne_input_{region_name}.jpg"), resized)
                
                probs = predict_tflite(cv2.cvtColor(resized, cv2.COLOR_BGR2RGB), acne_model_bundle)
                acne_scores.append(calculate_softmax_score(probs))
        
        # Nếu bắt được vùng nào, lấy điểm TỆ NHẤT của vùng đó làm báo cáo
        if acne_scores:
            final_results['acne'] = {
                "score": min(acne_scores),
                "confidence": 0.99
            }
        else:
            # Nếu mặt quá nghiêng không cắt được chỗ nào, mặc định cho 5.0
            final_results['acne'] = {"score": 5.0, "confidence": 0.5}

    # ── XỬ LÝ LÃO HÓA ───────────────────────────────────
    wrinkle_crops = {
        'wrinkles_forehead': crop_by_landmarks(full_img, landmarks, [10,54,284,109,338,67,297], img_w, img_h, 0.1),
        'wrinkles_eyes':     crop_by_landmarks(full_img, landmarks, [33,133,362,263,70,300,159,386], img_w, img_h, 0.2),
        'wrinkles_mouth':    crop_by_landmarks(full_img, landmarks, [61,291,17,0,37,267,84,314], img_w, img_h, 0.2),
    }

    for key, crop in wrinkle_crops.items():
        if key in MODEL_PATHS and os.path.exists(MODEL_PATHS[key]):
            if crop.size > 0:
                model_bundle = load_tflite_model(MODEL_PATHS[key])
                resized = cv2.resize(crop, (IMG_SIZE, IMG_SIZE), interpolation=cv2.INTER_LANCZOS4)
                if debug_mode:
                    cv2.imwrite(os.path.join(debug_dir, f"02_wrinkle_input_{key}.jpg"), resized)
                
                probs = predict_tflite(cv2.cvtColor(resized, cv2.COLOR_BGR2RGB), model_bundle)
                final_results[key] = {
                    "score": calculate_softmax_score(probs),
                    "confidence": round(float(np.max(probs)), 2)
                }

    if debug_mode: print("Phân tích hoàn tất! 2.0\n", file=sys.stderr)
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

    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'
    DEBUG_MODE = "--debug" in sys.argv 

    output = run_skin_pipeline(image_path, debug_mode=DEBUG_MODE)
    print(json.dumps(output, ensure_ascii=False))