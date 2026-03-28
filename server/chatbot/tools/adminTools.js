import { allToolsMap } from "./catalog.js";

const adminToolsMap = { ...allToolsMap };
const adminTools = Object.values(adminToolsMap);
const adminToolNames = Object.keys(adminToolsMap);

export { adminToolsMap, adminTools, adminToolNames };
