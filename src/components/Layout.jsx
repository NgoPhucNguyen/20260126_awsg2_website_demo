import { Outlet } from "react-router-dom";
import Navbar from "@/components/Header/Navbar/Navbar";
import "./Layout.css";
import ScrollToTop from "@/components/ScrollToTop";
/**
 * Layout Component: Bộ khung tối ưu cho Fluid Design.
 * Cấu trúc semantic giúp hỗ trợ SEO và Accessibility tốt hơn.
 */
const Layout = () => {
    return (
        <div className="app-shell">
            {/* Header được cố định bằng sticky trong CSS */}
            <header className="app-header">
                <Navbar />
            </header>

            {/* Main container sử dụng flex: 1 để chiếm trọn không gian còn lại */}
            <main className="main-container">
                {/* page-content quản lý độ rộng tối đa và padding dòng chảy */}
                <div className="page-content">
                    <Outlet /> 
                </div>
            </main>

            <ScrollToTop />
            {/* Footer sẽ được thêm vào đây trong tương lai */}
        </div>
    );
};

export default Layout;