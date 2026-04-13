// chatbot/tool/customerTools.js
import { allToolsMap, pickToolsMap } from "./catalog.js";

const customerToolNames = [
    "searchProducts",
    "getProductInfo",
    "getProductsByCategory",
    "getProductVariant",
    "getCategories",
    "getCategoryDetails",
    "getBrands",
    "checkInventory",
    "getCouponInfo",
    "getAvailableCoupons",
    "validateCoupon",
    "getPromotions",
];

const customerToolsMap = pickToolsMap(customerToolNames);
const customerTools = Object.values(customerToolsMap);

export { customerToolsMap, customerTools, customerToolNames };
