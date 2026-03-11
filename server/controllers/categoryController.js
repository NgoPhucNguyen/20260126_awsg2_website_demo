import prisma from '../prismaClient.js'

const getCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
        select: {
            id: true,
            name: true,
            nameVn: true,
        }
    });
    res.json(categories);
  } catch (error) {
    console.error('Error fetching categories:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

// const getCategoryById = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const category = await prisma.category.findUnique({
//       where: { id },
//       include: {
//         products: true
//       }
//     });
//     if (!category) {
//       return res.status(404).json({ error: 'Category not found' });
//     }
//     res.json(category);
//   } catch (error) {
//     console.error('Error fetching category:', error);
//     res.status(500).json({ error: 'Internal server error' });
//   }
// };

export {
  getCategories,
  // getCategoryById
}