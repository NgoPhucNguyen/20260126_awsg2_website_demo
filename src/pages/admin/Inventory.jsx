import { useState, useEffect } from "react";
// import useAxiosPrivate from "../../hooks/useAxiosPrivate"; // 🚫 Disable Backend for now
import "./Users.css"; // Reuse existing CSS
import { FaBoxOpen, FaPlus, FaTrash } from "react-icons/fa6";

const Inventory = () => {
    // --- STATE ---
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    // const axiosPrivate = useAxiosPrivate();

    // --- MOCK DATA (This is what your friend needs to send you later) ---
    const MOCK_DATA = [
        { 
            id: 1, 
            name: "Velvet Matte Lipstick", 
            category: "Makeup", 
            price: 19.99, 
            stock: 150, 
            image: null, 
            status: "In Stock"
        },
        { 
            id: 2, 
            name: "Hydrating Face Serum", 
            category: "Skincare", 
            price: 35.50, 
            stock: 8, 
            image: null, 
            status: "Low Stock"
        },
        { 
            id: 3, 
            name: "Night Repair Cream", 
            category: "Skincare", 
            price: 45.00, 
            stock: 0, 
            image: null, 
            status: "Out of Stock"
        },
        { 
            id: 4, 
            name: "Waterproof Eyeliner", 
            category: "Makeup", 
            price: 12.00, 
            stock: 300, 
            image: null, 
            status: "In Stock"
        },
    ];

    // --- EFFECT: SIMULATE FETCHING ---
    useEffect(() => {
        // We pretend to wait 1 second for the server
        const timer = setTimeout(() => {
            setProducts(MOCK_DATA);
            setIsLoading(false);
        }, 800);

        return () => clearTimeout(timer);
    }, []);

    // --- HELPER: SEARCH FILTER ---
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="fade-in">
            {/* HEADER */}
            <header className="dashboard-header" style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end'}}>
                <div>
                    <h2>📦 Product Inventory</h2>
                    <p className="admin-subtitle">Manage your cosmetics catalog</p>
                </div>
                <button className="btn-show-more" style={{backgroundColor: '#4f46e5', color: 'white', border: 'none', padding: '10px 20px'}}>
                    <FaPlus /> Add New Product
                </button>
            </header>

            {/* SEARCH BAR (Frontend Feature) */}
            <div style={{marginBottom: '20px', position: 'relative', maxWidth: '400px'}}>
                <input 
                    type="text" 
                    placeholder="Search products..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '10px 10px 10px 40px',
                        border: '1px solid #d1d5db',
                        borderRadius: '8px',
                        outline: 'none'
                    }}
                />
            </div>

            {/* TABLE */}
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
                                        <td className="col-name">
                                            <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
                                                {/* Image Placeholder */}
                                                <div style={{
                                                    width: '40px', height: '40px', 
                                                    background: '#f3f4f6', borderRadius: '6px',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                                }}>
                                                    <FaBoxOpen color="#cbd5e1" size={20}/>
                                                </div>
                                                {product.name}
                                            </div>
                                        </td>
                                        <td>
                                            <span className="badge tier-1">{product.category}</span>
                                        </td>
                                        <td style={{fontWeight: '600'}}>${product.price.toFixed(2)}</td>
                                        <td>
                                            {/* Logic for Status Badge */}
                                            <span className={`badge`} style={{
                                                backgroundColor: product.stock === 0 ? '#fef2f2' : product.stock < 10 ? '#fffbeb' : '#ecfdf5',
                                                color: product.stock === 0 ? '#991b1b' : product.stock < 10 ? '#92400e' : '#065f46',
                                                border: '1px solid transparent'
                                            }}>
                                                {product.stock === 0 ? 'Out of Stock' : product.stock < 10 ? `Low (${product.stock})` : 'In Stock'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{display: 'flex', gap: '12px'}}>
                                                <button title="Edit" style={{border: 'none', background: 'none', cursor: 'pointer', color: '#6366f1', fontSize: '1.1rem'}}>/</button>
                                                <button title="Delete" style={{border: 'none', background: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '1.1rem'}}><FaTrash /></button>
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