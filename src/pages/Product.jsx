// src/pages/Product.jsx
import axios from "../api/axios";
import { useEffect, useState, useRef } from "react";
import { useLocation } from "react-router-dom";
import { useCart } from "@/context/CartProvider";
import { getImageUrl } from "@/utils/getImageUrl";
import ProductFilter from "@/components/ProductComponents/ProductFilter";
import ProductCard from "@/components/ProductComponents/ProductCard";
import ProductCardSkeleton from "@/components/Skeleton/ProductCardSkeleton";
import "./Product.css"; // Xóa Breadcrumb import vì không thấy dùng trong return

// 🛠️ HELPER: Extract Variant Label
const getVariantLabel = (variant) => {
    if (!variant?.specification) return "Standard";
    try {
        const spec = typeof variant.specification === 'string' 
            ? JSON.parse(variant.specification) 
            : variant.specification;
        return spec?.size || spec?.volume || variant.sku;
    } catch (e) {
        return "Standard";
    }
};

const Product = () => {
    const { addToCart } = useCart();
    const location = useLocation();
    const gridRef = useRef(null);
    const [products, setProducts] = useState([]);
    const [filterOptions, setFilterOptions] = useState({ 
        brands: [], 
        categories: [],
        skinTypes : [] 
    });
    const [loading, setLoading] = useState(true);

    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 24; 

    // RESET PAGE ON FILTER CHANGE
    useEffect(() => {
        setCurrentPage(1);
    }, [location.search]);

    // 1. Fetch Attributes for Filters
    useEffect(() => {
        axios.get('/api/products/attributes')
            .then(res => setFilterOptions(res.data))
            .catch(err => console.error(err));
    }, []);

    // 2. Fetch Products & FLATTEN VARIANTS
    useEffect(() => {
        const controller = new AbortController();
        const fetchProducts = async () => {
            setLoading(true);
            try {
                const response = await axios.get(`/api/products${location.search}`, {
                    signal: controller.signal
                });
                
                const query = new URLSearchParams(location.search);
                const min = query.get('minPrice') ? Number(query.get('minPrice')) : 0;
                const max = query.get('maxPrice') ? Number(query.get('maxPrice')) : 99999999;

                const formattedData = response.data.flatMap(product => {
                    if (!product.variants || product.variants.length === 0) return [];

                    return product.variants
                    .filter(variant => variant.unitPrice >= min && variant.unitPrice <= max)
                    .map(variant => {
                        const variantLabel = getVariantLabel(variant);
                        const now = new Date();
                        const activePromo = variant.promotions?.find(p => {
                            const promo = p.promotion;
                            return new Date(promo.startTime) <= now && new Date(promo.endTime) >= now;
                        })?.promotion;
                        
                        let finalPrice = variant.unitPrice;
                        let isSale = false;

                        if (activePromo) {
                            const discount = activePromo.type === 'PERCENTAGE' 
                                ? (finalPrice * activePromo.value) / 100 
                                : activePromo.value;
                            finalPrice = Math.max(0, finalPrice - discount);
                            isSale = true;
                        }

                        return {
                            id: product.id, 
                            variantId: variant.id, 
                            name: `${product.name} - ${variantLabel}`, 
                            nameVn: product.nameVn ? `${product.nameVn} - ${variantLabel}` : `${product.name} - ${variantLabel}`,
                            brand: product.brand?.name,
                            description: product.description,
                            skinType: product.skinType,
                            size: variantLabel,
                            price: finalPrice, 
                            originalPrice: variant.unitPrice,
                            isSale: isSale,
                            discountValue: activePromo?.value,
                            discountType: activePromo?.type,
                            image: getImageUrl(variant.images?.[0]?.imageUrl),
                            stock : variant.stock
                        };
                    });
                });

                setProducts(formattedData);
                setLoading(false);
            } catch (err) {
                if (err.name !== 'CanceledError') setLoading(false);
            }
        };

        fetchProducts();
        return () => controller.abort();
    }, [location.search]);

    // CALCULATE THE SLICE FOR THE CURRENT PAGE
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentProducts = products.slice(indexOfFirstItem, indexOfLastItem); 
    const totalPages = Math.ceil(products.length / itemsPerPage);

    const generatePagination = () => {
        // Nếu số trang quá ít (ví dụ <= 5), hiện tất cả, không cần 3 chấm
        if (totalPages <= 5) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        // Trên Mobile, ta muốn thu gọn tối đa. delta = 1 nghĩa là hiện 1 trang trước và sau trang hiện tại
        const delta = 1; 
        const range = [];

        // Tính toán khoảng giữa
        for (
            let i = Math.max(2, currentPage - delta); 
            i <= Math.min(totalPages - 1, currentPage + delta); 
            i++
        ) {
            range.push(i);
        }

        // Chèn 3 chấm vào đầu nếu có khoảng cách
        if (currentPage - delta > 2) {
            range.unshift("...");
        }
        
        // Chèn 3 chấm vào cuối nếu có khoảng cách
        if (currentPage + delta < totalPages - 1) {
            range.push("...");
        }

        // Luôn nhét trang 1 vào đầu và trang cuối vào đuôi
        range.unshift(1);
        range.push(totalPages);

        return range;
    };
    const paginate = (pageNumber) => {
        // Chống lỗi nếu người dùng cố tình click vào dấu 3 chấm
        if (pageNumber === "...") return; 

        setCurrentPage(pageNumber);
        
        // Cuộn trang mượt mà lên đầu danh sách sản phẩm, TRỪ HAO đi chiều cao của Navbar (khoảng 100px)
        if (gridRef.current) {
            const yOffset = gridRef.current.getBoundingClientRect().top + window.scrollY - 100;
            window.scrollTo({ top: yOffset, behavior: 'smooth' });
        }
    };


    return (
        <div className="product-page-container">
            <main className="product-main" ref={gridRef}>
                <header className="product-header">
                    <div className="header-titles">
                        <h1>Sản Phẩm</h1>
                        <p>{products.length} tùy chọn có sẵn</p> 
                    </div>
                    <div className="header-actions">
                        <ProductFilter filterOptions={filterOptions} />
                    </div>
                </header>

                <div className="product-grid">
                    {loading ? (
                        [...Array(itemsPerPage)].map((_, index) => (
                            <ProductCardSkeleton key={`skeleton-${index}`} />
                        ))
                    ) : currentProducts.length > 0 ? (
                        currentProducts.map((item) => (
                            <ProductCard key={item.variantId} product={item} />
                        ))
                    ) : (
                        <div className="no-results">Không tìm thấy sản phẩm nào.</div>
                    )}
                </div>

                {/* PAGINATION UI CONTROLS */}
                {!loading && totalPages > 1 && (
                    <div className="pagination-container">
                        <button 
                            className="page-nav-btn"
                            disabled={currentPage === 1} 
                            onClick={() => paginate(currentPage - 1)}
                        >
                            &laquo; Trước
                        </button>

                        <div className="page-numbers">
                            {/* 🚀 GỌI HÀM THÔNG MINH THAY VÌ VÒNG LẶP TOÀN BỘ */}
                            {generatePagination().map((item, index) => (
                                item === "..." ? (
                                    // Render thẻ 3 chấm
                                    <span key={`ellipsis-${index}`} className="page-ellipsis">
                                        ...
                                    </span>
                                ) : (
                                    // Render nút bấm số trang
                                    <button 
                                        key={item} 
                                        className={`page-num-btn ${currentPage === item ? 'active' : ''}`} 
                                        onClick={() => paginate(item)}
                                    >
                                        {item}
                                    </button>
                                )
                            ))}
                        </div>

                        <button 
                            className="page-nav-btn"
                            disabled={currentPage === totalPages} 
                            onClick={() => paginate(currentPage + 1)}
                        >
                            Sau &raquo;
                        </button>
                    </div>
                )}
            </main>
        </div>
    );
};

export default Product;