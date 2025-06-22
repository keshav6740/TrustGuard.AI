// src/app/api/analyze/[analysisType]/route.js
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client';
import Together from 'together-ai';

let prisma;
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global._prismaAnalyzeInstance) {
    global._prismaAnalyzeInstance = new PrismaClient();
  }
  prisma = global._prismaAnalyzeInstance;
}

const together = process.env.TOGETHER_API_KEY 
    ? new Together({ apiKey: process.env.TOGETHER_API_KEY })
    : null;

if (!together && process.env.NODE_ENV === 'development') {
    console.warn("API_ANALYZE_ROUTE (Corrected Schema): TOGETHER_API_KEY not found. LLM features will use mocks.");
}

function analyzeReviewText(text) {
    let flags = [];
    if (!text || typeof text !== 'string') return flags; 
    if (text.length < 50) flags.push("Short review text");
    if (text.toLowerCase().includes("amazing product") || text.toLowerCase().includes("best ever") || text.toLowerCase().includes("highly recommend")) flags.push("Contains generic positive phrases");
    if (text.toLowerCase().includes("terrible") || text.toLowerCase().includes("worst product") || text.toLowerCase().includes("do not buy")) flags.push("Contains generic negative phrases");
    if (text.toUpperCase() === text && text.length > 20) flags.push("Review text is all caps");
    if ((text.match(/[!?.]{3,}/g) || []).length > 0) flags.push("Review text has excessive punctuation");
    return flags;
}

