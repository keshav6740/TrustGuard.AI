// src/app/api/products/[id]/route.js
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

let prisma;
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global._prismaProductIdRouteInstance) { 
    global._prismaProductIdRouteInstance = new PrismaClient();
  }
  prisma = global._prismaProductIdRouteInstance;
}

const formatPrice = (price) => {
  if (price === null || typeof price === 'undefined' || isNaN(Number(price))) return 'N/A';
  return `₹${Number(price).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export async function GET(request, { params }) { 
  console.log(`API_PRODUCT_ID_ROUTE (Corrected Schema): Destructured params received: ${JSON.stringify(params)}`);
  try {
    const productNoFromParams = params?.id; 

    if (!productNoFromParams) {
        console.error("API_PRODUCT_ID_ROUTE: Product No. parameter is missing from params:", params);
        return NextResponse.json({ message: 'Product number parameter is missing' }, { status: 400 });
    }
    
    let queryProductNo;
    try {
        queryProductNo = BigInt(productNoFromParams);
    } catch (e) {
        console.error("API_PRODUCT_ID_ROUTE: Invalid product number format (not a BigInt):", productNoFromParams);
        return NextResponse.json({ message: 'Invalid product number format' }, { status: 400 });
    }

    if (!prisma) {
      console.error("API_PRODUCT_ID_ROUTE: CRITICAL - Prisma client is not initialized!");
      return NextResponse.json({ message: 'Database client not initialized' }, { status: 500 });
    }
    console.log(`API_PRODUCT_ID_ROUTE: Fetching item with product_no: ${queryProductNo}`);

    const itemFromDb = await prisma.items.findUnique({
      where: { product_no: queryProductNo },
      include: {
        Sellers: true, // Use 'Sellers' (capital S)
        Reviews: {    // Use 'Reviews' (capital R)
          include: {
            Users: true // Use 'Users' (capital U)
          },
          orderBy: { review_id: 'desc' }, 
        },
      },
    });

    if (!itemFromDb) {
      console.log(`API_PRODUCT_ID_ROUTE: Item not found for product_no: ${queryProductNo}`);
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }
    console.log(`API_PRODUCT_ID_ROUTE: Item found: ${itemFromDb.title}`);

    const responseProduct = {
      id: Number(itemFromDb.product_no),
      product_no: Number(itemFromDb.product_no),
      name: itemFromDb.title,
      brand: itemFromDb.Sellers?.seller_name || 'Unknown Brand',
      category: itemFromDb.category,
      price: formatPrice(itemFromDb.price),
      price_numeric: itemFromDb.price !== null ? Number(itemFromDb.price) : null,
      rating: itemFromDb.rating || 0,
      reviewsCount: itemFromDb.rating_number !== null ? Number(itemFromDb.rating_number) : 0,
      image: itemFromDb.image || null,
      detailImage: itemFromDb.image || null, 
      // Your new 'Items' schema doesn't explicitly list 'thumbnail_urls'.
      // We'll use the main image as a single thumbnail if it exists.
      thumbnails: itemFromDb.image ? [itemFromDb.image] : [], 
      description: itemFromDb.description || "No description available.",
      // Your new 'Items' schema doesn't explicitly list 'sizes' or 'shipping_info'.
      // Provide defaults or adapt if these are in a 'details' JSON blob or similar.
      sizes: [], 
      shipping: [{ label: "Standard Shipping", value: "3-5 working days (est.)" }], 

      reviews_list: itemFromDb.Reviews.map(r => ({ // Access via itemFromDb.Reviews
        review_id: Number(r.review_id),
        name: r.Users?.username || 'Anonymous', // Access via r.Users
        user_id_original: r.Users?.user_id,
        rating: r.rating,
        date: r.date_time, // Keep as string from DB, frontend can format
        comment: r.text,
        title: r.title,
        helpful_vote: r.helpful_vote !== null ? Number(r.helpful_vote) : 0,
      })),
      
      verified_product: itemFromDb.verified_product,
      // These fields were from your older schema. Remove or map if they exist differently now.
      // details_json: itemFromDb.details, // If 'details' is not a field in new 'Items' schema, this will be undefined.
      // review_summary: itemFromDb.review_summary,
      // fake_review_percentage: itemFromDb.fake_review_percentage,

      seller_info: itemFromDb.Sellers ? { // Access via itemFromDb.Sellers
        id: itemFromDb.Sellers.seller_id, 
        seller_id_original: itemFromDb.Sellers.seller_id,
        name: itemFromDb.Sellers.seller_name,
        total_products: itemFromDb.Sellers.total_products !== null ? Number(itemFromDb.Sellers.total_products) : 0,
        is_verified: itemFromDb.Sellers.is_verified,
        // trust_score: itemFromDb.Sellers.trust_score, // 'Sellers' model doesn't have trust_score in new schema
      } : null,
    };

    return NextResponse.json(responseProduct);
  } catch (error) {
    console.error(`API_PRODUCT_ID_ROUTE (Corrected Schema): Failed to fetch product with params '${JSON.stringify(params)}':`, error); 
    return NextResponse.json({ message: 'Failed to fetch product', error: "An unexpected server error occurred." }, { status: 500 });
  }
}