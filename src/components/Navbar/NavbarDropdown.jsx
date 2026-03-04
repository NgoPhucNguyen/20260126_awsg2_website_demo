import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiX } from "react-icons/fi";
import { useTranslation } from "react-i18next";
import './NavbarSearch.css';

const NavbarSearch = () => {
    const { t } = useTranslation();
    const [searchTerm, setSearchTerm] = useState("");
    const [isExpanded, setIsExpanded] = useState(false);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    const handleSearch = (e) => {
        if (e.key === 'Enter' && searchTerm.trim()) {
            navigate(`/?search=${searchTerm}`);
            setIsExpanded(false); // Auto-close after searching
            setSearchTerm("");    // Clear the input
        }
    };

    const toggleSearch = () => {
        setIsExpanded(!isExpanded);
        // Automatically focus the keyboard on the input field when opened
        if (!isExpanded) {
            setTimeout(() => inputRef.current?.focus(), 100);
        }
    };

    return (
        // 🌟 The 'active' class here is the secret to the mobile overlay!
        <div className={`nav-search-container ${isExpanded ? 'active' : ''}`}>
            <div className={`search-wrapper ${isExpanded ? 'expanded' : ''}`}>
                <FiSearch className="search-icon" onClick={toggleSearch} />
                
                <input 
                    ref={inputRef}
                    type="text" 
                    placeholder="Tìm sản phẩm, thương hiệu..." /* You can put this in your i18n JSON later! */
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearch}
                />
                
                {isExpanded && (
                    <FiX className="close-icon" onClick={toggleSearch} />
                )}
            </div>
        </div>
    );
};

export default NavbarSearch;