import { useState, useEffect } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faAnglesUp } from '@fortawesome/free-solid-svg-icons';
import "./ScrollToTop.css";

const ScrollToTop = () => {
    const [isVisible, setIsVisible] = useState(false);

    // 1. Hàm kiểm tra vị trí cuộn
    const toggleVisibility = () => {
        // Nếu cuộn xuống quá 300px thì hiện nút
        if (window.scrollY > 300) {
            setIsVisible(true);
        } else {
            setIsVisible(false);
        }
    };

    // 2. Hàm xử lý cuộn lên đỉnh mượt mà
    const scrollToTop = () => {
        window.scrollTo({
            top: 0,
            behavior: "smooth" /* 🛑 Yếu tố quyết định UX mượt mà */
        });
    };

    // 3. Lắng nghe sự kiện scroll
    useEffect(() => {
        window.addEventListener("scroll", toggleVisibility);
        
        // 🧹 Dọn dẹp (Cleanup) event listener khi component unmount
        return () => window.removeEventListener("scroll", toggleVisibility);
    }, []);

    return (
      <div className="scrolltotop-container">
        <button 
        type="button"
        /* Thêm class 'show' khi isVisible là true */
        className={`scroll-to-top-btn ${isVisible ? "show" : ""}`} 
        onClick={scrollToTop}
        aria-label="Cuộn lên đầu trang"
        >
      <FontAwesomeIcon icon={faAnglesUp} className="arrow-icon" />
        </button>
      </div>
    );
};

export default ScrollToTop;