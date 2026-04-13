# 1. BẮT BUỘC: Nâng lên Node 20 Slim để fix cảnh báo AWS SDK deprecation năm 2026
FROM node:20-slim

# 2. Cài OpenSSL, Python3, Pip, thư viện OpenCV VÀ tạo bí danh python -> python3
RUN apt-get update -y && apt-get install -y \
  openssl \
  python3 \
  python3-pip \
  libgl1-mesa-glx \
  libglib2.0-0 \
  python-is-python3 \
  && rm -rf /var/lib/apt/lists/*

# 3. Chuyển thư mục làm việc
WORKDIR /app

# 4. Dùng pip3 cài thư viện AI (Layer này nặng, để đây để tận dụng Cache)
RUN pip3 install --no-cache-dir \
  tensorflow==2.15.0 \
  mediapipe==0.10.14 \
  opencv-python==4.9.0.80 \
  opencv-contrib-python==4.9.0.80 \
  jax==0.4.23 \
  jaxlib==0.4.23 \
  numpy==1.26.4 \
  --break-system-packages

# 5. Cài đặt thư viện NodeJS
COPY package*.json ./
RUN npm install

# 6. Build Prisma
COPY prisma ./prisma/
RUN npx prisma generate

# 7. Copy toàn bộ source code (Chỉ copy sau khi đã cài xong các dependencies)
COPY . .

# 8. Mở cổng và chạy server
EXPOSE 3500
CMD ["npm", "run", "start:prod"]