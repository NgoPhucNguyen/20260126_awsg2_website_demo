// server/chatbot/tools/catalog.js
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


import { getSalesAnalyticsTool } from "./analyticsTools.js";

const allToolsMap = {
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
    getSalesAnalytics: getSalesAnalyticsTool,
};

const pickToolsMap = (toolNames) => Object.fromEntries(
    toolNames
        .map((name) => [name, allToolsMap[name]])
        .filter(([, toolDef]) => Boolean(toolDef))
);

export { allToolsMap, pickToolsMap };
