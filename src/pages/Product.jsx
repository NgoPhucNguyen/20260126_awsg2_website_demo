import axios from "@/api/axios";
import { useEffect, useState, useRef, useMemo } from "react";
import { useLocation, useSearchParams, useNavigate } from "react-router-dom";
import { useCart } from "@/context/CartProvider";
import { getImageUrl } from "@/utils/getImageUrl";
import { FiX } from "react-icons/fi";
import ProductFilter from "@/components/ProductComponents/ProductFilter";
import ProductCard from "@/components/ProductComponents/ProductCard";
import ProductCardSkeleton from "@/components/Skeleton/ProductCardSkeleton";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import "./Product.css";
import { faBagShopping, faSpinner, faWandMagicSparkles  } from '@fortawesome/free-solid-svg-icons';

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
    const navigate = useNavigate();
    const location = useLocation();
    const gridRef = useRef(null);
    const [products, setProducts] = useState([]);
    const [searchParams, setSearchParams] = useSearchParams();
    const [filterOptions, setFilterOptions] = useState({ 
        brands: [], 
        categories: [],
        skinTypes : [] 
    });
    const [loading, setLoading] = useState(true);

    // 🚀 STATE SẮP XẾP MỚI
    const [sortOrder, setSortOrder] = useState("default"); // 'default', 'price_asc', 'price_desc'

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

    // 🚀 1. LẤY DANH SÁCH TAGS (ĐÃ ĐƯỢC TÁCH NHỎ & XÓA KHOẢNG TRẮNG)
    const activeFilters = useMemo(() => {
        const query = new URLSearchParams(location.search);
        const filters = [];
        
        // Thương hiệu
        const brandIds = query.get('brandId');
        if (brandIds && filterOptions.brands && filterOptions.brands.length > 0) {
            brandIds.split(',').forEach(id => {
                const cleanId = id.trim(); // Cắt bỏ khoảng trắng thừa
                const brand = filterOptions.brands.find(b => b.id.toString() === cleanId);
                if (brand) {
                    filters.push({ type: 'brandId', id: cleanId, label: 'Thương hiệu', value: brand.name });
                }
            });
        }

        // Danh mục
        const catIds = query.get('categoryId');
        if (catIds && filterOptions.categories && filterOptions.categories.length > 0) {
            catIds.split(',').forEach(id => {
                const cleanId = id.trim();
                const cat = filterOptions.categories.find(c => c.id.toString() === cleanId);
                if (cat) {
                    filters.push({ type: 'categoryId', id: cleanId, label: 'Danh mục', value: cat.nameVn || cat.name });
                }
            });
        }

        // Loại da
        const skinTypes = query.get('skinType');
        if (skinTypes) {
            skinTypes.split(',').forEach(skin => {
                const cleanSkin = skin.trim();
                filters.push({ type: 'skinType', id: cleanSkin, label: 'Loại da', value: cleanSkin });
            });
        }

        // Giá tiền
        const minPrice = query.get('minPrice');
        const maxPrice = query.get('maxPrice');
        if (minPrice || maxPrice) {
            const safeMin = minPrice ? parseInt(minPrice, 10) : 0;
            const safeMax = maxPrice ? parseInt(maxPrice, 10) : 99999999;
            if (safeMin > 10000 || safeMax < 10000000) {
                const formatVND = (val) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
                filters.push({ 
                    type: 'price', id: 'price', label: 'Khoảng giá', 
                    value: `${formatVND(safeMin)} - ${formatVND(safeMax)}` 
                });
            }
        }

        return filters;
    }, [location.search, filterOptions]);

    // 🚀 2. HÀM XÓA TỪNG THẺ (DÙNG PREVPARAMS ĐỂ LUÔN CHUẨN XÁC)
    const removeFilter = (type, idToRemove) => {
        setSearchParams(prevParams => {
            if (type === 'price') {
                prevParams.delete('minPrice');
                prevParams.delete('maxPrice');
            } else {
                const currentValues = prevParams.get(type);
                if (currentValues) {
                    // Tách chuỗi, gọt khoảng trắng và lọc bỏ cái cần xóa
                    const updatedValues = currentValues
                        .split(',')
                        .map(id => id.trim())
                        .filter(id => id !== String(idToRemove).trim());

                    if (updatedValues.length > 0) {
                        prevParams.set(type, updatedValues.join(','));
                    } else {
                        prevParams.delete(type);
                    }
                }
            }
            return prevParams; // Báo cho React Router áp dụng URL mới
        });
    };

    // 🚀 3. HÀM XÓA TẤT CẢ (DÙNG PREVPARAMS)
    const clearAllFilters = () => {
        setSearchParams(prevParams => {
            prevParams.delete('brandId');
            prevParams.delete('categoryId');
            prevParams.delete('skinType');
            prevParams.delete('minPrice');
            prevParams.delete('maxPrice');
            return prevParams;
        });
    };

    // 🚀 XỬ LÝ SẮP XẾP SẢN PHẨM
    const sortedProducts = useMemo(() => {
        let sortableItems = [...products];
        if (sortOrder === "price_asc") {
            sortableItems.sort((a, b) => a.price - b.price);
        } else if (sortOrder === "price_desc") {
            sortableItems.sort((a, b) => b.price - a.price);
        }
        return sortableItems;
    }, [products, sortOrder]);


    // CALCULATE THE SLICE FOR THE CURRENT PAGE (Dùng sortedProducts)
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentProducts = sortedProducts.slice(indexOfFirstItem, indexOfLastItem); 
    const totalPages = Math.ceil(sortedProducts.length / itemsPerPage);

    const generatePagination = () => {
        if (totalPages <= 5) {
            return Array.from({ length: totalPages }, (_, i) => i + 1);
        }

        const delta = 1; 
        const range = [];

        for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
            range.push(i);
        }

        if (currentPage - delta > 2) range.unshift("...");
        if (currentPage + delta < totalPages - 1) range.push("...");

        range.unshift(1);
        range.push(totalPages);

        return range;
    };

    const paginate = (pageNumber) => {
        if (pageNumber === "...") return; 
        setCurrentPage(pageNumber);
        
        if (gridRef.current) {
            const yOffset = gridRef.current.getBoundingClientRect().top + window.scrollY - 100;
            window.scrollTo({ top: yOffset, behavior: 'smooth' });
        }
    };


    return (
        <div className="product-page-container">
            <main className="product-page-main" ref={gridRef}>
                <header className="product-page-header">
                    <div className="product-page-header-top">
                        <div className="product-page-header-titles">
                            <div className="product-page-title-group">
                                <h1>Sản Phẩm</h1>
                                <p>{products.length} tùy chọn có sẵn</p>
                                <button 
                                    type="button" 
                                    className="product-page-analyze-btn" 
                                    onClick={() => navigate('/analyze-skin')}
                                >
                                    <FontAwesomeIcon icon={faWandMagicSparkles} className="product-page-magic-icon" />
                                    <span>Phân tích da</span>
                                </button>
                            </div> 
                        </div>
                        <div className="product-page-header-actions">
                            {/* 🚀 DROP DOWN SẮP XẾP MỚI */}
                            <select 
                                className="product-page-sort-select" 
                                value={sortOrder} 
                                onChange={(e) => setSortOrder(e.target.value)}
                            >
                                <option value="default">Sắp xếp: Mặc định</option>
                                <option value="price_asc">Giá: Thấp đến Cao</option>
                                <option value="price_desc">Giá: Cao đến Thấp</option>
                            </select>

                            <ProductFilter filterOptions={filterOptions} />
                        </div>
                    </div>

                    {/* 🚀 KHU VỰC HIỂN THỊ FILTER ĐANG CHỌN */}
                    {activeFilters.length > 0 && (
                        <div className="product-page-active-filters">
                            <span className="product-page-filter-label">Đang lọc theo:</span>
                            
                            {activeFilters.map((filter, index) => (
                                <span key={`${filter.type}-${filter.id}-${index}`} className="product-page-filter-tag">
                                    <strong>{filter.label}:</strong> {filter.value}
                                    <button 
                                        className="product-page-filter-tag-close" 
                                        onClick={() => removeFilter(filter.type, filter.id)}
                                        aria-label={`Xóa lọc ${filter.value}`}
                                    >
                                        <FiX />
                                    </button>
                                </span>
                            ))}

                            {/* Nút Xóa tất cả */}
                            <button className="product-page-clear-all-btn" onClick={clearAllFilters}>
                                Xóa tất cả
                            </button>
                        </div>
                    )}
                </header>

                <div className="product-page-grid">
                    {loading ? (
                        [...Array(itemsPerPage)].map((_, index) => (
                            <ProductCardSkeleton key={`skeleton-${index}`} />
                        ))
                    ) : currentProducts.length > 0 ? (
                        currentProducts.map((item) => (
                            <ProductCard key={item.variantId} product={item} />
                        ))
                    ) : (
                        <div className="product-page-no-results">Không tìm thấy sản phẩm nào.</div>
                    )}
                </div>

                {/* PAGINATION UI CONTROLS */}
                {!loading && totalPages > 1 && (
                    <div className="product-page-pagination-container">
                        <button 
                            className="product-page-nav-btn"
                            disabled={currentPage === 1} 
                            onClick={() => paginate(currentPage - 1)}
                        >
                            &laquo; Trước
                        </button>

                        <div className="product-page-numbers">
                            {generatePagination().map((item, index) => (
                                item === "..." ? (
                                    <span key={`ellipsis-${index}`} className="product-page-ellipsis">
                                        ...
                                    </span>
                                ) : (
                                    <button 
                                        key={item} 
                                        className={`product-page-num-btn ${currentPage === item ? 'active' : ''}`} 
                                        onClick={() => paginate(item)}
                                    >
                                        {item}
                                    </button>
                                )
                            ))}
                        </div>

                        <button 
                            className="product-page-nav-btn"
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