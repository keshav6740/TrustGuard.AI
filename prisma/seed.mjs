// prisma/seed.mjs
import { PrismaClient, Prisma } from '@prisma/client'; // Import Prisma for JsonNull
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const prisma = new PrismaClient();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dataPath = (fileName) => path.join(__dirname, 'data', fileName);

// --- Define ONE generic placeholder URL ---
const GENERIC_PRODUCT_IMAGE_URL = 'https://dummyimage.com/500x500/eeeeee/757575.png&text=Product';
const GENERIC_THUMBNAIL_URL = 'https://dummyimage.com/300x300/eeeeee/757575.png&text=Thumb';

async function main() {
  console.log('Start seeding ...');

  // --- Seed Users ---
  console.log('Seeding users...');
  const usersData = JSON.parse(fs.readFileSync(dataPath('user.json'), 'utf-8'));
  for (const userData of usersData.user_profiles) {
    try {
      await prisma.user.upsert({
        where: { user_id_str: userData.user_id },
        update: { // Define what to update if user already exists
            username: userData.username,
            join_date: new Date(userData.join_date),
            total_reviews: userData.total_reviews,
            trust_score: userData.trust_score,
        },
        create: {
          user_id_str: userData.user_id,
          username: userData.username,
          join_date: new Date(userData.join_date),
          total_reviews: userData.total_reviews,
          trust_score: userData.trust_score,
        },
      });
    } catch (error) {
      console.error(`Error seeding user ${userData.user_id}: ${error.message}`);
    }
  }
  console.log('Users seeded.');

  // --- Seed Sellers ---
  console.log('Seeding sellers...');
  const sellersData = JSON.parse(fs.readFileSync(dataPath('seller.json'), 'utf-8'));
  for (const sellerData of sellersData.sellers) {
    try {
      await prisma.seller.upsert({
        where: { seller_id_str: sellerData.seller_id },
        update: { // Define what to update if seller already exists
            seller_name: sellerData.seller_name,
            total_products: sellerData.total_products,
            trust_score: sellerData.trust_score,
            is_verified: sellerData.is_verified,
        },
        create: {
          seller_id_str: sellerData.seller_id,
          seller_name: sellerData.seller_name,
          total_products: sellerData.total_products,
          trust_score: sellerData.trust_score,
          is_verified: sellerData.is_verified,
        },
      });
    } catch (error)
    {
      console.error(`Error seeding seller ${sellerData.seller_id_str}: ${error.message}`);
    }
  }
  console.log('Sellers seeded.');

  // --- Seed Products ---
  console.log('Seeding products...');
  const sellersFromDb = await prisma.seller.findMany(); // Renamed to avoid conflict
  const sellerNameToIdMap = new Map(sellersFromDb.map(s => [s.seller_name, s.id]));
  const productsData = JSON.parse(fs.readFileSync(dataPath('Item.json'), 'utf-8'));

  for (const productData of productsData.products) {
    let sellerIdToLink = null;
    if (productData['Store/Seller']) {
        sellerIdToLink = sellerNameToIdMap.get(productData['Store/Seller']);
        if (!sellerIdToLink) {
          console.warn(`Seller "${productData['Store/Seller']}" for product "${productData.title}" not found in DB. Product will be linked without seller or check seller names.`);
        }
    }

    // Use specific image/thumbnails if provided in Item.json, otherwise use generic
    const imageUrlToUse = productData.specificImageUrl || GENERIC_PRODUCT_IMAGE_URL;
    // Ensure specificThumbnailUrls is an array, or default to an array with the generic thumb
    const thumbnailsToUse = Array.isArray(productData.specificThumbnailUrls) && productData.specificThumbnailUrls.length > 0
                            ? productData.specificThumbnailUrls
                            : [GENERIC_THUMBNAIL_URL];


    try {
      await prisma.product.upsert({
        where: { product_no: productData.product_no },
        update: {
          category: productData.category,
          title: productData.title,
          average_rating: productData.average_rating,
          rating_number: productData.rating_number,
          description: productData.description || [], // Ensure description is an array or empty array
          price: productData.price,
          store_seller_name: productData['Store/Seller'] || 'Unknown Seller',
          details: productData.details || Prisma.JsonNull,
          verified_product: productData.verified_product || false,
          review_summary: productData.review_summary,
          fake_review_percentage: productData.fake_review_percentage,
          sellerId: sellerIdToLink, // Use the resolved sellerId
          image_url: imageUrlToUse,
          thumbnail_urls: thumbnailsToUse,
          // sizes and shipping_info can be added here if they exist in productData
          sizes: productData.sizes || [], 
          shipping_info: productData.shipping_info || Prisma.JsonNull,
        },
        create: {
          product_no: productData.product_no,
          category: productData.category,
          title: productData.title,
          average_rating: productData.average_rating,
          rating_number: productData.rating_number,
          description: productData.description || [], // Ensure description is an array or empty array
          price: productData.price,
          store_seller_name: productData['Store/Seller'] || 'Unknown Seller',
          details: productData.details || Prisma.JsonNull,
          verified_product: productData.verified_product || false,
          review_summary: productData.review_summary,
          fake_review_percentage: productData.fake_review_percentage,
          sellerId: sellerIdToLink, // Use the resolved sellerId
          image_url: imageUrlToUse,
          thumbnail_urls: thumbnailsToUse,
          sizes: productData.sizes || [],
          shipping_info: productData.shipping_info || Prisma.JsonNull,
        },
      });
    } catch (error) {
      console.error(`Error seeding product ${productData.product_no} (${productData.title}): ${error.message}`);
      if (error.meta && error.meta.target) { // More detailed error for constraint violations
        console.error("Target fields:", error.meta.target);
      }
    }
  }
  console.log('Products seeded.');

  // --- Seed Reviews ---
  console.log('Seeding reviews...');
  const productsFromDb = await prisma.product.findMany({ select: { id: true, product_no: true } });
  const productNoToIdMap = new Map(productsFromDb.map(p => [p.product_no, p.id]));

  const dbUsersFromFile = await prisma.user.findMany({ select: { id: true, user_id_str: true } }); // Renamed
  const userStrToIdMap = new Map(dbUsersFromFile.map(u => [u.user_id_str, u.id]));

  const reviewsData = JSON.parse(fs.readFileSync(dataPath('reviews.json'), 'utf-8'));
  for (const reviewData of reviewsData.user_reviews) {
    const productIdToLink = productNoToIdMap.get(reviewData.product_no); // Renamed
    const userIdToLink = userStrToIdMap.get(reviewData.user_id);       // Renamed

    if (!productIdToLink) {
      console.warn(`Product (product_no ${reviewData.product_no}) for review not found. Skipping review for user ${reviewData.user_id}.`);
      continue;
    }
    if (!userIdToLink) {
      console.warn(`User (user_id_str ${reviewData.user_id}) for review not found. Skipping review for product ${reviewData.product_no}.`);
      continue;
    }

    let reviewDate;
    try {
        const [datePart, timePart, ampm] = reviewData.Time.split(' ');
        const [day, month, yearSuffix] = datePart.split('/');
        let [hour, minute] = timePart.split(':');
        const year = `20${yearSuffix}`;

        if (ampm && ampm.toLowerCase() === 'pm' && parseInt(hour) !== 12) {
            hour = (parseInt(hour) + 12).toString();
        }
        if (ampm && ampm.toLowerCase() === 'am' && parseInt(hour) === 12) { // 12 AM is 00 hours
            hour = '00';
        }
        
        reviewDate = new Date(`${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}T${hour.padStart(2, '0')}:${minute.padStart(2, '0')}:00.000Z`); // Added .000Z for UTC
        if (isNaN(reviewDate.getTime())) {
            throw new Error('Parsed date is invalid');
        }
    } catch (e) {
        console.warn(`Invalid date format for review: "${reviewData.Time}". Using current date as fallback. Error: ${e.message}`);
        reviewDate = new Date();
    }
    
    try {
        await prisma.review.create({
            data: {
            rating: reviewData.rating,
            title: reviewData.title,
            text: reviewData.text,
            product_no_ref: reviewData.product_no, // Storing original ref for audit/debug
            user_id_str_ref: reviewData.user_id,   // Storing original ref for audit/debug
            verified_purchase: reviewData.verified_purchase || false,
            helpful_vote: reviewData.helpful_vote || 0,
            legitimacy_score: reviewData.legitimacy_score,
            spam_flag: reviewData.spam_flag,
            ai_analysis: reviewData.ai_analysis,
            time: reviewDate,
            productId: productIdToLink,
            userId: userIdToLink,
            },
        });
    } catch (e) {
        if (e.code === 'P2002') { // Unique constraint failed
            console.log(`Skipping duplicate review (based on unique constraints if any) for product_no ${reviewData.product_no} by user ${reviewData.user_id}`);
        } else {
            console.error(`Failed to seed review for product_no ${reviewData.product_no} by user ${reviewData.user_id}: ${e.message}`);
        }
    }
  }
  console.log('Reviews seeded.');

  console.log('Seeding finished.');
}

main()
  .catch((e) => {
    console.error("Seeding failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });