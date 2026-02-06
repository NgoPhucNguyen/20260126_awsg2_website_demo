import { useState, useEffect } from "react";
import { FaBoxOpen, FaPlus, FaTrash, FaEdit, FaSearch } from "react-icons/fa6"; // Added FaEdit, FaSearch
import "./Inventory.css"; // 👈 Import your new clean CSS
import "./Users.css"; // Keep this for shared table styles (table-responsive, etc)

const Inventory = () => {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // --- MOCK DATA ---
    const MOCK_DATA = [
        { id: 1, name: "Velvet Matte Lipstick", category: "Makeup", price: 19.99, stock: 150, image: null },
        { id: 2, name: "Hydrating Face Serum", category: "Skincare", price: 35.50, stock: 8, image: null },
        { id: 3, name: "Night Repair Cream", category: "Skincare", price: 45.00, stock: 0, image: null },
        { id: 4, name: "Waterproof Eyeliner", category: "Makeup", price: 12.00, stock: 300, image: null },
    ];

    useEffect(() => {
        const timer = setTimeout(() => {
            setProducts(MOCK_DATA);
            setIsLoading(false);
        }, 800);
        return () => clearTimeout(timer);
    }, []);

    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 🧠 Helper to get the correct CSS class for stock
    const getStockClass = (stock) => {
        if (stock === 0) return "stock-out";
        if (stock < 10) return "stock-low";
        return "stock-ok";
    };

    const getStockLabel = (stock) => {
        if (stock === 0) return "Out of Stock";
        if (stock < 10) return `Low (${stock})`;
        return "In Stock";
    };

    return (
        <div className="fade-in">
            {/* 🏷️ HEADER */}
            <header className="inventory-header">
                <div>
                    <h2>📦 Product Inventory</h2>
                    <p className="admin-subtitle">Manage your cosmetics catalog</p>
                </div>
                <button className="btn-add">
                    <FaPlus /> Add New Product
                </button>
            </header>

            {/* 🔍 SEARCH BAR */}
            <div className="search-container">
                <FaSearch className="search-icon" />
                <input 
                    type="text" 
                    placeholder="Search products..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
            </div>

            {/* 📋 TABLE */}
            {isLoading ? (
                <div className="loading-container"><div className="spinner"></div><p>Loading inventory...</p></div>
            ) : (
                <div className="table-responsive">
                    <table className="users-table">
                        <thead>
                            <tr>
                                <th>ID</th>
                                <th>Product Name</th>
                                <th>Category</th>
                                <th>Price</th>
                                <th>Stock Status</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredProducts.length > 0 ? (
                                filteredProducts.map((product) => (
                                    <tr key={product.id}>
                                        <td className="col-id">#{product.id}</td>
                                        
                                        {/* Name & Image */}
                                        <td>
                                            <div className="product-cell">
                                                <div className="img-placeholder">
                                                    <FaBoxOpen size={20}/>
                                                </div>
                                                {product.name}
                                            </div>
                                        </td>

                                        <td><span className="badge tier-1">{product.category}</span></td>
                                        
                                        <td className="price-text">${product.price.toFixed(2)}</td>
                                        
                                        {/* Smart Badge Logic */}
                                        <td>
                                            <span className={`badge badge-stock ${getStockClass(product.stock)}`}>
                                                {getStockLabel(product.stock)}
                                            </span>
                                        </td>
                                        
                                        {/* Actions */}
                                        <td>
                                            <div className="actions-cell">
                                                <button title="Edit" className="btn-icon btn-edit"><FaEdit /></button>
                                                <button title="Delete" className="btn-icon btn-delete"><FaTrash /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr>
                                    <td colSpan="6" className="empty-state">
                                        <FaBoxOpen size={30} />
                                        <p>No products found matching "{searchTerm}"</p>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default Inventory;