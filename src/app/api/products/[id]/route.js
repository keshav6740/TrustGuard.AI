// src/app/api/products/[id]/route.js
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';

let prisma;
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global._prismaProductIdInstance) { 
    global._prismaProductIdInstance = new PrismaClient();
  }
  prisma = global._prismaProductIdInstance;
}

const formatPrice = (price) => {
  if (price === null || typeof price === 'undefined' || isNaN(parseFloat(price))) return 'N/A';
  return `₹${Number(price).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export async function GET(request, { params }) { 
  console.log(`API_PRODUCT_ID_ROUTE: Destructured params received: ${JSON.stringify(params)}`);
  try {
    const idFromParams = params?.id; 

    if (!idFromParams) {
        console.error("API_PRODUCT_ID_ROUTE: Product ID parameter is missing from destructured params:", params);
        return NextResponse.json({ message: 'Product ID parameter is missing' }, { status: 400 });
    }
    
    const productId = parseInt(idFromParams, 10);

    if (isNaN(productId)) {
        console.error("API_PRODUCT_ID_ROUTE: Invalid product ID format:", idFromParams);
        return NextResponse.json({ message: 'Invalid product ID format' }, { status: 400 });
    }

    if (!prisma) {
      console.error("API_PRODUCT_ID_ROUTE: CRITICAL - Prisma client is not initialized!");
      return NextResponse.json({ message: 'Database client not initialized' }, { status: 500 });
    }
    console.log(`API_PRODUCT_ID_ROUTE: Fetching product with ID: ${productId}`);

    const productFromDb = await prisma.product.findUnique({ // Renamed to avoid conflict
      where: { id: productId },
      include: {
        seller: true, // Includes all seller fields based on your schema
        reviews: {
          include: {
            user: { select: { username: true, user_id_str: true } }, // Fetch username and original user_id
          },
          orderBy: { time: 'desc' },
        },
      },
    });

    if (!productFromDb) {
      console.log(`API_PRODUCT_ID_ROUTE: Product not found for ID: ${productId}`);
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }
    console.log(`API_PRODUCT_ID_ROUTE: Product found: ${productFromDb.title}`);

    const responseProduct = {
      id: productFromDb.id,
      product_no: productFromDb.product_no,
      name: productFromDb.title, // from 'title' in Item.json
      brand: productFromDb.seller?.seller_name || 'Unknown Brand', // Uses linked seller name
      category: productFromDb.category,
      price: formatPrice(productFromDb.price),
      price_numeric: productFromDb.price,
      rating: productFromDb.average_rating || 0,       // from 'rating' in Item.json (mapped to average_rating)
      reviewsCount: productFromDb.rating_number || 0,  // from 'rating_number' in Item.json
      image: productFromDb.image_url || null,          // from 'image' in Item.json (mapped to image_url)
      detailImage: productFromDb.image_url || null,    // Use same for detail for now
      thumbnails: productFromDb.thumbnail_urls && productFromDb.thumbnail_urls.length > 0 
                  ? productFromDb.thumbnail_urls 
                  : (productFromDb.image_url ? [productFromDb.image_url] : []), // default thumbnail
      description: productFromDb.description || "No description available.", // from 'description' (string) in Item.json
      
      // These fields might be null if not in your new Item.json and schema allows nulls
      sizes: productFromDb.sizes || [], 
      shipping: productFromDb.shipping_info ? (Array.isArray(productFromDb.shipping_info) ? productFromDb.shipping_info : [productFromDb.shipping_info]) : [{ label: "Standard Shipping", value: "3-5 working days (est.)" }], // Example default

      reviews_list: productFromDb.reviews.map(r => ({
        review_id: r.review_id_ref, // from 'review_id' in reviews.json
        name: r.user?.username || 'Anonymous',
        user_id_original: r.user?.user_id_str, // original user_id from JSON for reference
        rating: r.rating,
        date: r.time.toISOString().split('T')[0],
        comment: r.text,
        title: r.title,
        helpful_vote: r.helpful_vote,
        // Add these back if they are in your new reviews.json and Prisma schema
        // verified_purchase: r.verified_purchase, 
        // legitimacy_score: r.legitimacy_score,
        // spam_flag: r.spam_flag,
        // ai_analysis: r.ai_analysis
      })),
      
      // These might be null if not in your new Item.json
      details_json: productFromDb.details, 
      verified_product: productFromDb.verified_product,
      review_summary: productFromDb.review_summary,
      fake_review_percentage: productFromDb.fake_review_percentage,

      seller_info: productFromDb.seller ? {
        id: productFromDb.seller.id,
        seller_id_original: productFromDb.seller.seller_id_str, // Original ID from JSON
        name: productFromDb.seller.seller_name,
        total_products: productFromDb.seller.total_products,
        is_verified: productFromDb.seller.is_verified,
        trust_score: productFromDb.seller.trust_score, // Will be null if not in your seller.json
      } : null,
    };

    return NextResponse.json(responseProduct);
  } catch (error) {
    console.error(`API_PRODUCT_ID_ROUTE: Failed to fetch product with params '${JSON.stringify(params)}':`, error); 
    return NextResponse.json({ message: 'Failed to fetch product', error: "An unexpected server error occurred." }, { status: 500 });
  }
}