import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiX } from "react-icons/fi";
import './NavbarSearch.css';

const NavbarSearch = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const navigate = useNavigate();

    // Xử lý sự kiện tìm kiếm khi nhấn Enter
    const handleSearch = (e) => {
        if (e.key === 'Enter' && searchTerm.trim()) {
            navigate(`/?search=${encodeURIComponent(searchTerm.trim())}`);
            setSearchTerm(""); 
        }
    };

    return (
        <div className="search-wrapper">
            <input 
                type="text" 
                placeholder="Tìm kiếm..." 
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyDown={handleSearch}
                aria-label="Tìm kiếm sản phẩm"
            />

            {/* Nút xóa chỉ hiện khi có text */}
            {searchTerm && (
                <button 
                    className="clear-btn" 
                    onClick={() => setSearchTerm("")}
                    aria-label="Xóa nội dung"
                >
                    <FiX />
                </button>
            )}
        </div>
    );
};

export default NavbarSearch;