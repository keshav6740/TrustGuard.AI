// prisma/seed.mjs
import { PrismaClient, Prisma } from '@prisma/client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = (fileName) => path.join(__dirname, 'data', fileName);

const GENERIC_PRODUCT_IMAGE_URL = 'https://dummyimage.com/500x500/eeeeee/757575.png&text=Product';
const GENERIC_THUMBNAIL_URL = 'https://dummyimage.com/300x300/eeeeee/757575.png&text=Thumb';

function parseCustomDateTime(dateTimeStr) {
    if (!dateTimeStr || typeof dateTimeStr !== 'string') {
        console.warn(`Invalid dateTimeStr received: ${dateTimeStr}. Using current date.`);
        return new Date();
    }
    try {
        // Updated regex to be more flexible with space before am/pm and case
        const parts = dateTimeStr.match(/(\d{2})\/(\d{2})\/(\d{2})\s\[(\d{1,2})\.(\d{2})\s*(am|pm)\]/i);
        if (!parts) {
            console.warn(`DateTime string "${dateTimeStr}" does not match expected format "dd/MM/yy [hh.mm am/pm]".`);
            throw new Error('DateTime string does not match expected format.');
        }

        let [, day, month, yearSuffix, hourStr, minuteStr, ampm] = parts;
        const year = `20${yearSuffix}`;
        let hour = parseInt(hourStr, 10);

        if (ampm.toLowerCase() === 'pm' && hour !== 12) {
            hour += 12;
        } else if (ampm.toLowerCase() === 'am' && hour === 12) { // 12 AM is 00 hours
            hour = 0;
        }
        // Ensure month is 0-indexed for Date constructor (0=Jan, 1=Feb, ...)
        const date = new Date(Date.UTC(parseInt(year), parseInt(month) - 1, parseInt(day), hour, parseInt(minuteStr), 0));
        if (isNaN(date.getTime())) throw new Error('Parsed date resulted in an invalid date object.');
        return date;
    } catch (error) {
        console.warn(`Error parsing date string "${dateTimeStr}": ${error.message}. Using current date as fallback.`);
        return new Date();
    }
}


