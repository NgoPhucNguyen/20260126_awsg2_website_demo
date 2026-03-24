// Product tools
import {
    searchProductsTool,
    getProductInfoTool,
    getProductsByCategoryTool,
    getProductVariantTool,
} from "./productTools.js";

// Category tools
import {
    getCategoriesTool,
    getCategoryDetailsTool,
    getBrandsTool,
} from "./categoryTools.js";

// Inventory tools
import {
    checkInventoryTool,
    getInventoryByWarehouseTool,
    getLowStockItemsTool,
} from "./inventoryTools.js";

// Coupon & Promotion tools
import {
    getCouponInfoTool,
    getAvailableCouponsTool,
    validateCouponTool,
    getPromotionsTool,
} from "./couponTools.js";

const tools = [
    // Product tools
    searchProductsTool,
    getProductInfoTool,
    getProductsByCategoryTool,
    getProductVariantTool,
    // Category tools
    getCategoriesTool,
    getCategoryDetailsTool,
    getBrandsTool,
    // Inventory tools
    checkInventoryTool,
    getInventoryByWarehouseTool,
    getLowStockItemsTool,
    // Coupon & Promotion tools
    getCouponInfoTool,
    getAvailableCouponsTool,
    validateCouponTool,
    getPromotionsTool,
];

const toolsMap = {
    // Product
    searchProducts: searchProductsTool,
    getProductInfo: getProductInfoTool,
    getProductsByCategory: getProductsByCategoryTool,
    getProductVariant: getProductVariantTool,
    // Category
    getCategories: getCategoriesTool,
    getCategoryDetails: getCategoryDetailsTool,
    getBrands: getBrandsTool,
    // Inventory
    checkInventory: checkInventoryTool,
    getInventoryByWarehouse: getInventoryByWarehouseTool,
    getLowStockItems: getLowStockItemsTool,
    // Coupon & Promotion
    getCouponInfo: getCouponInfoTool,
    getAvailableCoupons: getAvailableCouponsTool,
    validateCoupon: validateCouponTool,
    getPromotions: getPromotionsTool,
};

export { tools, toolsMap };