// src/utils/dateUtils.js

// Hàm ép kiểu ngày tháng sang định dạng của thẻ <input type="datetime-local">
export const formatToLocalDatetime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const tzOffset = date.getTimezoneOffset() * 60000;
    const localISOTime = (new Date(date - tzOffset)).toISOString().slice(0, 16);
    return localISOTime;
};

// Hàm format ngày giờ hiển thị cho khách hàng (DD/MM/YYYY)
export const formatDateTimeVn = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN') + ' - ' + date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
};