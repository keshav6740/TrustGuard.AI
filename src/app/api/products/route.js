// src/app/api/products/route.js
import { NextResponse } from 'next/server';
// Ensure this import is correct (direct instantiation if alias/relative still failing)
import { PrismaClient } from '@prisma/client';

let prisma;
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global._prismaProductListRouteInstance) { 
    global._prismaProductListRouteInstance = new PrismaClient();
  }
  prisma = global._prismaProductListRouteInstance;
}

const formatPrice = (price) => {
  if (price === null || typeof price === 'undefined') return 'N/A';
  return `₹${Number(price).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export async function GET(request) {
  // console.log("API_PRODUCTS_ROUTE: Received GET request."); // Keep for debugging if needed
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
        if (whereClause.OR && categoryFilter) {
            whereClause.AND = [
                ...(whereClause.AND || []),
                { OR: whereClause.OR },
                { category: { equals: categoryFilter, mode: 'insensitive' } }
            ];
            delete whereClause.OR; 
        } else if (categoryFilter) {
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
      image: p.image_url || null, // Ensures null is sent if DB field is null/empty
      category: p.category,
    }));

    return NextResponse.json(productList);
  } catch (error) {
    console.error("API_PRODUCTS_ROUTE: Failed to fetch products (list):", error);
    return NextResponse.json({ message: 'Failed to fetch products', error: error.message }, { status: 500 });
  }
}