export async function POST(request, { params }) { 
  let queryProductId; 
  let analysisTypeFromParams;
  
  console.log(`API_ANALYZE_ROUTE (Corrected Schema): Destructured params received: ${JSON.stringify(params)}`);
  try {
    analysisTypeFromParams = params?.analysisType; 

    if (!analysisTypeFromParams) {
        console.error("API_ANALYZE_ROUTE: Analysis type parameter is missing from destructured params:", params);
        return NextResponse.json({ message: 'Analysis type parameter is missing' }, { status: 400 });
    }

    const body = await request.json();
    queryProductId = body.productId; 

    let itemProductNo;
    try {
        itemProductNo = BigInt(queryProductId);
    } catch(e) {
        console.error("API_ANALYZE_ROUTE: Invalid product_no format for analysis:", queryProductId);
        return NextResponse.json({ message: 'Invalid product ID' }, { status: 400 });
    }

    if (!prisma) {
      console.error("API_ANALYZE_ROUTE: CRITICAL - Prisma client is not initialized!");
      return NextResponse.json({ message: 'Database client not initialized' }, { status: 500 });
    }
    console.log(`API_ANALYZE_ROUTE: Fetching item with product_no ${itemProductNo} for analysis type ${analysisTypeFromParams}`);

    const item = await prisma.items.findUnique({
        where: { product_no: itemProductNo },
        include: { 
            Sellers: true, 
            Reviews: {    
                include: { Users: true },
                orderBy: { review_id: 'desc' }, 
                take: 20,
            },
        }
    });

    if (!item) {
        console.log(`API_ANALYZE_ROUTE: Item not found for product_no: ${itemProductNo}`);
        return NextResponse.json({ message: 'Product not found for analysis' }, { status: 404 });
    }
    console.log(`API_ANALYZE_ROUTE: Item found: ${item.title} for analysis.`);

    let analysisResult = {};

    switch (analysisTypeFromParams) {
      case 'fraud-detection':
        let fraudRiskScore = 20; 
        let fraudDetails = [`Analyzing product: "${item.title}" by seller "${item.Sellers?.seller_name || 'Unknown Seller'}"`];
        if (!item.Sellers) {
            fraudRiskScore += 30;
            fraudDetails.push("Seller information is not linked to this product (High Risk).");
        } else {
            if (item.Sellers.is_verified === false) {
                fraudRiskScore += 25;
                fraudDetails.push("Seller is not verified (Increased Risk).");
            } else if (item.Sellers.is_verified === true) {
                fraudDetails.push("Seller is verified (Positive Indicator).");
            }
            if (item.Sellers.total_products !== null && Number(item.Sellers.total_products) < 5) {
                 fraudRiskScore += 15;
                 fraudDetails.push(`Seller has few products listed (${item.Sellers.total_products}) (Moderate Risk).`);
            }
        }
        if (item.price !== null && Number(item.price) < 500 && item.rating !== null && item.rating > 4.8 && (Number(item.rating_number) || 0) < 10) {
            fraudRiskScore += 20;
            fraudDetails.push("Item has an unusually high rating for a low price with very few reviews (Potential Manipulation).");
        } else if (item.rating !== null && item.rating < 2.5 && (Number(item.rating_number) || 0) > 10) {
            fraudRiskScore += 10;
            fraudDetails.push("Item has a significantly low average rating based on several reviews (Indicates Product Issues).");
        }
        fraudRiskScore = Math.min(Math.max(Math.round(fraudRiskScore), 5), 95); 
        analysisResult = {
          title: "Fraud Potential Assessment",
          summary: `The estimated fraud potential score is ${fraudRiskScore}/100. ${fraudRiskScore > 60 ? 'Higher risk detected.' : (fraudRiskScore > 30 ? 'Moderate risk factors present.' : 'Lower risk profile.')}`,
          riskScore: fraudRiskScore,
          details: fraudDetails,
        };
        break;

      case 'counterfeit-detection':
        let authenticityConfidence = 60; 
        let counterfeitIndicators = [`Analyzing product: "${item.title}"`];
        if (item.verified_product === true) {
            authenticityConfidence += 30;
            counterfeitIndicators.push("Product is marked as 'verified' (Strong Positive Indicator).");
        } else if (item.verified_product === false) {
            authenticityConfidence -= 20;
            counterfeitIndicators.push("Product is NOT marked as 'verified' (Caution Advised).");
        }
        if (item.Sellers) {
            if (item.Sellers.is_verified === true) {
                authenticityConfidence += 10;
                counterfeitIndicators.push("Sold by a verified seller (Positive Indicator).");
            }
            const brandNameInSeller = item.title?.split(' ')[0].toLowerCase();
            if (item.Sellers.seller_name?.toLowerCase().includes("official") || item.Sellers.seller_name?.toLowerCase().includes(brandNameInSeller)) {
                authenticityConfidence += 5;
                counterfeitIndicators.push("Seller name suggests official or brand association (Mild Positive).");
            }
        } else {
             authenticityConfidence -=10;
             counterfeitIndicators.push("Seller information is not available.");
        }
        const descriptionTextForCounterfeit = item.description || "";
        if (descriptionTextForCounterfeit.toLowerCase().includes("replica") || descriptionTextForCounterfeit.toLowerCase().includes("inspired by") || descriptionTextForCounterfeit.toLowerCase().includes("1:1")) {
            authenticityConfidence -= 40;
            counterfeitIndicators.push("Description contains terms often associated with replicas (High Risk of Counterfeit).");
        }
        // Example: Very cheap electronics
        const typicalPriceRanges = { "Electronics": 10000, "Smartphones": 15000, "Laptops": 40000 }; 
        const typicalPrice = typicalPriceRanges[item.category];
        if (typicalPrice && item.price !== null && Number(item.price) < typicalPrice * 0.3) { // More aggressive check
             authenticityConfidence -= 25;
             counterfeitIndicators.push(`Price (₹${Number(item.price).toLocaleString()}) is extremely low for its category (High Counterfeit Risk).`);
        }
        authenticityConfidence = Math.min(Math.max(Math.round(authenticityConfidence), 5), 98);
        analysisResult = {
          title: "Counterfeit Likelihood Report",
          summary: `Estimated authenticity confidence: ${authenticityConfidence}%. ${authenticityConfidence < 40 ? 'High counterfeit risk detected.' : (authenticityConfidence < 60 ? 'Moderate counterfeit risk indicators present.' : 'Standard checks passed.')}`,
          authenticityConfidence: authenticityConfidence,
          indicators: counterfeitIndicators,
        };
        break;

      case 'fake-review-analysis':
        let currentSuspiciousReviewCount = 0;
        let totalReviewsForAnalysis = item.Reviews.length;
        let reviewAnalysisPatternsSet = new Set(); 
        if (totalReviewsForAnalysis === 0) {
            reviewAnalysisPatternsSet.add("No reviews available for detailed heuristic analysis.");
        } else {
            item.Reviews.forEach(review => {
                let reviewFlagsCount = 0; 
                if (review.Users) { // Check if user data is linked
                    if (review.Users.total_reviews !== null && Number(review.Users.total_reviews) < 2) { 
                        reviewFlagsCount++;
                        reviewAnalysisPatternsSet.add("Some reviews from users with very few prior reviews.");
                    }
                    // Your new Users schema does not have join_date or trust_score.
                    // If you add them back, you can use them here.
                } else {
                    reviewAnalysisPatternsSet.add("Some reviews lack linked user profile data.");
                }
                const textAnalysisFlags = analyzeReviewText(review.text || "");
                if (textAnalysisFlags.length > 0) {
                    reviewFlagsCount += textAnalysisFlags.length;
                    textAnalysisFlags.forEach(flag => reviewAnalysisPatternsSet.add(flag));
                }
                if (review.helpful_vote !== null && Number(review.helpful_vote) === 0 && totalReviewsForAnalysis > 10) { 
                    reviewFlagsCount += 0.5;
                }
                // Your new Reviews schema might be missing verified_purchase, legitimacy_score, spam_flag.
                // If you add them back, you can use them here.

                if (reviewFlagsCount >= 2) { // Lowered threshold for suspicion
                    currentSuspiciousReviewCount++;
                }
            });
        }
        const heuristicFakePercentage = totalReviewsForAnalysis > 0 ? (currentSuspiciousReviewCount / totalReviewsForAnalysis) * 100 : 0;
        const estimatedGenuinePercentage = 100 - heuristicFakePercentage;
        analysisResult = {
          title: "Review Authenticity Heuristics",
          summary: `Based on heuristics applied to ${totalReviewsForAnalysis} sampled reviews, ${currentSuspiciousReviewCount} exhibit some potentially suspicious characteristics. Estimated genuine reviews in sample: ${estimatedGenuinePercentage.toFixed(0)}%.`,
          estimatedGenuinePercentage: Math.max(0, estimatedGenuinePercentage),
          suspiciousReviewsInSample: currentSuspiciousReviewCount,
          sampledReviewsAnalyzed: totalReviewsForAnalysis,
          patterns: reviewAnalysisPatternsSet.size > 0 ? Array.from(reviewAnalysisPatternsSet) : ["No strong suspicious patterns detected in the sampled reviews based on current simple heuristics."],
        };
        break;

      case 'trust-score':
        let calculatedTrustScore = 50; 
        let scoreBreakdownDetails = {}; 
        if (item.rating !== null) {
            const ratingImpact = Math.round((item.rating - 3.0) * 10);
            calculatedTrustScore += ratingImpact;
            scoreBreakdownDetails["Average Product Rating"] = `${item.rating.toFixed(1)}★ (${ratingImpact >= 0 ? '+' : ''}${ratingImpact} pts)`;
        }
        if (item.rating_number !== null) {
            const reviewVolumeImpact = Math.min(Math.round(Number(item.rating_number) / 20), 15); 
            calculatedTrustScore += reviewVolumeImpact;
            scoreBreakdownDetails["Number of Reviews"] = `${item.rating_number} reviews (+${reviewVolumeImpact} pts)`;
        }
        if (item.verified_product === true) {
            calculatedTrustScore += 15;
            scoreBreakdownDetails["Product Verification"] = "Verified (+15 pts)";
        } else {
             scoreBreakdownDetails["Product Verification"] = "Not Verified (0 pts)";
        }
        if (item.Sellers) {
            if (item.Sellers.is_verified === true) {
                calculatedTrustScore += 10;
                scoreBreakdownDetails["Seller Verification"] = "Verified Seller (+10 pts)";
            } else {
                 calculatedTrustScore -= 5;
                 scoreBreakdownDetails["Seller Verification"] = "Not Verified (-5 pts)";
            }
            if (item.Sellers.total_products !== null && Number(item.Sellers.total_products) < 3) {
                calculatedTrustScore -= 5;
                scoreBreakdownDetails["Seller Product Count"] = `Low (${item.Sellers.total_products}) (-5 pts)`;
            }
        } else {
             scoreBreakdownDetails["Seller Information"] = "Unavailable (-10 pts)";
             calculatedTrustScore -=10;
        }
        if (item.rating !== null && item.rating < 2.0 && (Number(item.rating_number) || 0) > 5) {
            calculatedTrustScore -= 15;
            scoreBreakdownDetails["Low Rating Alert"] = "Significantly Low Rating (-15 pts)";
        }
        calculatedTrustScore = Math.min(Math.max(Math.round(calculatedTrustScore), 5), 99);
        analysisResult = {
          title: "Overall Product Trust Score",
          summary: `The TrustGuard AI has assigned an overall trust score of ${calculatedTrustScore}/100 for "${item.title}".`,
          trustScore: calculatedTrustScore,
          breakdown: scoreBreakdownDetails,
        };
        break;

      case 'llm-summary':
        if (!together) {
            analysisResult = { /* ... mock fallback ... */ };
            break; 
        }
        try {
          console.log(`API_ANALYZE_ROUTE: Generating LLM summary for product: ${item.title}`);
          const productDescriptionText = item.description || "No description available.";
          let reviewSnippetsText = "No recent reviews sampled for summary.";
          if (item.Reviews && item.Reviews.length > 0) {
            reviewSnippetsText = item.Reviews.slice(0, 3).map(r => `- "${r.text ? r.text.substring(0,100) : 'Review text missing'}..." (Rating: ${r.rating || 'N/A'})`).join('\n');
          }
          const llmPrompt = `
            You are an AI assistant for an e-commerce trust platform called TrustGuard.AI.
            Your task is to provide a concise, balanced, and strictly factual summary for the product named "${item.title}".
            Base your summary ONLY on the information provided below. Do NOT invent features, reviews, or sentiments.
            If information is scarce, keep the summary very brief and general.
            Aim for 2-3 informative sentences. Max 100 words.

            Product Information:
            - Name: ${item.title}
            - Brand: ${item.Sellers?.seller_name || 'Unknown Brand'}
            - Category: ${item.category}
            - Description: ${productDescriptionText}
            - Average Rating: ${item.rating || 'Not Rated'} stars from ${Number(item.rating_number) || 0} reviews.
            - Price: ₹${item.price ? Number(item.price).toLocaleString('en-IN') : 'Price not available'} 
            
            Recent Review Snippets (use cautiously, may not represent all reviews):
            ${reviewSnippetsText}

            Generate the summary:
          `;
          const llmResponse = await together.chat.completions.create({
            model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
            messages: [{ role: "user", content: llmPrompt }],
            max_tokens: 150, 
            temperature: 0.3,
          });
          let summaryText = "Could not generate summary at this time.";
          if (llmResponse.choices && llmResponse.choices[0] && llmResponse.choices[0].message && llmResponse.choices[0].message.content) {
            summaryText = llmResponse.choices[0].message.content.trim();
          }
          console.log("API_ANALYZE_ROUTE: LLM Raw Response Text:", summaryText);
          analysisResult = {
            title: "AI-Generated Product Summary",
            summary: summaryText,
            keywords: [item.category, (item.Sellers?.seller_name?.split(' ')[0] || "product"), "summary"],
          };
        } catch (e) {
          console.error("API_ANALYZE_ROUTE: Error calling Together AI for LLM Summary:", e);
          let errorMessage = "Error generating AI summary. Please try again later.";
          if (e.status === 404 && e.error?.code === "model_not_available") {
            errorMessage = `The selected LLM model is currently unavailable. Please check model name or API key.`;
          }
          analysisResult = {
            title: "AI-Generated Product Summary",
            summary: errorMessage,
          };
        }
        break;
      default:
        console.warn(`API_ANALYZE_ROUTE: Invalid analysis type received: ${analysisTypeFromParams}`);
        return NextResponse.json({ message: 'Invalid analysis type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, analysisType: analysisTypeFromParams, data: analysisResult });

  } catch (error) {
    console.error(`API_ANALYZE_ROUTE (Corrected Schema): Failed to perform analysis for ${analysisTypeFromParams || 'unknown type'} (Product ID: ${queryProductId || 'unknown'}):`, error);
    return NextResponse.json({ message: 'Analysis failed', error: "An unexpected server error occurred." }, { status: 500 });
  }
}