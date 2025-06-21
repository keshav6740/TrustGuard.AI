// src/app/api/products/route.js
import { NextResponse } from 'next/server';
import prisma from 'C:/Users/Admin/Downloads/new/trust_guard/src/lib/prsima'; // Adjust the path as needed

const formatPrice = (price) => {
  if (price === null || typeof price === 'undefined') return 'N/A';
  return `₹${Number(price).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export async function GET(request) { // No 'context' or '{ params }' needed here for this route
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const categoryFilter = searchParams.get('category');

    let whereClause = {};
    if (query) {
      whereClause.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
        { seller: { seller_name: { contains: query, mode: 'insensitive' } } },
      ];
    }
    if (categoryFilter) {
        // Ensure categoryFilter is not empty before adding to whereClause
        if (whereClause.OR && categoryFilter) { // If OR exists, add category as an AND condition
            whereClause.AND = [
                ...(whereClause.AND || []), // Keep existing AND conditions if any
                { OR: whereClause.OR }, // Wrap existing OR
                { category: { equals: categoryFilter, mode: 'insensitive' } }
            ];
            delete whereClause.OR; // Remove top-level OR as it's now nested
        } else if (categoryFilter) { // If only category filter
            whereClause.category = { equals: categoryFilter, mode: 'insensitive' };
        }
    }


    const productsFromDb = await prisma.product.findMany({
      where: whereClause,
      include: {
        seller: {
          select: { seller_name: true },
        },
      },
      orderBy: {
        average_rating: 'desc',
      }
    });

    const productList = productsFromDb.map(p => ({
      id: p.id,
      product_no: p.product_no,
      name: p.title,
      brand: p.seller?.seller_name || p.store_seller_name || 'N/A',
      price: formatPrice(p.price),
      price_numeric: p.price,
      rating: p.average_rating || 0,
      reviews: p.rating_number || 0,
      image: p.image_url || 'https://via.placeholder.com/300x300.png?text=No+Image',
      category: p.category,
    }));

    return NextResponse.json(productList);
  } catch (error) {
    console.error("Failed to fetch products (list):", error); // Clarified log
    return NextResponse.json({ message: 'Failed to fetch products', error: error.message }, { status: 500 });
  }
}