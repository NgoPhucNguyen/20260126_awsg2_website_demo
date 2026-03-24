# AI-Enhanced Dermatological E-Commerce Platform

| English | Tiếng Việt |
| :--- | :--- |
| This repository contains the source code and infrastructure configurations for an enterprise-grade e-commerce platform specializing in facial products. Built by a specialized team of AI and Cybersecurity engineers, the system integrates secure payment gateways with advanced AI-powered skin analysis to deliver personalized user experiences within a highly secure, scalable AWS environment. | Kho lưu trữ này chứa mã nguồn và cấu hình hạ tầng cho một nền tảng thương mại điện tử cấp doanh nghiệp chuyên về các sản phẩm chăm sóc da mặt. Được xây dựng bởi một nhóm kỹ sư chuyên trách về AI và An ninh mạng, hệ thống tích hợp cổng thanh toán an toàn với tính năng phân tích da bằng AI tiên tiến nhằm mang lại trải nghiệm cá nhân hóa cho người dùng trong một môi trường AWS an toàn và có khả năng mở rộng cao. |

---

## Project Overview

| English | Tiếng Việt |
| :--- | :--- |
| The platform serves as a modern e-commerce solution bridging retail and artificial intelligence. The primary objective is to offer users accurate, real-time facial skin analysis to recommend targeted cosmetic products. Security and data integrity are paramount, ensuring that sensitive biometric data and financial transactions are protected against vulnerabilities. | Nền tảng hoạt động như một giải pháp thương mại điện tử hiện đại kết nối bán lẻ và trí tuệ nhân tạo. Mục tiêu chính là cung cấp cho người dùng khả năng phân tích da mặt chính xác theo thời gian thực để đề xuất các sản phẩm mỹ phẩm phù hợp. Yếu tố bảo mật và toàn vẹn dữ liệu được đặt lên hàng đầu, đảm bảo rằng dữ liệu sinh trắc học nhạy cảm và các giao dịch tài chính được bảo vệ khỏi các lỗ hổng. |

---

## Architecture

| English | Tiếng Việt |
| :--- | :--- |
| The application utilizes a decoupled, microservices-oriented architecture. The frontend communicates with the Node.js backend via secure RESTful APIs. The backend handles business logic, orchestrates the AI analysis pipeline, and interfaces with a PostgreSQL database. The entire ecosystem is deployed on AWS, utilizing cloud-native services for load balancing, content delivery, and data storage. | Ứng dụng sử dụng kiến trúc vi dịch vụ (microservices) phân tách. Frontend giao tiếp với backend Node.js thông qua các API RESTful bảo mật. Backend xử lý logic nghiệp vụ, điều phối luồng phân tích AI và kết nối với cơ sở dữ liệu PostgreSQL. Toàn bộ hệ sinh thái được triển khai trên AWS, sử dụng các dịch vụ đám mây gốc để cân bằng tải, phân phối nội dung và lưu trữ dữ liệu. |

---

## Technologies Used

| Category / Component | Technology Stack / Mô tả Công nghệ |
| :--- | :--- |
| **Frontend** | React v22 (Vite) for high-performance rendering. Fluid and precise mobile responsiveness is engineered using advanced CSS mathematical functions (`clamp()`, `calc()`) to adapt dynamically to real-world viewport constraints. / *React v22 (Vite) cho hiệu suất hiển thị cao. Tính linh hoạt và đáp ứng chính xác trên di động được thiết kế bằng các hàm toán học CSS nâng cao (`clamp()`, `calc()`) để thích ứng động với các giới hạn màn hình thực tế.* |
| **Backend** | Node.js environment optimized for asynchronous data processing and API request routing. / *Môi trường Node.js được tối ưu hóa cho xử lý dữ liệu bất đồng bộ và định tuyến yêu cầu API.* |
| **Database** | PostgreSQL for robust, ACID-compliant relational data management. / *PostgreSQL để quản lý dữ liệu quan hệ mạnh mẽ, tuân thủ ACID.* |
| **AI Integration** | Computer Vision models for facial scanning and dermatological assessment. / *Các mô hình Thị giác Máy tính để quét khuôn mặt và đánh giá da liễu.* |

---

## Cloud Infrastructure Breakdown (AWS)