async function main() {
  console.log('Start seeding ...');

  // --- Seed Users ---
  console.log('Seeding users...');
  const rawUsersData = JSON.parse(fs.readFileSync(dataPath('user.json'), 'utf-8'));
  // CORRECTED: user.json is a direct array
  const usersToSeed = Array.isArray(rawUsersData) ? rawUsersData : []; 
  
  if (usersToSeed.length === 0) {
      console.warn("No users found in user.json, or it's empty/not an array. Skipping user seeding.");
  }

  for (const userData of usersToSeed) {
    try {
      await prisma.user.upsert({
        where: { user_id_str: userData.user_id },
        update: {
            username: userData.username,
            total_reviews: userData.total_reviews,
            ...(userData.join_date && { join_date: new Date(userData.join_date) }),
            ...(typeof userData.trust_score !== 'undefined' && { trust_score: userData.trust_score }),
        },
        create: {
          user_id_str: userData.user_id,
          username: userData.username,
          total_reviews: userData.total_reviews,
          join_date: userData.join_date ? new Date(userData.join_date) : null,
          trust_score: typeof userData.trust_score !== 'undefined' ? userData.trust_score : null,
        },
      });
    } catch (error) {
      console.error(`Error seeding user ${userData.user_id}: ${error.message}`);
    }
  }
  console.log('Users seeded.');

  // --- Seed Sellers ---
  console.log('Seeding sellers...');
  const rawSellersData = JSON.parse(fs.readFileSync(dataPath('seller.json'), 'utf-8'));
  // CORRECTED: seller.json is a direct array
  const sellersToSeed = Array.isArray(rawSellersData) ? rawSellersData : [];

  if (sellersToSeed.length === 0) {
      console.warn("No sellers found in seller.json, or it's empty/not an array. Skipping seller seeding.");
  }

  for (const sellerData of sellersToSeed) {
    try {
      await prisma.seller.upsert({
        where: { seller_id_str: sellerData.seller_id },
        update: {
            seller_name: sellerData.seller_name,
            total_products: sellerData.total_products,
            is_verified: sellerData.is_verified,
            ...(typeof sellerData.trust_score !== 'undefined' && { trust_score: sellerData.trust_score }),
        },
        create: {
          seller_id_str: sellerData.seller_id,
          seller_name: sellerData.seller_name,
          total_products: sellerData.total_products,
          is_verified: sellerData.is_verified,
          trust_score: typeof sellerData.trust_score !== 'undefined' ? sellerData.trust_score : null,
        },
      });
    } catch (error) {
      console.error(`Error seeding seller ${sellerData.seller_id}: ${error.message}`);
    }
  }
  console.log('Sellers seeded.');

  // --- Seed Products ---
  console.log('Seeding products...');
  const sellersFromDb = await prisma.seller.findMany({ select: { id: true, seller_id_str: true } });
  const sellerStrIdToPkMap = new Map(sellersFromDb.map(s => [s.seller_id_str, s.id]));

  const rawProductsData = JSON.parse(fs.readFileSync(dataPath('Item.json'), 'utf-8'));
  // CORRECTED: Item.json has root key "items"
  const productsToSeed = rawProductsData.items || []; 
  
  if (productsToSeed.length === 0) {
      console.warn("No 'items' array found in Item.json, or it's empty. Skipping product seeding.");
  }

  for (const productData of productsToSeed) {
    let sellerPkToLink = null;
    // Updated to use 'Store/Seller_id' from your new Item.json example
    if (productData['Store/Seller_id']) { 
        sellerPkToLink = sellerStrIdToPkMap.get(productData['Store/Seller_id']);
        if (!sellerPkToLink) {
          console.warn(`Seller (ID: "${productData['Store/Seller_id']}") for product "${productData.title}" not found in DB. Product will be created without seller link.`);
        }
    }
    
    const imageUrlToUse = productData.image || GENERIC_PRODUCT_IMAGE_URL;
    const thumbnailsToUse = Array.isArray(productData.thumbnail_urls) && productData.thumbnail_urls.length > 0
                            ? productData.thumbnail_urls
                            : (imageUrlToUse !== GENERIC_PRODUCT_IMAGE_URL ? [imageUrlToUse] : [GENERIC_THUMBNAIL_URL]);

    try {
      await prisma.product.upsert({
        where: { product_no: productData.product_no },
        update: {
          category: productData.category,
          title: productData.title,
          average_rating: productData.rating, // From Item.json "rating"
          rating_number: productData.rating_number, // From Item.json "rating_number"
          description: typeof productData.description === 'string' ? productData.description : null,
          price: productData.price,
          store_seller_id_ref: productData['Store/Seller_id'], // Store the original ref
          verified_product: productData.verified_product,
          image_url: imageUrlToUse, // From Item.json "image"
          review_summary: productData.review_summary || null,
          fake_review_percentage: productData.fake_review_percentage || null,
          details: productData.details || Prisma.JsonNull,
          thumbnail_urls: thumbnailsToUse,
          sizes: productData.sizes || [],
          shipping_info: productData.shipping_info || Prisma.JsonNull,
          sellerId: sellerPkToLink, 
        },
        create: {
          product_no: productData.product_no,
          category: productData.category,
          title: productData.title,
          average_rating: productData.rating,
          rating_number: productData.rating_number,
          description: typeof productData.description === 'string' ? productData.description : null,
          price: productData.price,
          store_seller_id_ref: productData['Store/Seller_id'],
          verified_product: productData.verified_product,
          image_url: imageUrlToUse,
          review_summary: productData.review_summary || null,
          fake_review_percentage: productData.fake_review_percentage || null,
          details: productData.details || Prisma.JsonNull,
          thumbnail_urls: thumbnailsToUse,
          sizes: productData.sizes || [],
          shipping_info: productData.shipping_info || Prisma.JsonNull,
          sellerId: sellerPkToLink,
        },
      });
    } catch (error) {
      console.error(`Error seeding product ${productData.product_no} (${productData.title}): ${error.message}`);
    }
  }
  console.log('Products seeded.');

  // --- Seed Reviews ---
  console.log('Seeding reviews...');
  const productsFromDb = await prisma.product.findMany({ select: { id: true, product_no: true } });
  const productNoToPkMap = new Map(productsFromDb.map(p => [p.product_no, p.id]));

  const usersFromDb = await prisma.user.findMany({ select: { id: true, user_id_str: true } });
  const userStrIdToPkMap = new Map(usersFromDb.map(u => [u.user_id_str, u.id]));

  const rawReviewsData = JSON.parse(fs.readFileSync(dataPath('reviews.json'), 'utf-8'));
  // CORRECTED: reviews.json has root key "reviews"
  const reviewsToSeed = rawReviewsData.reviews || []; 

  if (reviewsToSeed.length === 0) {
      console.warn("No 'reviews' array found in reviews.json, or it's empty. Skipping review seeding.");
  }
  
  for (const reviewData of reviewsToSeed) {
    const productPkToLink = productNoToPkMap.get(reviewData.product_no);
    const userPkToLink = userStrIdToPkMap.get(reviewData.user_id);

    if (!productPkToLink) {
      console.warn(`Product (product_no ${reviewData.product_no}) for review ID ${reviewData.review_id} not found. Skipping review.`);
      continue;
    }
    if (!userPkToLink) {
      console.warn(`User (user_id ${reviewData.user_id}) for review ID ${reviewData.review_id} not found. Skipping review.`);
      continue;
    }
    
    const reviewDate = parseCustomDateTime(reviewData.date_time);
    
    try {
        const reviewIdRefCondition = typeof reviewData.review_id === 'number' && !isNaN(reviewData.review_id)
            ? { review_id_ref: reviewData.review_id }
            : { AND: [ 
                { productId: productPkToLink },
                { userId: userPkToLink },
                { time: reviewDate } 
              ]};

        await prisma.review.upsert({
            where: reviewIdRefCondition,
            update: {
                rating: reviewData.rating, // Assuming reviewData always has rating
                title: reviewData.title,
                text: reviewData.text,
                helpful_vote: reviewData.helpful_vote,
                time: reviewDate,
                ...(typeof reviewData.verified_purchase !== 'undefined' && { verified_purchase: reviewData.verified_purchase }),
                ...(typeof reviewData.legitimacy_score !== 'undefined' && { legitimacy_score: reviewData.legitimacy_score }),
                ...(typeof reviewData.spam_flag !== 'undefined' && { spam_flag: reviewData.spam_flag }),
                ...(reviewData.ai_analysis && { ai_analysis: reviewData.ai_analysis }),
            },
            create: {
                review_id_ref: typeof reviewData.review_id === 'number' ? reviewData.review_id : null,
                rating: reviewData.rating,
                title: reviewData.title,
                text: reviewData.text,
                product_no_ref: reviewData.product_no,
                user_id_str_ref: reviewData.user_id,
                helpful_vote: reviewData.helpful_vote,
                time: reviewDate,
                verified_purchase: typeof reviewData.verified_purchase !== 'undefined' ? reviewData.verified_purchase : null,
                legitimacy_score: typeof reviewData.legitimacy_score !== 'undefined' ? reviewData.legitimacy_score : null,
                spam_flag: typeof reviewData.spam_flag !== 'undefined' ? reviewData.spam_flag : null,
                ai_analysis: reviewData.ai_analysis || null,
                productId: productPkToLink,
                userId: userPkToLink,
            },
        });
    } catch (e) {
        console.error(`Failed to seed review (JSON review_id: ${reviewData.review_id}, product_no: ${reviewData.product_no}): ${e.message}`);
         if (e.code === 'P2002' && e.meta?.target?.includes('review_id_ref')) {
            console.warn(`Review with review_id_ref ${reviewData.review_id} already exists or review_id is null/not unique. Make review_id_ref non-unique in schema if it's not reliable, or ensure unique review_ids in JSON.`);
        }
    }
  }
  console.log('Reviews seeded.');

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error("Seeding script failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });