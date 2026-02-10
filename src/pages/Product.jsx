import { useCart } from "../context/CartProvider"; // 👈 Import from your new Context folder
import "./Product.css"; 

// 🧪 MOCK DATA (We use this until your Backend API is ready)
const MOCK_PRODUCTS = [
    {
        id: 1,
        name: "Aphrodite Glow Serum",
        price: 25.00,
        image: "https://via.placeholder.com/300/FFB6C1/000000?text=Glow+Serum",
        description: "Radiant skin in just one drop. Infused with rose extracts."
    },
    {
        id: 2,
        name: "Rose Gold Moisturizer",
        price: 40.50,
        image: "https://via.placeholder.com/300/FFD700/000000?text=Gold+Cream",
        description: "Luxury hydration for your face with real gold particles."
    },
    {
        id: 3,
        name: "Midnight Eye Cream",
        price: 15.99,
        image: "https://via.placeholder.com/300/4B0082/FFFFFF?text=Eye+Care",
        description: "Say goodbye to dark circles and puffiness overnight."
    }
];

const Product = () => {
    // 🎣 Get the "addToCart" function from our Shared Brain
    const { addToCart } = useCart(); 

    return (
        <div className="product-page">
            <header className="product-header">
                <h1>Our Collection</h1>
                <p>Discover the secret to perfect skin.</p>
            </header>

            <div className="product-grid">
                {MOCK_PRODUCTS.map((product) => (
                    <div key={product.id} className="product-card">
                        {/* 🖼️ Image */}
                        <div className="card-image">
                            <img src={product.image} alt={product.name} />
                        </div>

                        {/* 📝 Details */}
                        <div className="card-details">
                            <h3>{product.name}</h3>
                            <p className="description">{product.description}</p>
                            <div className="price-row">
                                <span className="price">${product.price.toFixed(2)}</span>
                                <button 
                                    className="add-btn"
                                    onClick={() => addToCart(product)} // 🚀 SENDS TO CART.JSX
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