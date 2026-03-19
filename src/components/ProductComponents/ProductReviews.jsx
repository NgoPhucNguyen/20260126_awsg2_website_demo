import { useState, useEffect } from "react";
import "./ProductReviews.css";

const ProductReviews = ({ productId }) => {
    const [reviews, setReviews] = useState([]);
    const [newReview, setNewReview] = useState({ rating: 5, comment: "", name: "", skinType: "All" });

    useEffect(() => {
        // 1. Load "Fake" Reviews (So your demo looks popular)
        const mockReviews = [
            { id: 991, name: "Minh Thu", rating: 5, comment: "Really helped my oily skin!", skinType: "Oily", date: "2023-10-15" },
            { id: 992, name: "Jessica", rating: 4, comment: "Smells nice, very gentle.", skinType: "Dry", date: "2023-11-02" },
            { id: 993, name: "Hoang Nam", rating: 5, comment: "Best cleanser I have used.", skinType: "Combination", date: "2023-12-10" }
        ];

        // 2. Load "User" Reviews from Browser Storage
        const localReviews = JSON.parse(localStorage.getItem(`reviews_${productId}`)) || [];

        // 3. Combine them (User reviews on top)
        setReviews([...localReviews, ...mockReviews]);
    }, [productId]);

    const handleSubmit = (e) => {
        e.preventDefault();
        
        const reviewToAdd = {
            id: Date.now(), // Unique ID based on time
            ...newReview,
            date: new Date().toLocaleDateString()
        };

        // Update State
        const updatedReviews = [reviewToAdd, ...reviews];
        setReviews(updatedReviews);

        // Save to LocalStorage (Persist data for this user only)
        const localReviews = JSON.parse(localStorage.getItem(`reviews_${productId}`)) || [];
        localStorage.setItem(`reviews_${productId}`, JSON.stringify([reviewToAdd, ...localReviews]));

        // Reset Form
        setNewReview({ rating: 5, comment: "", name: "", skinType: "All" });
    };

    return (
        <div className="reviews-section">
            <h2 className="reviews-title">Customer Reviews</h2>

            {/* REVIEWS LIST */}
            <div className="reviews-list">
                {reviews.map((review) => (
                    <div key={review.id} className="review-card">
                        <div className="review-header">
                            <span className="review-name">{review.name}</span>
                            <span className="review-date">{review.date}</span>
                        </div>
                        
                        <div className="review-rating">
                            {[...Array(5)].map((_, i) => (
                                <span key={i} className={i < review.rating ? "star filled" : "star"}>★</span>
                            ))}
                            <span className={`skin-badge ${review.skinType.toLowerCase()}`}>
                                {review.skinType} Skin
                            </span>
                        </div>
                        
                        <p className="review-comment">{review.comment}</p>
                    </div>
                ))}
            </div>

            {/* FORM */}
            <form className="review-form" onSubmit={handleSubmit}>
                <h3>Write a Review</h3>
                <div className="form-row">
                    <input 
                        type="text" 
                        placeholder="Your Name" 
                        required 
                        value={newReview.name}
                        onChange={e => setNewReview({...newReview, name: e.target.value})}
                    />
                    <select 
                        value={newReview.skinType}
                        onChange={e => setNewReview({...newReview, skinType: e.target.value})}
                    >
                        <option value="All">Select Skin Type</option>
                        <option value="Oily">Oily</option>
                        <option value="Dry">Dry</option>
                        <option value="Combination">Combination</option>
                        <option value="Sensitive">Sensitive</option>
                    </select>
                </div>

                <div className="form-row">
                    <label>Rating:</label>
                    <select 
                        value={newReview.rating}
                        onChange={e => setNewReview({...newReview, rating: Number(e.target.value)})}
                    >
                        <option value="5">⭐⭐⭐⭐⭐ (Excellent)</option>
                        <option value="4">⭐⭐⭐⭐ (Good)</option>
                        <option value="3">⭐⭐⭐ (Average)</option>
                        <option value="2">⭐⭐ (Poor)</option>
                        <option value="1">⭐ (Terrible)</option>
                    </select>
                </div>

                <textarea 
                    placeholder="Share your thoughts..." 
                    required
                    value={newReview.comment}
                    onChange={e => setNewReview({...newReview, comment: e.target.value})}
                />

                <button type="submit" className="submit-review-btn">Submit Review</button>
            </form>
        </div>
    );
};

export default ProductReviews;