import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch, FiX } from "react-icons/fi";
import './NavbarSearch.css';

const NavbarSearch = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const navigate = useNavigate();

    const handleSearch = (e) => {
        if (e.key === 'Enter' && searchTerm.trim()) {
            navigate(`/?search=${searchTerm}`);
            setSearchTerm(""); 
        }
    };

    const clearSearch = () => {
        setSearchTerm("");
    };

    return (
        <div className="nav-search-container">
            <div className="search-wrapper">
                <FiSearch className="search-icon" />
                
                <input 
                    type="text" 
                    placeholder="Tìm kiếm sản phẩm, thương hiệu..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearch}
                />

                {/* Only show the 'X' if they have typed something */}
                {searchTerm && (
                    <FiX className="close-icon" onClick={clearSearch} />
                )}
            </div>
        </div>
    );
};

export default NavbarSearch;