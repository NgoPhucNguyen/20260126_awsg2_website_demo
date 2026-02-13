// src/pages/Product.jsx
import { useEffect, useState } from "react";
import { useCart } from "../context/CartProvider";
import "./Product.css";

const Product = () => {
    const { addToCart } = useCart();
    
    // 1. State to hold real data
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // 2. Fetch Data from API
    useEffect(() => {
        const fetchProducts = async () => {
            try {
                // Make sure this URL matches your backend port (e.g., localhost:5000)
                const response = await fetch('http://localhost:3500/api/products'); 
                
                if (!response.ok) {
                    throw new Error('Failed to connect to Server');
                }

                const data = await response.json();

                // 3. TRANSFORM DATA (The Magic Step) 🪄
                // We convert nested DB structure to flat UI structure
                const formattedData = data.map(item => {
                    // Grab the first variant (e.g., the 140ml bottle) as the default display
                    const defaultVariant = item.variants[0]; 
                    const defaultImage = defaultVariant?.images[0]?.imageUrl;

                    return {
                        id: item.id,
                        name: item.name,
                        // If no variant, default to 0. Real price is in variants.
                        price: defaultVariant ? defaultVariant.unitPrice : 0, 
                        // Use local image path from DB, or a placeholder if missing
                        image: defaultImage || "https://via.placeholder.com/300?text=No+Image",
                        description: item.description
                    };
                });

                setProducts(formattedData);
                setLoading(false);
            } catch (err) {
                console.error("Error fetching products:", err);
                setError("Could not load products. Is the server running?");
                setLoading(false);
            }
        };

        fetchProducts();
    }, []);

    if (loading) return <div className="loading">Loading our collection...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <div className="product-page">
            <header className="product-header">
                <h1>Our Collection</h1>
                <p>Discover the secret to perfect skin.</p>
            </header>

            <div className="product-grid">
                {products.map((product) => (
                    <div key={product.id} className="product-card">
                        {/* 🖼️ Image */}
                        <div className="card-image">
                            {/* NOTE: Since we are using local images, make sure 
                               your backend serves the 'public' folder or 
                               images are in the frontend 'public' folder.
                            */}
                            <img src={product.image} alt={product.name} />
                        </div>

                        {/* 📝 Details */}
                        <div className="card-details">
                            <h3>{product.name}</h3>
                            <p className="description">{product.description}</p>
                            <div className="price-row">
                                {/* Format price to currency (VND or USD) */}
                                <span className="price">
                                    {new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(product.price)}
                                </span>
                                <button 
                                    className="add-btn"
                                    onClick={() => addToCart(product)} 
                                >
                                    Add to Bag
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default Product;