import { useState } from "react";
import axios from "../api/axios";
import { FaXmark, FaCloudArrowUp, FaSpinner } from "react-icons/fa6";
import "./AddProductModal.css"; // We will create this next!

const AddProductModal = ({ isOpen, onClose, onSuccess, filterOptions }) => {
    // 1️⃣ Form State
    const [formData, setFormData] = useState({
        name: "",
        nameVn: "",
        brandId: "",
        categoryId: "",
        price: "",
        stock: "",
        description: "",
        ingredient: "",
        skinType: "",
        sku: ""
    });

    // 2️⃣ Image State
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    // Handle normal text input changes
    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    // Handle multiple file selection
    const handleFileChange = (e) => {
        // Convert the FileList object to a normal array
        setSelectedFiles(Array.from(e.target.files));
    };

    // 🚀 THE MASTER SUBMIT FUNCTION
    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsSubmitting(true);

        try {
            // STEP A: Upload all images to AWS S3 first!
            const uploadedUrls = [];
            
            // Loop through selected files and upload them simultaneously
            const uploadPromises = selectedFiles.map(async (file) => {
                const imageFormData = new FormData();
                imageFormData.append("image", file); // Must match upload.single('image') in backend
                
                const response = await axios.post("/api/upload", imageFormData, {
                    headers: { "Content-Type": "multipart/form-data" }
                });
                return response.data.url; // Extract the AWS URL
            });

            // Wait for ALL images to finish uploading
            const resolvedUrls = await Promise.all(uploadPromises);
            uploadedUrls.push(...resolvedUrls);

            // STEP B: Create the final package for the Database
            const productPayload = {
                name: formData.name,
                nameVn: formData.nameVn,
                brandId: formData.brandId,
                categoryId: formData.categoryId,
                unitPrice: formData.price,
                stock: formData.stock,
                description: formData.description,
                ingredient: formData.ingredient,
                skinType: formData.skinType,
                sku: formData.sku,
                imageUrls: uploadedUrls // 👈 Pass the array of AWS URLs!
            };

            // STEP C: Send to your Prisma Backend
            // Assuming your route is router.post('/products', createProduct)
            const response = await axios.post("/api/products", productPayload);

            // STEP D: Success! Close modal and update the table
            alert("✨ Product added successfully!");
            onSuccess(response.data.product); // Pass new product back to Inventory.jsx
            onClose(); 

        } catch (error) {
            console.error("Error creating product:", error);
            alert("❌ Failed to create product. Check console.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="inline-add-panel">
            {/* 📌 1. HEADER */}
            <div className="panel-header">
                <h2>✨ Add New Product</h2>
                <button type="button" className="btn-close" onClick={onClose}><FaXmark /></button>
            </div>

            {/* 📜 2. THE FORM GRID */}
            <form id="add-product-form" onSubmit={handleSubmit} className="product-form">
                
                <div className="form-group full-width">
                    <label>Product Images (Select multiple)</label>
                    <div className="file-upload-wrapper">
                        <FaCloudArrowUp size={24} color="#4f46e5" />
                        <input type="file" multiple accept="image/*" onChange={handleFileChange} required />
                        <p>{selectedFiles.length > 0 ? `${selectedFiles.length} files selected` : "Click or drag images here"}</p>
                    </div>
                </div>

                <div className="form-group">
                    <label>English Name *</label>
                    <input type="text" name="name" required onChange={handleChange} placeholder="e.g. Winter Melon Cleanser" />
                </div>

                <div className="form-group">
                    <label>Vietnamese Name</label>
                    <input type="text" name="nameVn" onChange={handleChange} placeholder="e.g. Gel bí đao rửa mặt" />
                </div>

                <div className="form-group">
                    <label>Brand *</label>
                    <select name="brandId" required onChange={handleChange}>
                        <option value="">Select a Brand</option>
                        {filterOptions?.brands?.map(brand => (
                            <option key={brand.id} value={brand.id}>{brand.name}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Category *</label>
                    <select name="categoryId" required onChange={handleChange}>
                        <option value="">Select a Category</option>
                        {filterOptions?.categories?.map(cat => (
                            <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Price (VND) *</label>
                    <input type="number" name="price" required min="0" onChange={handleChange} placeholder="145.000" />
                </div>

                <div className="form-group">
                    <label>Initial Stock *</label>
                    <input type="number" name="stock" required min="0" onChange={handleChange} placeholder="50" />
                </div>

                <div className="form-group">
                    <label>SKU (Optional)</label>
                    <input type="text" name="sku" placeholder="e.g. CC-BD-140" onChange={handleChange} />
                </div>

                <div className="form-group">
                    <label>Skin Type</label>
                    <select name="skinType" onChange={handleChange}>
                        <option value="">All Skin Types</option>
                        {filterOptions?.skinTypes?.map((type, idx) => (
                            <option key={idx} value={type}>{type}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group full-width">
                    <label>Key Ingredients *</label>
                    <input type="text" name="ingredient" placeholder="e.g. Vitamin C, Niacinamide" required onChange={handleChange} />
                </div>

                <div className="form-group full-width">
                    <label>Description</label>
                    <textarea name="description" rows="3" onChange={handleChange} placeholder="Enter product description..."></textarea>
                </div>
            </form>

            {/* 📌 3. PANEL ACTIONS */}
            <div className="panel-actions">
                <button type="button" className="btn-cancel" onClick={onClose} disabled={isSubmitting}>
                    Cancel
                </button>
                <button type="submit" form="add-product-form" className="btn-submit" disabled={isSubmitting}>
                    {isSubmitting ? <><FaSpinner className="spin" /> Saving...</> : "Save Product"}
                </button>
            </div>
        </div>
    );
};

export default AddProductModal;