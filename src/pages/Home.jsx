import "./Home.css"; // 👈 Import the new styles

const Home = () => {
    // Note: We removed useLogout/useNavigate/Link because 
    // the Navbar handles navigation now! 
    
    return (
        <section className="home-container">
            {/* 1. The Hero Section */}
            <div className="hero">
                <h1 className="hero-title">ABCDEFGH</h1>
                <p className="hero-subtitle">
                    Welcome to the new standard of beauty. 
                    Explore our collection of organic serums and daily cleansers 
                    designed to nourish your natural glow.
                </p>
                <p className="hero-subtitle">
                    Welcome to the new standard of beauty. 
                    Explore our collection of organic serums and daily cleansers 
                    designed to nourish your natural glow.
                </p>
                <p className="hero-subtitle">
                    Welcome to the new standard of beauty. 
                    Explore our collection of organic serums and daily cleansers 
                    designed to nourish your natural glow.
                </p>
                <p className="hero-subtitle">
                    Welcome to the new standard of beauty. 
                    Explore our collection of organic serums and daily cleansers 
                    designed to nourish your natural glow.
                </p>
                <p className="hero-subtitle">
                    Welcome to the new standard of beauty. 
                    Explore our collection of organic serums and daily cleansers 
                    designed to nourish your natural glow.
                </p>
                <p className="hero-subtitle">
                    Welcome to the new standard of beauty. 
                    Explore our collection of organic serums and daily cleansers 
                    designed to nourish your natural glow.
                </p>
                <p className="hero-subtitle">
                    Welcome to the new standard of beauty. 
                    Explore our collection of organic serums and daily cleansers 
                    designed to nourish your natural glow.
                </p>
                <p className="hero-subtitle">
                    Welcome to the new standard of beauty. 
                    Explore our collection of organic serums and daily cleansers 
                    designed to nourish your natural glow.
                </p>
                <p className="hero-subtitle">
                    Welcome to the new standard of beauty. 
                    Explore our collection of organic serums and daily cleansers 
                    designed to nourish your natural glow.
                </p>
            </div>
            
            {/* NOTE: The "Sign Out" and "Admin" links are now 
               safely inside your Navbar, so we don't need to 
               repeat them here. Simplicity = Luxury.
            */}
        </section>
    );
}

export default Home;