import axios from 'axios';

// 🛠️ CHANGE THIS: This must match your Python/Node backend URL
const BASE_URL = 'http://localhost:3500'; 

export default axios.create({
    baseURL: BASE_URL
});

export const axiosPrivate = axios.create({
    baseURL: BASE_URL,
    headers: { 'Content-Type': 'application/json' },
    withCredentials: true 
});