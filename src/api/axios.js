import axios from 'axios';

// BASE URL for localhost and CLOUD_FRONT_URL (Nguyen's cloud_front)
const BASE_URL = import.meta.env.VITE_API_URL

console.log("🔌 Current API URL:", BASE_URL);

export default axios.create({
    baseURL: BASE_URL
});

export const axiosPrivate = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true 
});