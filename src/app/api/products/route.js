// src/app/api/products/route.js
import { NextResponse } from 'next/server';
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
  if (price === null || typeof price === 'undefined' || isNaN(Number(price))) return 'N/A'; // Check if Number(price) is NaN
  return `₹${Number(price).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export async function GET(request) {
  console.log("API_PRODUCTS_ROUTE (Corrected Schema): Received GET request.");
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const categoryFilter = searchParams.get('category');

    let whereClause = {};
    if (query) {
      whereClause.OR = [
        { title: { contains: query, mode: 'insensitive' } },
        { category: { contains: query, mode: 'insensitive' } },
        { Sellers: { seller_name: { contains: query, mode: 'insensitive' } } }, 
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

    if (!prisma) {
      console.error("API_PRODUCTS_ROUTE: CRITICAL - Prisma client is not initialized!");
      return NextResponse.json({ message: 'Database client not initialized' }, { status: 500 });
    }

    const itemsFromDb = await prisma.items.findMany({
      where: whereClause,
      include: {
        Sellers: true, // Use 'Sellers' (capital S) as per your schema
      },
      orderBy: {
        rating: 'desc', // Order by 'rating' field from Items model
      }
    });
    console.log(`API_PRODUCTS_ROUTE: Found ${itemsFromDb.length} items from DB.`);

    const productList = itemsFromDb.map(item => ({
      id: Number(item.product_no), 
      product_no: Number(item.product_no),
      name: item.title,
      brand: item.Sellers?.seller_name || 'Unknown Brand', // Access via item.Sellers
      price: formatPrice(item.price),
      price_numeric: item.price !== null ? Number(item.price) : null, // Handle null before Number
      rating: item.rating || 0,
      reviews: item.rating_number !== null ? Number(item.rating_number) : 0, // Handle null
      image: item.image || null, 
      category: item.category,
    }));

    return NextResponse.json(productList);
  } catch (error) {
    console.error("API_PRODUCTS_ROUTE (Corrected Schema): Failed to fetch products:", error);
    return NextResponse.json({ message: 'Failed to fetch products', error: error.message }, { status: 500 });
  }
}