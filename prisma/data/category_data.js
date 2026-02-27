// prisma/category_data.js
export const categories = [
  // --- LEVEL 1 (PARENTS) ---
  { id: 1, name: 'Skin Care', nameVn: 'Chăm sóc da', categoryLevel: 1 },
  { id: 100, name: 'Makeup', nameVn: 'Trang điểm', categoryLevel: 1 },

  // --- LEVEL 2 (CHILDREN) ---
  { id: 2, name: 'Cleanser', nameVn: 'Làm sạch', categoryLevel: 2, parentId: 1 },
  { id: 3, name: 'Face Mask', nameVn: 'Mặt nạ', categoryLevel: 2, parentId: 1 },
  { id: 101, name: 'Lipstick', nameVn: 'Son môi', categoryLevel: 2, parentId: 100 }
];