// prisma/category_data.js
export const categories = [
  // --- LEVEL 1 (PARENTS) ---
  { id: 1, name: 'Chăm Sóc Da', nameVn: 'Chăm sóc da', categoryLevel: 1 },
  // --- LEVEL 2 (CHILDREN) ---
  { id: 2, name: 'Kem Chống Nắng', nameVn: 'Kem Chống Nắng', categoryLevel: 2, parentId: 1 },
  { id: 3, name: 'Mặt Nạ', nameVn: 'Mặt nạ', categoryLevel: 2, parentId: 1 },
  { id: 4, name: 'Serum', nameVn: 'Serum', categoryLevel: 2, parentId: 1 },
  { id: 5, name: 'Sửa rửa mặt', nameVn: 'Sửa rửa mặt', categoryLevel: 2, parentId: 1 },
  { id: 6, name: 'Tẩy tế bào chết', nameVn: 'Tẩy tế bào chết', categoryLevel: 2, parentId: 1 },
  { id: 7, name: 'Tẩy trang mặt', nameVn: 'Tẩy trang mặt', categoryLevel: 2, parentId: 1 },
  { id: 8, name: 'Toner', nameVn: 'Toner', categoryLevel: 2, parentId: 1 },
];