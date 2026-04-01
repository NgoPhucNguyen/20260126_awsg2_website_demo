// controllers/uploadAnalyzeController.js
import { exec } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Setup đường dẫn cho ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const analyzeSkinImage = async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'Không tìm thấy ảnh upload' });
  }

  const tempFilename = `temp_${Date.now()}_${Math.round(Math.random() * 1000)}.jpg`;
  const tempFilePath = path.join(__dirname, '../../', tempFilename);

  try {
    fs.writeFileSync(tempFilePath, req.file.buffer);

    const skinModelDir = path.join(__dirname, '../skinmodel');
    const pythonScriptPath = path.join(skinModelDir, 'skin_analyze_pipeline.py');
    
    // 1. Sửa lỗi gọi sai tên Python
    const isWindows = process.platform === 'win32';
    const pythonCmd = isWindows ? 'python' : 'python3';
    
    // 2. THÊM CỜ --debug VÀO LỆNH CHẠY
    const command = `${pythonCmd} "${pythonScriptPath}" "${tempFilePath}" --debug`;

    // 3. Ép thư mục làm việc (cwd) của Python phải là thư mục skinmodel
    // Việc này đảm bảo thư mục "debug_output" sẽ được tạo đúng trong "server/skinmodel/"
    exec(command, { cwd: skinModelDir }, (error, stdout, stderr) => {
      
      // BẢO MẬT: Xóa file ảnh gốc
      if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
      }

      // Xử lý LỖI SẬP PYTHON (Lỗi cú pháp Python, thiếu thư viện...)
      if (error) {
        console.error("❌ Python bị sập! Chi tiết lỗi:", stderr);
        return res.status(500).json({ error: 'Lỗi hệ thống khi phân tích ảnh' });
      }

      // 4. IN RA CÁC DÒNG LOG DEBUG CỦA BẠN TRÊN TERMINAL NODEJS
      if (stderr) {
        console.log("🛠️ Log từ Python (Stderr):");
        console.log(stderr);
      }

      try {
        // Lấy JSON. Vì bạn dùng in ra stderr cho các log phụ, 
        // nên stdout ở đây CHỈ chứa duy nhất chuỗi JSON. parse sẽ không bị lỗi!
        const aiResult = JSON.parse(stdout.trim());
        
        return res.json(aiResult);
      } catch (parseError) {
        console.error("❌ Lỗi parse JSON. Cục stdout nhận được là:", stdout);
        return res.status(500).json({ error: 'Kết quả phân tích bị lỗi định dạng' });
      }
    });

  } catch (err) {
    if (fs.existsSync(tempFilePath)) {
        fs.unlinkSync(tempFilePath);
    }
    console.error("Lỗi xử lý file tạm:", err);
    return res.status(500).json({ error: 'Lỗi máy chủ khi đọc ảnh' });
  }
};