// src/app/api/analyze/[analysisType]/route.js
import { NextResponse } from 'next/server';
import { PrismaClient } from '@prisma/client'; // Import directly
import Together from 'together-ai';

// Instantiate Prisma Client directly in this file
let prisma;
if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  if (!global._prismaAnalyzeInstance) { // Unique global variable for this route
    global._prismaAnalyzeInstance = new PrismaClient();
  }
  prisma = global._prismaAnalyzeInstance;
}
// End of direct Prisma Client instantiation

const together = process.env.TOGETHER_API_KEY 
    ? new Together({ apiKey: process.env.TOGETHER_API_KEY })
    : null;

if (!together && process.env.NODE_ENV === 'development') {
    console.warn("API_ANALYZE_ROUTE: TOGETHER_API_KEY not found in .env. LLM features will use mocks.");
}

// Helper function for simple text analysis
function analyzeReviewText(text) {
    let flags = [];
    if (!text || typeof text !== 'string') return flags; 
    if (text.length < 50) flags.push("Very short text");
    if (text.toLowerCase().includes("amazing product") || text.toLowerCase().includes("best ever")) flags.push("Generic positive praise");
    if (text.toLowerCase().includes("terrible") || text.toLowerCase().includes("worst product")) flags.push("Generic negative sentiment");
    if (text.toUpperCase() === text && text.length > 20) flags.push("All caps text detected");
    if ((text.match(/[!?.]{3,}/g) || []).length > 0) flags.push("Excessive punctuation detected");
    return flags;
}

