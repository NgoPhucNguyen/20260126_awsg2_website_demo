import sys
import cv2
import numpy as np
import mediapipe as mp
import tensorflow as tf
import os
import json
import tempfile

# ==============================================================================
# 1. CẤU HÌNH HỆ THỐNG
# ==============================================================================
IMG_SIZE = 300

try:
    BASE_DIR = os.path.dirname(os.path.abspath(__file__))
except NameError:
    BASE_DIR = os.getcwd()

MODEL_PATHS = {
    'acne':              os.path.join(BASE_DIR, 'done_model', 'acne_model.tflite'),
    'wrinkles_eyes':     os.path.join(BASE_DIR, 'done_model', 'wrinkles_eyes_model.tflite'),
    'wrinkles_forehead': os.path.join(BASE_DIR, 'done_model', 'wrinkles_forehead_model.tflite'),
    'wrinkles_mouth':    os.path.join(BASE_DIR, 'done_model', 'wrinkles_mouth_model.tflite')
}
SKINTONE_JSON = os.path.join(BASE_DIR, 'skintone_constants.json')

# Khởi tạo MediaPipe Face Mesh
try:
    from mediapipe.python.solutions import face_mesh as mp_face_mesh
except ImportError:
    mp_face_mesh = mp.solutions.face_mesh

face_mesh_tool = mp_face_mesh.FaceMesh(
    static_image_mode=True,
    max_num_faces=1,
    refine_landmarks=True,
    min_detection_confidence=0.5
)

# Landmark ID cho 2 bên má (để soi mụn)
CHEEK_LANDMARKS = {
    'left_cheek':  [137, 234, 93, 132, 58, 172, 136, 150, 149, 176, 148, 152],
    'right_cheek': [366, 454, 323, 361, 288, 397, 365, 379, 378, 400, 377, 382]
}

# ==============================================================================
# 2. CÁC HÀM XỬ LÝ KỸ THUẬT
# ==============================================================================

def load_tflite(model_path):
    if not os.path.exists(model_path):
        return None
    interpreter = tf.lite.Interpreter(model_path=model_path)
    interpreter.allocate_tensors()
    return interpreter, interpreter.get_input_details(), interpreter.get_output_details()

def resize_with_pad(img, target_size=(IMG_SIZE, IMG_SIZE)):
    """Resize ảnh giữ tỉ lệ (Letterbox) để không làm biến dạng mụn/nhăn"""
    if img is None or img.size == 0:
        return np.zeros((target_size[0], target_size[1], 3), dtype=np.uint8)
    h, w = img.shape[:2]
    scale = min(target_size[0]/w, target_size[1]/h)
    nw, nh = int(w * scale), int(h * scale)
    resized = cv2.resize(img, (nw, nh), interpolation=cv2.INTER_LANCZOS4)
    canvas = np.zeros((target_size[1], target_size[0], 3), dtype=np.uint8)
    y_off, x_off = (target_size[1] - nh) // 2, (target_size[0] - nw) // 2
    canvas[y_off:y_off+nh, x_off:x_off+nw] = resized
    return canvas

def predict_tflite(img_array, bundle):
    if bundle is None: return np.array([1.0, 0.0, 0.0])
    interpreter, input_details, output_details = bundle
    
    img_input = np.expand_dims(img_array, axis=0).astype(np.float32)
    # img_input = np.expand_dims((img_array / 127.5) - 1.0, axis=0).astype(np.float32)
    
    interpreter.set_tensor(input_details[0]['index'], img_input)
    interpreter.invoke()
    return interpreter.get_tensor(output_details[0]['index'])[0]

def get_final_score(probs,model_type='acne'):
    if model_type == 'acne':
        # Logic cũ: [1.0, 2.5, 5.0]
        weights = np.array([1.0, 2.5, 5.0])
    else:
        # Bộ trọng số "Dễ tính" cho Wrinkles:
        # lv_1 (Nặng): Nâng từ 1.0 lên 1.5 để không bị điểm quá liệt.
        # lv_2 (Trung bình): Nâng từ 2.5 lên 3.5 để đẩy điểm vùng rãnh cười/bọng mắt lên cao.
        weights = np.array([1.5, 3.5, 5.0])
    score = np.sum(probs * weights)
    return round(float(np.clip(score, 1.0, 5.0)), 2)

def get_landmark_px(landmarks, indices, img_w, img_h):
    return [(int(landmarks[i].x * img_w), int(landmarks[i].y * img_h)) for i in indices]

# ==============================================================================
# 3. HÀM ĐO MÀU DA
# ==============================================================================

