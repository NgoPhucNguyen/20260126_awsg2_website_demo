// This file defines the admin tools available in the chatbot application. It imports all tools from the catalog and makes them accessible as admin tools.
// chatbot/tools/adminTools.js
import { allToolsMap } from "./catalog.js";

const adminToolsMap = { ...allToolsMap };
const adminTools = Object.values(adminToolsMap);
const adminToolNames = Object.keys(adminToolsMap);

export { adminToolsMap, adminTools, adminToolNames };
