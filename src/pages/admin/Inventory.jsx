// src/pages/admin/Inventory.jsx
import { useState, useEffect } from "react";
import { FaBoxOpen, FaPlus, FaTrash, FaPenToSquare, FaMagnifyingGlass, FaRotateLeft } from "react-icons/fa6";
import axios from "../../api/axios";
import AddProductModal from "../../components/AddProductModal";
import "./Inventory.css"; 
import "./Users.css"; 

const Inventory = () => {
    const [products, setProducts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");

    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [filterOptions, setFilterOptions] = useState({ brands: [], categories: [], skinTypes: [] });

    const [isViewingArchived, setIsViewingArchived] = useState(false)
    // 🚀 1. Fetch Real Data on Mount
    useEffect(() => {
        const fetchInventory = async () => {
            setIsLoading(true);
            try {
                const queryParam = isViewingArchived ? '?status=archived' : '';
                // Fetch from the exact same endpoint as your Product.jsx                
                const response = await axios.get(`/api/products${queryParam}`);

                // 🔄 MAP THE DATA FOR ADMIN TABLE
                const formattedData = response.data.map(product => {
                    // Grab the first variant to show a baseline price
                    const mainVariant = product.variants?.[0] || { unitPrice: 0 };
                    
                    // 🧮 THE MATH: Sum up the quantity from all warehouses for this variant
                    const variantStock = mainVariant.inventories?.reduce((total, inventoryItem) => {
                        return total + inventoryItem.quantity;
                    }, 0) || 0;
                    
                    return {
                        id: product.id,
                        name: product.name,
                        category: product.category?.name || "Uncategorized",
                        price: mainVariant.unitPrice,
                        stock: variantStock, 
                    };
                });

                setProducts(formattedData);
            } catch (error) {
                console.error("Failed to load inventory:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchInventory();
    }, [isViewingArchived]);


    // 🚀 Fetch Brands and Categories for the Modal Dropdowns
    useEffect(() => {
        const fetchAttributes = async () => {
            try {
                // This matches the router.get('/products/attributes') in your api.js
                const res = await axios.get('/api/products/attributes');
                setFilterOptions(res.data);
            } catch (err) {
                console.error("Failed to fetch attributes:", err);
            }
        };
        fetchAttributes();
    }, []);

    // ✨ Instantly update the table when the modal finishes saving
    const handleProductAdded = (newProduct) => {
        // 1. Find the text name of the category from our filterOptions
        const categoryName = filterOptions.categories.find(c => c.id === newProduct.categoryId)?.name || "Uncategorized";

        // 2. Extract the variant and stock we just created
        const mainVariant = newProduct.variants?.[0] || {};
        const stock = mainVariant.inventories?.[0]?.quantity || 0;

        // 3. Map it to match the table's format
        const mappedProduct = {
            id: newProduct.id,
            name: newProduct.name,
            category: categoryName,
            price: mainVariant.unitPrice || 0,
            stock: stock,
        };

        // 4. Push it to the very top of the table!
        setProducts(prevProducts => [mappedProduct, ...prevProducts]);
    };

    // 🗑️ 2. The Delete Function (Triggered by Trash Button)
    const handleDelete = async (id) => {
        const isConfirmed = window.confirm("Are you sure you want to remove this product from the store?");
        if (!isConfirmed) return;

        try {
            // ⚠️ Assuming your router is set up as router.delete('/:id', deleteProduct)
            // If you mounted the routes under '/api/products', it should be `/api/products/${id}`. 
            // I'm using `/api/${id}` here based on your previous message.
            await axios.delete(`/api/${id}`); 

            // Instantly remove it from the table UI
            setProducts(prevProducts => prevProducts.filter(product => product.id !== id));
            
            alert("Product successfully deleted!");
        } catch (error) {
            console.error("Error deleting product:", error);
            alert("Failed to delete product from database.");
        }
    };
    const handleRestore = async (id) => {
        try {
            // Call the new PATCH route
            await axios.patch(`/api/${id}/restore`); // Adjust URL if needed
            // Instantly remove it from the "Archived" table view
            setProducts(prev => prev.filter(p => p.id !== id));
            alert("✨ Product restored! It is back on the main page.");
        } catch (error) {
            console.error("Error restoring:", error);
        }
    };

    // 🔎 Search Filter
    const filteredProducts = products.filter(product => 
        product.name.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // 💰 Price Formatter
    const formatPrice = (price) => {
        return new Intl.NumberFormat('vi-VN', { 
            style: 'currency', 
            currency: 'VND' 
        }).format(price);
    };

    // 📦 Stock Helpers
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
            {/* Header */}
            <header className="inventory-header">
                <div>
                    <h2>📦 Product Inventory</h2>
                    <p className="admin-subtitle">Manage your cosmetics catalog</p>
                </div>
                <div className="header-actions">
                    <button
                        className={`btn-toggle ${isViewingArchived ? 'btn-toggle-archived' : 'btn-toggle-active'}`}
                        onClick={() => setIsViewingArchived(!isViewingArchived)}
                    >
                        {isViewingArchived ? "<- Back to Active" : "🗑️ View Archived"}
                    </button>

                    {/* Change your Add New Product button to look like this: */}
                    <button className="btn-add" onClick={() => setIsAddModalOpen(true)}>
                        <FaPlus /> Add New Product
                    </button>
                </div>
            </header>

            {/* Search Bar */}
            <div className="search-container">
                <FaMagnifyingGlass className="search-icon" />
                <input 
                    type="text" 
                    placeholder="Search products..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                />
            </div>
            
            <AddProductModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                filterOptions={filterOptions}
                onSuccess={handleProductAdded}
            />
            {/* Table */}
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
                                        <td>
                                            <div className="product-cell">
                                                <div className="img-placeholder"><FaBoxOpen size={20}/></div>
                                                {product.name}
                                            </div>
                                        </td>
                                        <td><span className="badge tier-1">{product.category}</span></td>
                                        
                                        {/* 🎯 Applied the formatPrice function here! */}
                                        <td className="price-text">{formatPrice(product.price)}</td>
                                        
                                        <td>
                                            <span className={`badge badge-stock ${getStockClass(product.stock)}`}>
                                                {getStockLabel(product.stock)}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="actions-cell">
                                                <button title="Edit" className="btn-icon btn-edit"><FaPenToSquare /></button>
                                                
                                                {/* 🔀 DYNAMIC BUTTON: Show Restore if archived, Trash if active */}
                                                {isViewingArchived ? (
                                                    <button 
                                                        title="Restore Product" 
                                                        className="btn-icon btn-restore" 
                                                        onClick={() => handleRestore(product.id)}
                                                    >
                                                        <FaRotateLeft />
                                                    </button>
                                                ) : (
                                                    <button 
                                                        title="Delete" 
                                                        className="btn-icon btn-delete"
                                                        onClick={() => handleDelete(product.id)}
                                                    >
                                                        <FaTrash />
                                                    </button>
                                                )}
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