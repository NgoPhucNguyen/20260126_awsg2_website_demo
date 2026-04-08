// src/hooks/useDebounce.js
import { useState, useEffect } from "react";

export const useDebounce = (value, delay) => {
    const [debouncedValue, setDebouncedValue] = useState(value);

    useEffect(() => {
        // Cài đặt một bộ đếm giờ (timer)
        const handler = setTimeout(() => {
            setDebouncedValue(value);
        }, delay);

        // Cleanup function: Hủy bỏ timer nếu người dùng tiếp tục gõ
        // (để nó không chạy cái cũ nữa mà bắt đầu đếm lại từ đầu)
        return () => {
            clearTimeout(handler);
        };
    }, [value, delay]); // Chỉ chạy lại khi value hoặc delay thay đổi

    return debouncedValue;
};