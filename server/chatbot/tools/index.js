// server/chatbot/tools/index.js
import { adminTools, adminToolsMap } from "./adminTools.js";
import { customerTools, customerToolsMap } from "./customerTools.js";

const getToolsForRole = (role) => {
    const roleKey = Number(role);
    // 1. Nếu là Admin tối cao
    if (roleKey === Number(process.env.ADMIN_ROLE)) {
        return adminTools;
    } 
    // 2. Mọi trường hợp còn lại (Customer hoặc Guest)
    // Lưu ý: Controller của sếp đang mặc định Guest là CUSTOMER_ROLE, 
    // nên dùng chung bộ customerTools là chuẩn bài.
    return customerTools;
};

const getToolsMapForRole = (role) => {
    const roleKey = Number(role);

    if (roleKey === Number(process.env.ADMIN_ROLE)) {
        return adminToolsMap;
    } 

    return customerToolsMap;
};

export {
    getToolsForRole,
    getToolsMapForRole,
};