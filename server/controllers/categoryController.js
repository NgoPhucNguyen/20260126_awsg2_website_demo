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

export {
  getCategories,
}