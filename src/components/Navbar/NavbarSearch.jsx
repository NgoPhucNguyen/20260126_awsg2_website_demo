import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { FiSearch } from "react-icons/fi";
import './Navbar.css';
const NavbarSearch = () => {
    const [searchTerm, setSearchTerm] = useState("");
    const navigate = useNavigate();

    const handleSearch = (e) => {
        if (e.key === 'Enter' && searchTerm.trim()) {
            navigate(`/?search=${searchTerm}`);
        }
    };

    return (
        <div className="nav-search-container">
            <div className="search-wrapper">
                <FiSearch className="search-icon" />
                <input 
                    type="text" 
                    placeholder="Search skincare..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    onKeyDown={handleSearch}
                />
            </div>
        </div>
    );
};

export default NavbarSearch;