export async function POST(request, { params }) { // Standard: Destructure params
  let queryProductId; 
  let analysisTypeFromParams;
  
  console.log(`API_ANALYZE_ROUTE: Destructured params received: ${JSON.stringify(params)}`);

  try {
    analysisTypeFromParams = params?.analysisType; // Access analysisType from destructured params

    if (!analysisTypeFromParams) {
        console.error("API_ANALYZE_ROUTE: Analysis type parameter is missing from destructured params:", params);
        return NextResponse.json({ message: 'Analysis type parameter is missing' }, { status: 400 });
    }

    const body = await request.json();
    queryProductId = body.productId; 

    const productId = parseInt(queryProductId, 10);
    if (isNaN(productId)) {
        return NextResponse.json({ message: 'Invalid product ID for analysis' }, { status: 400 });
    }

    if (!prisma) {
      console.error("API_ANALYZE_ROUTE: CRITICAL - Prisma client is not initialized!");
      return NextResponse.json({ message: 'Database client not initialized' }, { status: 500 });
    }
    console.log(`API_ANALYZE_ROUTE: Fetching product ID ${productId} for analysis type ${analysisTypeFromParams}`);

    const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { 
            seller: true, 
            reviews: {     
                include: { user: true },
                orderBy: { time: 'desc' }, 
                take: 20, 
            },
        }
    });

    if (!product) {
        console.log(`API_ANALYZE_ROUTE: Product not found for ID: ${productId}`);
        return NextResponse.json({ message: 'Product not found for analysis' }, { status: 404 });
    }
    console.log(`API_ANALYZE_ROUTE: Product found: ${product.title} for analysis.`);

    let analysisResult = {};

    switch (analysisTypeFromParams) {
      case 'fraud-detection':
        let fraudRiskScore = 30; 
        let fraudDetails = [];
        if (!product.seller) {
            fraudRiskScore += 20;
            fraudDetails.push("Seller information is missing or not linked.");
        } else {
            if (!product.seller.is_verified) {
                fraudRiskScore += 25;
                fraudDetails.push("Seller is not verified.");
            }
            if (product.seller.trust_score !== null && product.seller.trust_score < 75) { 
                fraudRiskScore += Math.max(0, (75 - product.seller.trust_score));
                fraudDetails.push(`Seller has a relatively low trust score (${product.seller.trust_score}).`);
            }
            if (product.seller.total_products < 2 && (product.seller.trust_score === null || product.seller.trust_score < 80)) {
                 fraudRiskScore += 10;
                 fraudDetails.push("Seller has very few products listed and a moderate/unknown trust score.");
            }
        }
        if (product.fake_review_percentage !== null && product.fake_review_percentage > 20) {
            fraudRiskScore += Math.max(0, product.fake_review_percentage / 2);
            fraudDetails.push(`Product has a high suspected fake review percentage (${product.fake_review_percentage}%).`);
        }
        if (product.price < 500 && product.average_rating !== null && product.average_rating > 4.8 && (product.rating_number || 0) < 10) {
            fraudRiskScore += 15;
            fraudDetails.push("Unusually high rating for a low-priced item with few reviews, potential for manipulation.");
        }
        fraudRiskScore = Math.min(Math.max(Math.round(fraudRiskScore), 5), 95); 
        analysisResult = {
          title: "Fraud Potential Assessment",
          summary: `Based on available data, the estimated fraud potential score for listings of "${product.title}" by seller "${product.seller?.seller_name || 'Unknown'}" is ${fraudRiskScore}/100.`,
          riskScore: fraudRiskScore,
          details: fraudDetails.length > 0 ? fraudDetails : ["No specific high-risk fraud indicators found based on current simple checks."],
        };
        break;

      case 'counterfeit-detection':
        let authenticityConfidence = 70; 
        let counterfeitIndicators = [];
        if (product.verified_product) { 
            authenticityConfidence += 25;
        } else {
            authenticityConfidence -= 15;
            counterfeitIndicators.push("Product is not marked as 'verified' in our system.");
        }
        if (product.seller) {
            if (product.seller.is_verified) {
                authenticityConfidence += 10;
            } else {
                 counterfeitIndicators.push("Seller is not a verified entity.");
            }
            const brandNameFromDetails = typeof product.details === 'object' && product.details !== null && product.details.brand ? String(product.details.brand).toLowerCase() : "___NO_BRAND___";
            if (product.seller.seller_name.toLowerCase().includes("official") || product.seller.seller_name.toLowerCase().includes(brandNameFromDetails)) {
                authenticityConfidence += 5;
            } else {
                 counterfeitIndicators.push("Seller name does not obviously indicate an official brand store.");
            }
        } else {
             counterfeitIndicators.push("Seller information not available to assess authenticity.");
        }
        const typicalPriceRanges = { "Electronics": 10000, "Fashion and Apparel": 2000, "Home and Kitchen": 3000, "Books and Media": 500, "Toys and Games": 1000 };
        const typicalPrice = typicalPriceRanges[product.category];
        if (typicalPrice && product.price < typicalPrice * 0.5) {
            authenticityConfidence -= 20;
            counterfeitIndicators.push(`Product price (₹${product.price.toLocaleString()}) is significantly lower than typical for ${product.category}, which can be an indicator.`);
        }
        counterfeitIndicators.push("Visual counterfeit scan (simulated): No obvious logo/packaging mismatches detected in primary image based on current data.");
        authenticityConfidence = Math.min(Math.max(Math.round(authenticityConfidence), 5), 98);
        analysisResult = {
          title: "Counterfeit Likelihood Report",
          summary: `The estimated authenticity confidence for "${product.title}" is ${authenticityConfidence}%.`,
          authenticityConfidence: authenticityConfidence,
          indicators: counterfeitIndicators.length > 0 ? counterfeitIndicators : ["Primary checks suggest authenticity, but detailed visual/supply chain verification is recommended for high-value items."],
        };
        break;

      case 'fake-review-analysis':
        let currentSuspiciousReviewCount = 0;
        let totalReviewsForAnalysis = product.reviews.length;
        let reviewAnalysisPatternsSet = new Set(); 
        if (totalReviewsForAnalysis === 0) {
            reviewAnalysisPatternsSet.add("No reviews available for detailed heuristic analysis.");
        } else {
            product.reviews.forEach(review => {
                let reviewFlagsCount = 0; 
                if (review.user) {
                    if (review.user.join_date && new Date(review.user.join_date) > new Date(new Date().setMonth(new Date().getMonth() - 3))) { 
                        reviewFlagsCount++;
                        reviewAnalysisPatternsSet.add("Some reviews from recently joined users.");
                    }
                    if (review.user.total_reviews < 3) {
                        reviewFlagsCount++;
                        reviewAnalysisPatternsSet.add("Some reviews from users with very few total reviews posted.");
                    }
                    if (review.user.trust_score !== null && review.user.trust_score < 0.3) { 
                        reviewFlagsCount +=2;
                        reviewAnalysisPatternsSet.add("Some reviews from users with low overall trust scores.");
                    }
                } else {
                    reviewAnalysisPatternsSet.add("Some reviews lack detailed reviewer profile information for deeper analysis.");
                }
                const textAnalysisFlags = analyzeReviewText(review.text);
                if (textAnalysisFlags.length > 0) {
                    reviewFlagsCount += textAnalysisFlags.length;
                    textAnalysisFlags.forEach(flag => reviewAnalysisPatternsSet.add(flag));
                }
                if (review.verified_purchase === false) { 
                    reviewFlagsCount++;
                    reviewAnalysisPatternsSet.add("Some reviews are not from verified purchases.");
                }
                if (review.helpful_vote !== null && review.helpful_vote < 2 && totalReviewsForAnalysis > 5) { 
                    reviewFlagsCount += 0.5;
                }
                if (review.legitimacy_score !== null && review.legitimacy_score < 0.70) { 
                    reviewFlagsCount += 2;
                    reviewAnalysisPatternsSet.add("Some reviews have low AI-assessed legitimacy scores (from dataset).");
                }
                if (review.spam_flag === true) { 
                    reviewFlagsCount += 5; 
                    reviewAnalysisPatternsSet.add("Some reviews were flagged as potential spam (from dataset).");
                }
                if (reviewFlagsCount >= 3) { 
                    currentSuspiciousReviewCount++;
                }
            });
        }
        const dbProductFakePercentage = product.fake_review_percentage || 0;
        const heuristicFakePercentage = totalReviewsForAnalysis > 0 ? (currentSuspiciousReviewCount / totalReviewsForAnalysis) * 100 : 0;
        const combinedSuspiciousPercentageOverall = Math.round((dbProductFakePercentage + heuristicFakePercentage) / 2);
        const finalOverallSuspiciousCount = Math.round((product.rating_number || 0) * (combinedSuspiciousPercentageOverall / 100));
        const finalOverallGenuineCount = (product.rating_number || 0) - finalOverallSuspiciousCount;
        analysisResult = {
          title: "Review Authenticity Analysis",
          summary: `Out of ${product.rating_number || 0} total reviews for "${product.title}", approximately ${finalOverallSuspiciousCount} may exhibit characteristics warranting further scrutiny. Estimated genuine reviews: ${finalOverallGenuineCount}.`,
          estimatedGenuinePercentage: product.rating_number > 0 ? Math.max(0, Math.round((finalOverallGenuineCount / (product.rating_number || 1)) * 100)) : 100,
          suspiciousReviewsInSample: currentSuspiciousReviewCount,
          sampledReviewsAnalyzed: totalReviewsForAnalysis,
          patterns: reviewAnalysisPatternsSet.size > 0 ? Array.from(reviewAnalysisPatternsSet) : ["No highly suspicious patterns detected in the sampled reviews based on current checks."],
          datasetDeclaredFakeReviewPercentage: `${dbProductFakePercentage.toFixed(1)}% (as per product data).`
        };
        break;

      case 'trust-score':
        let calculatedTrustScore = 50; 
        let scoreBreakdownDetails = {}; 
        if (product.average_rating !== null) {
            const ratingImpact = Math.round((product.average_rating - 2.5) * 8); 
            calculatedTrustScore += ratingImpact;
            scoreBreakdownDetails["Average Rating"] = `${product.average_rating.toFixed(1)}★ (${ratingImpact >= 0 ? '+' : ''}${ratingImpact} pts)`;
        }
        if (product.rating_number !== null) {
            const reviewVolumeImpact = Math.min(Math.round(product.rating_number / 10), 15); 
            calculatedTrustScore += reviewVolumeImpact;
            scoreBreakdownDetails["Review Volume"] = `${product.rating_number} reviews (+${reviewVolumeImpact} pts)`;
        }
        if (product.verified_product) {
            calculatedTrustScore += 10;
            scoreBreakdownDetails["Product Verification"] = "Verified (+10 pts)";
        } else {
             scoreBreakdownDetails["Product Verification"] = "Not Verified (0 pts)";
        }
        if (product.fake_review_percentage !== null) {
            const fakeReviewPenalty = Math.round(product.fake_review_percentage / 2.5);
            calculatedTrustScore -= fakeReviewPenalty;
            scoreBreakdownDetails["Suspected Fake Reviews"] = `${product.fake_review_percentage.toFixed(1)}% (-${fakeReviewPenalty} pts)`;
        }
        if (product.seller) {
            if (product.seller.trust_score !== null) {
                const sellerTrustImpact = Math.round((product.seller.trust_score - 70) / 1.5); 
                calculatedTrustScore += sellerTrustImpact;
                scoreBreakdownDetails["Seller Reputation"] = `Score ${product.seller.trust_score} (${sellerTrustImpact >= 0 ? '+' : ''}${sellerTrustImpact} pts)`;
            } else {
                scoreBreakdownDetails["Seller Reputation"] = "Score N/A";
            }
            if (product.seller.is_verified) {
                calculatedTrustScore += 7;
                scoreBreakdownDetails["Seller Verification"] = "Verified (+7 pts)";
            }
        } else {
             scoreBreakdownDetails["Seller Information"] = "Unavailable (-5 pts)";
             calculatedTrustScore -=5;
        }
        calculatedTrustScore = Math.min(Math.max(Math.round(calculatedTrustScore), 5), 99);
        analysisResult = {
          title: "Overall Trust Score",
          summary: `The TrustGuard AI has assigned an overall trust score of ${calculatedTrustScore}/100 for "${product.title}".`,
          trustScore: calculatedTrustScore,
          breakdown: scoreBreakdownDetails,
        };
        break;

      case 'llm-summary':
        if (!together) {
            analysisResult = {
                title: "AI-Generated Product Summary (Mock)",
                summary: `This is a mock summary for "${product.title}". The LLM service is not configured. Product seems to be a ${product.category} by ${product.seller?.seller_name || product.store_seller_name || 'Unknown Brand'}.`,
                keywords: [product.category, "mock", "summary"],
            };
            break; 
        }
        try {
          console.log(`API_ANALYZE_ROUTE: Generating LLM summary for product: ${product.title}`);
          const productDescriptionText = Array.isArray(product.description) ? product.description.join(' ') : (product.description || "No description available.");
          let reviewSnippetsText = "No recent reviews sampled for summary.";
          if (product.reviews && product.reviews.length > 0) {
            reviewSnippetsText = product.reviews.slice(0, 3).map(r => `- "${r.text.substring(0,150)}..." (Rating: ${r.rating})`).join('\n');
          }
          const llmPrompt = `
            You are an AI assistant for an e-commerce trust platform called TrustGuard.AI.
            Your task is to provide a concise, balanced, and strictly factual summary for the product named "${product.title}".
            Base your summary ONLY on the information provided below. Do NOT invent features, reviews, or sentiments.
            If information is scarce, keep the summary very brief and general.
            Aim for 2-3 informative sentences. Max 100 words.

            Product Information:
            - Name: ${product.title}
            - Brand: ${product.seller?.seller_name || product.store_seller_name || 'Unknown Brand'}
            - Category: ${product.category}
            - Description: ${productDescriptionText}
            - Average Rating: ${product.average_rating || 'Not Rated'} stars from ${product.rating_number || 0} reviews.
            - Price: ₹${product.price_numeric ? product.price_numeric.toLocaleString('en-IN') : 'Price not available'} 
            
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
            keywords: [product.category, (product.seller?.seller_name?.split(' ')[0] || product.store_seller_name?.split(' ')[0] || "product"), "summary"],
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
    console.error(`API_ANALYZE_ROUTE: Failed to perform analysis for ${analysisTypeFromParams || 'unknown type'} (Product ID: ${queryProductId || 'unknown'}):`, error);
    return NextResponse.json({ message: 'Analysis failed', error: "An unexpected server error occurred." }, { status: 500 });
  }
}