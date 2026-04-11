import { allToolsMap } from "./catalog.js";
import { adminTools, adminToolsMap } from "./adminTools.js";
import { customerTools, customerToolsMap } from "./customerTools.js";
// import { employeeTools, employeeToolsMap } from "./employeeTools.js";

const allTools = Object.values(allToolsMap);

const getToolsForRole = (role) => {
    if (Number(role) === Number(process.env.ADMIN_ROLE)) {
        return adminTools;
    } if (Number(role) === Number(process.env.CUSTOMER_ROLE)) {
        return customerTools;
    } if (Number(role) === Number(process.env.EMPLOYEE_ROLE)) {
        return employeeTools;
    }
};

const getToolsMapForRole = (role) => {
    if (Number(role) === Number(process.env.ADMIN_ROLE)) {
        return adminToolsMap;
    } if (Number(role) === Number(process.env.CUSTOMER_ROLE)) {
        return customerToolsMap;
    } if (Number(role) === Number(process.env.EMPLOYEE_ROLE)) {
        return employeeToolsMap;
    }
};

export {
    // allTools,
    // allToolsMap,
    // customerTools,
    // customerToolsMap,
    // adminTools,
    // adminToolsMap,
    getToolsForRole,
    getToolsMapForRole,
};