| Service / Dịch vụ | Application / Ứng dụng Thực tiễn |
| :--- | :--- |
| **AWS Amplify** | Manages the continuous deployment and hosting of the Vite/React frontend application. / *Quản lý triển khai liên tục và lưu trữ ứng dụng frontend Vite/React.* |
| **Amazon CloudFront** | Acts as the Content Delivery Network (CDN) to reduce latency and secure application endpoints via Edge locations. / *Hoạt động như Mạng phân phối nội dung (CDN) để giảm độ trễ và bảo vệ các điểm cuối của ứng dụng thông qua các vị trí Edge.* |
| **Amazon EC2** | Hosts the scalable Node.js backend API and AI inference servers within a virtual private cloud (VPC). / *Lưu trữ API backend Node.js có khả năng mở rộng và các máy chủ suy luận AI trong một đám mây riêng ảo (VPC).* |
| **Amazon S3** | Provides secure, encrypted object storage for static assets and transient user-uploaded images for AI analysis. / *Cung cấp lưu trữ đối tượng được mã hóa, an toàn cho các tệp tĩnh và hình ảnh người dùng tải lên tạm thời để phân tích AI.* |
| **Amazon RDS** | Managed relational database service hosting the PostgreSQL instances, ensuring automated backups and high availability. / *Dịch vụ cơ sở dữ liệu quan hệ được quản lý lưu trữ các phiên bản PostgreSQL, đảm bảo sao lưu tự động và tính sẵn sàng cao.* |

---

## Setup and Installation

| English | Tiếng Việt |
| :--- | :--- |
| **1. Prerequisites:** Ensure Node.js (v20+), npm/yarn, and PostgreSQL are installed locally. AWS CLI must be configured with appropriate IAM credentials.<br>**2. Clone Repository:** `git clone [repository_url]`<br>**3. Environment Variables:** Copy `.env.example` to `.env` and populate AWS credentials, database URIs, and API keys.<br>**4. Frontend Setup:** Navigate to `/client`, run `npm install`, then `npm run dev`.<br>**5. Backend Setup:** Navigate to `/server`, run `npm install`, apply database migrations, and start the server with `npm start`. | **1. Yêu cầu hệ thống:** Đảm bảo Node.js (v20+), npm/yarn và PostgreSQL đã được cài đặt. AWS CLI phải được cấu hình với thông tin xác thực IAM phù hợp.<br>**2. Tải Mã nguồn:** `git clone [repository_url]`<br>**3. Biến Môi trường:** Sao chép `.env.example` thành `.env` và điền thông tin AWS, URI cơ sở dữ liệu và khóa API.<br>**4. Cài đặt Frontend:** Truy cập `/client`, chạy `npm install`, sau đó `npm run dev`.<br>**5. Cài đặt Backend:** Truy cập `/server`, chạy `npm install`, áp dụng migration cơ sở dữ liệu và khởi động máy chủ với `npm start`. |

---

## Team Members

| Role / Vai trò | Focus Area / Lĩnh vực Phụ trách |
| :--- | :--- |
| **AI Specialist (x4)** | Responsible for developing, training, and integrating the computer vision algorithms for skin analysis, as well as optimizing inference models on AWS EC2. / *Chịu trách nhiệm phát triển, huấn luyện và tích hợp các thuật toán thị giác máy tính để phân tích da, cũng như tối ưu hóa các mô hình suy luận trên AWS EC2.* |
| **Cybersecurity Specialist (x1)** | Ensures end-to-end encryption, implements WAF configurations on CloudFront, conducts vulnerability assessments on Node.js endpoints, and secures RDS instances to protect sensitive user biometric and payment data. / *Đảm bảo mã hóa đầu cuối, triển khai cấu hình WAF trên CloudFront, đánh giá lỗ hổng trên các điểm cuối Node.js và bảo mật các phiên bản RDS để bảo vệ dữ liệu sinh trắc học và thanh toán nhạy cảm của người dùng.* |

> Note: This architecture and team structure have been explicitly designed to meet the rigorous engineering and innovation standards of the FCJ AI program in Ho Chi Minh City.
> 
> Lưu ý: Kiến trúc và cấu trúc nhóm này được thiết kế đặc biệt để đáp ứng các tiêu chuẩn khắt khe về kỹ thuật và đổi mới của chương trình FCJ AI tại Thành phố Hồ Chí Minh.
