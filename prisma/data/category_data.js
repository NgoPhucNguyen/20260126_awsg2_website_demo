// prisma/category_data.js
export const categories = [
  // --- LEVEL 1 (PARENTS) ---
  { id: 1, name: 'Skin Care', nameVn: 'Chăm sóc da', categoryLevel: 1 },
  // --- LEVEL 2 (CHILDREN) ---
  { id: 2, name: 'Sunscreen', nameVn: 'Kem Chống Nắng', categoryLevel: 2, parentId: 1 },
  { id: 3, name: 'Mask', nameVn: 'Mặt Nạ', categoryLevel: 2, parentId: 1 },
  { id: 4, name: 'Serum', nameVn: 'Serum', categoryLevel: 2, parentId: 1 },
  { id: 5, name: 'Cleaners', nameVn: 'Sửa rửa mặt', categoryLevel: 2, parentId: 1 },
  { id: 6, name: 'Facial Exfoliator', nameVn: 'Tẩy tế bào chết', categoryLevel: 2, parentId: 1 },
  { id: 7, name: 'Makeup Remover', nameVn: 'Tẩy trang mặt', categoryLevel: 2, parentId: 1 },
  { id: 8, name: 'Balancing Water', nameVn: 'Nước cân bằng', categoryLevel: 2, parentId: 1 },
];