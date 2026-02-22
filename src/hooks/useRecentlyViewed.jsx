import { useState, useEffect } from "react";

const useRecentlyViewed = (currentProduct) => {
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    if (!currentProduct) return;

    // 1. Get existing list from LocalStorage
    let viewed = JSON.parse(localStorage.getItem("recentlyViewed")) || [];

    // 2. Remove duplicate if this product is already in list
    viewed = viewed.filter((p) => p.id !== currentProduct.id);

    // 3. Add current product to the FRONT
    viewed.unshift({
      id: currentProduct.id,
      name: currentProduct.name,
      image: currentProduct.image, // Make sure to pass a simple image URL
      price: currentProduct.price
    });

    // 4. Keep only top 5
    if (viewed.length > 5) viewed.pop();

    // 5. Save back
    localStorage.setItem("recentlyViewed", JSON.stringify(viewed));
    setRecent(viewed);
  }, [currentProduct]);

  return recent;
};

export default useRecentlyViewed;