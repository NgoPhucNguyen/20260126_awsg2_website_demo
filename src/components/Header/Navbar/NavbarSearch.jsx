import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiX, FiSearch, FiArrowRight } from "react-icons/fi";
import axios from "@/api/axios";
import { getImageUrl } from "@/utils/getImageUrl";
import './NavbarSearch.css';

const NavbarSearch = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const [results, setResults] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [showDropdown, setShowDropdown] = useState(false);
    
    const navigate = useNavigate();
    const searchRef = useRef(null);

    useEffect(() => {
        if (!searchTerm.trim() || searchTerm.length < 2) {
            setResults([]);
            setShowDropdown(false);
            return;
        }

        const delayDebounceFn = setTimeout(async () => {
            setIsLoading(true);
            try {
                // Sử dụng endpoint quick-search mà chúng ta đã thống nhất tối ưu ở Backend
                const response = await axios.get(`/api/products/quick-search?search=${searchTerm}`);
                setResults(response.data);
                setShowDropdown(true);
            } catch (error) {
                console.error("Lỗi tìm kiếm nhanh:", error);
            } finally {
                setIsLoading(false);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (searchRef.current && !searchRef.current.contains(event.target)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSearchSubmit = (e) => {
        if (e.key === 'Enter' && searchTerm.trim()) {
            navigate(`/?search=${encodeURIComponent(searchTerm.trim())}`);
            setShowDropdown(false);
            setSearchTerm(""); 
        }
    };

    const handleSelectProduct = (productId) => {
        navigate(`/product/${productId}`);
        setShowDropdown(false);
        setSearchTerm("");
    };

    return (
        <div className="navbar-search-container" ref={searchRef}>
            <div className="navbar-search-input-wrapper">
                <FiSearch className="navbar-search-input-icon" />
                <input 
                    type="text" 
                    placeholder="Bạn tìm gì hôm nay?..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearchSubmit}
                    onFocus={() => results.length > 0 && setShowDropdown(true)}
                    className="navbar-search-input-field"
                />
                {searchTerm && (
                    <button 
                        className="navbar-search-input-clear-btn" 
                        onClick={() => {setSearchTerm(""); setResults([]);}}
                    >
                        <FiX />
                    </button>
                )}
            </div>

            {showDropdown && (
                <div className="navbar-search-dropdown">
                    {isLoading ? (
                        <div className="navbar-search-dropdown-loading">🔍 Đang tìm sản phẩm...</div>
                    ) : results.length > 0 ? (
                        <>
                            <div className="navbar-search-dropdown-header">Sản phẩm gợi ý</div>
                            <ul className="navbar-search-results-list">
                                {results.map((item) => (
                                    <li 
                                        key={item.id} 
                                        className="navbar-search-result-item"
                                        onClick={() => handleSelectProduct(item.id)}
                                    >
                                        <img 
                                            className="navbar-search-result-image"
                                            src={getImageUrl(item.variants?.[0]?.thumbnailUrl || item.variants?.[0]?.images?.[0]?.imageUrl)} 
                                            alt={item.name} 
                                        />
                                        <div className="navbar-search-result-info">
                                            <p className="navbar-search-result-name">{item.nameVn || item.name}</p>
                                            <p className="navbar-search-result-price">
                                                {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(item.variants?.[0]?.unitPrice)}
                                            </p>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                            <div 
                                className="navbar-search-dropdown-footer" 
                                onClick={() => navigate(`/?search=${searchTerm}`)}
                            >
                                Xem tất cả kết quả cho "{searchTerm}" <FiArrowRight />
                            </div>
                        </>
                    ) : (
                        <div className="navbar-search-no-results">Không tìm thấy sản phẩm nào</div>
                    )}
                </div>
            )}
        </div>
    );
};

export default NavbarSearch;