def get_skintone_from_landmarks(img_bgr, landmarks, img_w, img_h, json_path):
    if not os.path.exists(json_path):
        return 0

    with open(json_path, 'r') as f:
        levels = json.load(f)

    # Đo trên ảnh gốc để không bị sai lệch màu da
    img_lab = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2LAB)

    def get_cheek_pixels(indices):
        pts = get_landmark_px(landmarks, indices, img_w, img_h)
        xs, ys = [p[0] for p in pts], [p[1] for p in pts]
        x1, x2 = max(0, min(xs)-10), min(img_w, max(xs)+10)
        y1, y2 = max(0, min(ys)-10), min(img_h, max(ys)+10)
        if x2 <= x1 or y2 <= y1: return np.zeros((1, 3))
        roi = img_lab[y1:y2, x1:x2]
        return roi.reshape(-1, 3) if roi.size > 0 else np.zeros((1, 3))

    all_px = np.vstack([
        get_cheek_pixels(CHEEK_LANDMARKS['left_cheek']),
        get_cheek_pixels(CHEEK_LANDMARKS['right_cheek'])
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
# 4. HÀM CẮT VÙNG DA THÔNG MINH (CROP)
# ==============================================================================

def get_smart_crops(img, mesh_result, w, h):
    lm = mesh_result.landmark
    def p(i): return int(lm[i].x * w), int(lm[i].y * h)

    crops = {'acne': {}, 'wrinkles': {}}

    # --- Trán (Dùng cho cả Acne và Wrinkles) ---
    y_top = max(0, p(10)[1] - (p(1)[1] - p(9)[1]))
    y_bot = min(h, p(9)[1])
    x_l, x_r = max(0, p(70)[0]), min(w, p(300)[0])
    forehead = img[y_top:y_bot, x_l:x_r]
    crops['wrinkles']['wrinkles_forehead'] = forehead

    # --- Mắt (Wrinkles) ---
    def eye_crop(inner, outer, top, bot, is_left):
        ew, eh = abs(p(inner)[0]-p(outer)[0]), abs(p(bot)[1]-p(top)[1])
        y1, y2 = max(0, p(top)[1]-eh), min(h, p(bot)[1]+eh)
        x1 = max(0, p(outer)[0]-ew) if is_left else p(inner)[0]
        x2 = p(inner)[0] if is_left else min(w, p(outer)[0]+ew)
        return img[y1:y2, x1:x2]

    crops['wrinkles']['wrinkles_eyes_L'] = eye_crop(133, 33, 159, 145, True)
    crops['wrinkles']['wrinkles_eyes_R'] = eye_crop(362, 263, 386, 374, False)

    # --- Miệng/Rãnh cười (Wrinkles) ---
    p_dist = abs(p(468)[0] - p(473)[0])
    crops['wrinkles']['wrinkles_mouth'] = img[p(2)[1]:p(18)[1], max(0, p(1)[0]-p_dist):min(w, p(1)[0]+p_dist)]

    # --- Má (Acne) ---
    for side, ids in CHEEK_LANDMARKS.items():
        pts = [p(i) for i in ids]
        xs, ys = [pt[0] for pt in pts], [pt[1] for pt in pts]
        crops['acne'][side] = img[max(0, min(ys)):min(h, max(ys)), max(0, min(xs)):min(w, max(xs))]

    return crops

# ==============================================================================
# 5. PIPELINE CHÍNH
# ==============================================================================

def run_skin_pipeline(image_path, debug_mode=False):
    debug_dir = os.path.join(tempfile.gettempdir(), "skin_debug_output")
    if debug_mode:
        os.makedirs(debug_dir, exist_ok=True)
        print(f"🚀 Bắt đầu phân tích. Ảnh debug lưu tại: {debug_dir}", file=sys.stderr)

    full_img = cv2.imread(image_path)
    if full_img is None: return {"error": "File not found"}
    h, w, _ = full_img.shape

    rgb = cv2.cvtColor(full_img, cv2.COLOR_BGR2RGB)
    res = face_mesh_tool.process(rgb)
    if not res.multi_face_landmarks:
        if debug_mode: print("❌ FaceMesh: Không tìm thấy mặt!", file=sys.stderr)
        return {"error": "No face detected"}

    landmarks = res.multi_face_landmarks[0].landmark

    if debug_mode:
        debug_full = full_img.copy()
        for i in range(len(landmarks)):
            cv2.circle(debug_full, (int(landmarks[i].x * w), int(landmarks[i].y * h)), 1, (0, 255, 0), -1)
        cv2.imwrite(os.path.join(debug_dir, "00_landmarks.jpg"), debug_full)

    crops = get_smart_crops(full_img, res.multi_face_landmarks[0], w, h)
    final_results = {}

    # ── ĐO MÀU DA ──────────────────────────────────────────────────────────────
    final_results['skintone'] = get_skintone_from_landmarks(
        full_img, landmarks, w, h, SKINTONE_JSON
    )

    # ── PHÂN TÍCH MỤN (ACNE) ───────────────────────────────────────────────────
    if os.path.exists(MODEL_PATHS['acne']):
        bundle = load_tflite(MODEL_PATHS['acne'])
        acne_scores = []
        for region_name, region_img in crops['acne'].items():
            if region_img.size > 0:
                resized = resize_with_pad(region_img)
                if debug_mode:
                    cv2.imwrite(os.path.join(debug_dir, f"01_acne_input_{region_name}.jpg"), resized)
                    print(f"  [DEBUG] Pixel mean ({region_name}): {np.mean(resized):.2f}", file=sys.stderr)

                rgb_input = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
                probs = predict_tflite(rgb_input, bundle)

                if debug_mode:
                    print(f"  [DEBUG] ACNE probs ({region_name}): {probs}", file=sys.stderr)

                acne_scores.append(get_final_score(probs, model_type='acne'))

        if acne_scores:
            final_results['acne'] = {
                "score": min(acne_scores),
                "confidence": round(float(np.max(probs)), 2)
            }
        else:
            final_results['acne'] = {"score": 5.0, "confidence": 0.5}

    # ── PHÂN TÍCH NHĂN (WRINKLES) ──────────────────────────────────────────────
    wrinkle_tasks = [
        ('wrinkles_forehead', ['wrinkles_forehead']),
        ('wrinkles_eyes',     ['wrinkles_eyes_L', 'wrinkles_eyes_R']),
        ('wrinkles_mouth',    ['wrinkles_mouth'])
    ]

    for m_key, regions in wrinkle_tasks:
        if os.path.exists(MODEL_PATHS[m_key]):
            bundle = load_tflite(MODEL_PATHS[m_key])
            scores = []
            for r_name in regions:
                region_img = crops['wrinkles'].get(r_name)
                if region_img is not None and region_img.size > 0:
                    resized = resize_with_pad(region_img)
                    if debug_mode:
                        cv2.imwrite(os.path.join(debug_dir, f"02_wrinkle_input_{r_name}.jpg"), resized)

                    rgb_input = cv2.cvtColor(resized, cv2.COLOR_BGR2RGB)
                    probs = predict_tflite(rgb_input, bundle)

                    if debug_mode:
                        print(f"  [DEBUG] {m_key} ({r_name}) probs: {probs}", file=sys.stderr)

                    scores.append(get_final_score(probs, model_type='wrinkles'))
            if scores:
                final_results[m_key] = {
                    "score": min(scores),
                    "confidence": round(float(np.max(probs)), 2)
                }

    if debug_mode: print("✅ Phân tích hoàn tất!\n", file=sys.stderr)
    return final_results

# ==============================================================================
# 6. ENTRY POINT – CHẠY TỪ NODEJS / TERMINAL
# ==============================================================================
# ==============================================================================
# 6. ENTRY POINT – CHẠY TỪ NODEJS
# ==============================================================================
if __name__ == "__main__":
    import json
    import os
    import sys
    import warnings

    # --- ÉP PYTHON & CÁC THƯ VIỆN IM LẶNG ---
    os.environ['TF_CPP_MIN_LOG_LEVEL'] = '3'  # Tắt log TensorFlow
    os.environ['OPENCV_LOG_LEVEL'] = 'SILENT' # Tắt log OpenCV
    warnings.filterwarnings('ignore')         # Tắt cảnh báo Python

    # Chuyển hướng stdout chuẩn sang "hố đen" để chặn các thư viện tự ý print
    old_stdout = sys.stdout
    sys.stdout = open(os.devnull, 'w')

    result = {}
    try:
        if len(sys.argv) < 2:
            result = {"error": "Thiếu đường dẫn ảnh."}
        else:
            image_path = sys.argv[1]
            if not os.path.exists(image_path):
                result = {"error": "Không tìm thấy file ảnh trên server."}
            else:
                # Ép buộc debug_mode = False khi chạy thực tế
                result = run_skin_pipeline(image_path, debug_mode=False)
                
    except Exception as e:
        # Nếu code crash, gói lỗi vào JSON thay vì văng chữ đỏ ra terminal
        result = {"error": f"Lỗi xử lý ảnh (Python): {str(e)}"}
        
    finally:
        # --- BẬT LẠI STDOUT ĐỂ IN KẾT QUẢ CHO NODE.JS ĐỌC ---
        sys.stdout = old_stdout
        
        # Chỉ in DUY NHẤT dòng này
        print(json.dumps(result, ensure_ascii=False))