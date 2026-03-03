export const getImageUrl = (imagePath) => {
    // 1️⃣ Fallback for missing database data
    if (!imagePath) return 'https://via.placeholder.com/300?text=No+Image';

    // 2️⃣ If it's already a full web URL, don't touch it
    if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
        return imagePath;
    }

    // 3️⃣ THE MAGIC SWITCH: 
    // In Production (Amplify), this grabs the CloudFront URL.
    // In Local (Dev), this falls back to an empty string ('').
    const baseUrl = import.meta.env.VITE_IMAGE_URL || '';
    
    // Prevent double slashes
    const cleanBaseUrl = baseUrl.replace(/\/+$/, ''); 
    const cleanPath = imagePath.startsWith('/') ? imagePath : `/${imagePath}`;

    // 💡 If Local: returns "/images/products/pic.jpg"
    // 💡 If Prod: returns "https://d26.cloudfront.net/images/products/pic.jpg"
    return `${cleanBaseUrl}${cleanPath}`;
};