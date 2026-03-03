import axios from 'axios';

// 🌟 THE FIX: Use the env variable, OR fallback to localhost if it's missing
const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3500';

console.log("🔌 Current API URL:", BASE_URL);

export default axios.create({
    baseURL: BASE_URL
});

export const axiosPrivate = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true 
});