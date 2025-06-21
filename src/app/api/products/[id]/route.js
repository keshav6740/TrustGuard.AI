// src/app/api/products/[id]/route.js
import { NextResponse } from 'next/server';
import prisma from 'C:/Users/Admin/Downloads/new/trust_guard/src/lib/prsima'; // Adjust the path as needed

const formatPrice = (price) => {
  if (price === null || typeof price === 'undefined') return 'N/A';
  return `₹${Number(price).toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
};

export async function GET(request, context) { // Reverting to 'context' to be explicit
  try {
    // Ensure we are in an async tick if that helps Next.js resolve params
    // This is a bit of a stretch, but trying to satisfy the "await" hint
    await Promise.resolve(); // Ensures the following code runs in a future microtask

    const paramsFromContext = context?.params;
    const idFromParams = paramsFromContext?.id;

    if (!idFromParams) {
        console.error("Product ID parameter is missing from context.params:", context?.params);
        return NextResponse.json({ message: 'Product ID parameter is missing' }, { status: 400 });
    }
    
    const productId = parseInt(idFromParams, 10);

    if (isNaN(productId)) {
        console.error("Invalid product ID format:", idFromParams);
        return NextResponse.json({ message: 'Invalid product ID format' }, { status: 400 });
    }

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        seller: true,
        reviews: {
          include: {
            user: { select: { username: true } },
          },
          orderBy: { time: 'desc' },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ message: 'Product not found' }, { status: 404 });
    }

    // ... (rest of your responseProduct mapping remains the same)
    const responseProduct = {
      id: product.id,
      product_no: product.product_no,
      name: product.title,
      brand: product.seller?.seller_name || product.store_seller_name || 'N/A',
      category: product.category,
      price: formatPrice(product.price),
      price_numeric: product.price,
      rating: product.average_rating || 0,
      reviewsCount: product.rating_number || 0,
      image: product.image_url || 'https://via.placeholder.com/600x600.png?text=No+Image',
      detailImage: product.image_url || 'https://via.placeholder.com/600x600.png?text=No+Image',
      thumbnails: product.thumbnail_urls || [],
      description: Array.isArray(product.description) ? product.description.join('\n') : product.description || "",
      sizes: product.sizes || [],
      shipping: product.shipping_info ? [product.shipping_info] : [{ label: "Standard Shipping", value: "3-5 days (est.)" }],
      reviews_list: product.reviews.map(r => ({
        name: r.user?.username || 'Anonymous',
        rating: r.rating,
        date: r.time.toISOString().split('T')[0],
        comment: r.text,
        title: r.title,
        verified_purchase: r.verified_purchase,
        helpful_vote: r.helpful_vote,
        legitimacy_score: r.legitimacy_score,
        spam_flag: r.spam_flag,
        ai_analysis: r.ai_analysis
      })),
      details_json: product.details,
      verified_product: product.verified_product,
      review_summary: product.review_summary,
      fake_review_percentage: product.fake_review_percentage,
      seller_info: product.seller ? {
        id: product.seller.id,
        name: product.seller.seller_name,
        trust_score: product.seller.trust_score,
        is_verified: product.seller.is_verified,
      } : null,
    };

    return NextResponse.json(responseProduct);
  } catch (error) {
    console.error(`Failed to fetch product with context.params '${JSON.stringify(context?.params)}':`, error); 
    return NextResponse.json({ message: 'Failed to fetch product', error: error.message }, { status: 500 });
  }
}