# Đổi sang bản Slim (Tương thích 100% với Prisma)
FROM node:18-slim

# Cài đặt thư viện OpenSSL (Bắt buộc cho Prisma)
RUN apt-get update -y && apt-get install -y openssl

# Cài đặt thư mục làm việc trong Container
WORKDIR /app

# Copy package.json vào trước để cài thư viện
COPY package*.json ./
RUN npm install

# Copy thư mục Prisma và build Prisma Client
COPY prisma ./prisma/
RUN npx prisma generate

# Copy toàn bộ code Backend (đã bị lọc bởi .dockerignore)
COPY . .

# Mở cổng 3500
EXPOSE 3500

# Khởi động server
CMD ["npm", "run", "server"]