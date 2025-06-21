// src/app/api/analyze/[analysisType]/route.js
import { NextResponse } from 'next/server';
import prisma from 'C:/Users/Admin/Downloads/new/trust_guard/src/lib/prsima'; // Adjust the path as needed
import Together from 'together-ai';

const together = process.env.TOGETHER_API_KEY 
    ? new Together({ apiKey: process.env.TOGETHER_API_KEY })
    : null;

if (!together) {
    console.warn("TOGETHER_API_KEY not found in .env. LLM features will be disabled or use mocks.");
}

// Helper function for simple text analysis (example)
function analyzeReviewText(text) {
    let flags = [];
    if (text.length < 50) flags.push("Very short text");
    if (text.toLowerCase().includes("amazing product") || text.toLowerCase().includes("best ever")) flags.push("Generic positive praise");
    if (text.toLowerCase().includes("terrible") || text.toLowerCase().includes("worst product")) flags.push("Generic negative sentiment");
    // Add more simple checks: all caps, excessive punctuation, repeated phrases, etc.
    return flags;
}

export async function POST(request, { params }) {
  let queryProductId;
  let analysisTypeFromParams;

  try {
    analysisTypeFromParams = params?.analysisType;

    if (!analysisTypeFromParams) {
        return NextResponse.json({ message: 'Analysis type parameter is missing' }, { status: 400 });
    }

    const body = await request.json();
    queryProductId = body.productId; 

    const productId = parseInt(queryProductId, 10);
    if (isNaN(productId)) {
        return NextResponse.json({ message: 'Invalid product ID for analysis' }, { status: 400 });
    }

    // Fetch comprehensive product data for all analyses
    const product = await prisma.product.findUnique({
        where: { id: productId },
        include: { 
            seller: true, // For seller trust, verification
            reviews: {     // For review analysis, trust score context
                include: {
                    user: true // For reviewer profile analysis
                },
                orderBy: { time: 'desc' }, // Or by helpful_vote
                // take: 20, // Fetch more reviews if needed for analysis
            },
        }
    });

    if (!product) {
        return NextResponse.json({ message: 'Product not found for analysis' }, { status: 404 });
    }

    let analysisResult = {};

    switch (analysisTypeFromParams) {
      // 1. FRAUD DETECTION
      case 'fraud-detection':
        let fraudRiskScore = 30; // Base risk
        let fraudDetails = [];

        if (!product.seller) {
            fraudRiskScore += 20;
            fraudDetails.push("Seller information is missing or not linked.");
        } else {
            if (!product.seller.is_verified) {
                fraudRiskScore += 25;
                fraudDetails.push("Seller is not verified.");
            }
            if (product.seller.trust_score < 75) { // Assuming seller.trust_score from your seller.json
                fraudRiskScore += (75 - product.seller.trust_score);
                fraudDetails.push(`Seller has a relatively low trust score (${product.seller.trust_score}).`);
            }
            if (product.seller.total_products < 2 && product.seller.trust_score < 80) {
                 fraudRiskScore += 10;
                 fraudDetails.push("Seller has very few products listed and a moderate trust score.");
            }
        }
        if (product.fake_review_percentage && product.fake_review_percentage > 20) {
            fraudRiskScore += product.fake_review_percentage / 2;
            fraudDetails.push(`Product has a high suspected fake review percentage (${product.fake_review_percentage}%).`);
        }
        if (product.price < 500 && product.average_rating && product.average_rating > 4.8 && (product.rating_number || 0) < 10) {
            fraudRiskScore += 15;
            fraudDetails.push("Unusually high rating for a low-priced item with few reviews, potential for manipulation.");
        }
        
        fraudRiskScore = Math.min(Math.max(Math.round(fraudRiskScore), 5), 95); // Cap score between 5 and 95

        analysisResult = {
          title: "Fraud Potential Assessment",
          summary: `Based on available data, the estimated fraud potential score for listings of "${product.title}" by seller "${product.seller?.seller_name || 'Unknown'}" is ${fraudRiskScore}/100.`,
          riskScore: fraudRiskScore,
          details: fraudDetails.length > 0 ? fraudDetails : ["No specific high-risk fraud indicators found based on current simple checks."],
        };
        break;

      // 2. COUNTERFEIT DETECTION
      case 'counterfeit-detection':
        let authenticityConfidence = 70; // Base confidence
        let counterfeitIndicators = [];

        if (product.verified_product) { // From Item.json
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
            if (product.seller.seller_name.toLowerCase().includes("official store") || product.seller.seller_name.toLowerCase().includes(product.details?.brand?.toLowerCase() || "___")) {
                authenticityConfidence += 5; // Slight boost if seller name implies official
            } else {
                 counterfeitIndicators.push("Seller name does not obviously indicate an official brand store.");
            }
        } else {
             counterfeitIndicators.push("Seller information not available to assess authenticity.");
        }

        // Example: Check price against a hypothetical average for the category (very simplified)
        // This would require more data in a real system
        const typicalPriceRanges = { "Electronics": 10000, "Fashion and Apparel": 2000, "Home and Kitchen": 3000 };
        const typicalPrice = typicalPriceRanges[product.category];
        if (typicalPrice && product.price < typicalPrice * 0.5) {
            authenticityConfidence -= 20;
            counterfeitIndicators.push(`Product price (₹${product.price.toLocaleString()}) is significantly lower than typical for this category, which can be an indicator.`);
        }
        
        // Placeholder for image analysis - in reality, this would use CV
        counterfeitIndicators.push("Visual counterfeit scan (simulated): No obvious logo/packaging mismatches detected in primary image.");


        authenticityConfidence = Math.min(Math.max(Math.round(authenticityConfidence), 5), 98);

        analysisResult = {
          title: "Counterfeit Likelihood Report",
          summary: `The estimated authenticity confidence for "${product.title}" is ${authenticityConfidence}%.`,
          authenticityConfidence: authenticityConfidence,
          indicators: counterfeitIndicators.length > 0 ? counterfeitIndicators : ["Primary checks suggest authenticity, but detailed visual/supply chain verification is recommended for high-value items."],
        };
        break;

      // 3. FAKE REVIEW ANALYSIS
      case 'fake-review-analysis':
        let suspiciousReviewCount = 0;
        let totalAnalyzedReviews = product.reviews.length;
        let reviewAnalysisPatterns = new Set(); // Use a Set to avoid duplicate patterns

        if (totalAnalyzedReviews === 0) {
            reviewAnalysisPatterns.add("No reviews available for detailed analysis.");
        } else {
            product.reviews.forEach(review => {
                let reviewFlags = 0;
                // Analyze reviewer profile (from user.json)
                if (review.user) {
                    if (new Date(review.user.join_date) > new Date(new Date().setMonth(new Date().getMonth() - 3))) { // Joined in last 3 months
                        reviewFlags++;
                        reviewAnalysisPatterns.add("Some reviews from recently joined users.");
                    }
                    if (review.user.total_reviews < 3) {
                        reviewFlags++;
                        reviewAnalysisPatterns.add("Some reviews from users with very few total reviews.");
                    }
                    if (review.user.trust_score < 0.3) { // User trust_score from user.json
                        reviewFlags +=2;
                        reviewAnalysisPatterns.add("Some reviews from users with low trust scores.");
                    }
                } else {
                    reviewAnalysisPatterns.add("Some reviews lack detailed reviewer profile information.");
                }

                // Analyze review text (simple checks)
                const textFlags = analyzeReviewText(review.text);
                if (textFlags.length > 0) {
                    reviewFlags += textFlags.length;
                    textFlags.forEach(flag => reviewAnalysisPatterns.add(flag));
                }

                // Analyze review metadata (from reviews.json)
                if (!review.verified_purchase) {
                    reviewFlags++;
                    reviewAnalysisPatterns.add("Some reviews are not from verified purchases.");
                }
                if (review.helpful_vote < 2 && totalAnalyzedReviews > 5) { // If many reviews, low helpful count is a mild flag
                    reviewFlags += 0.5;
                }
                if (review.legitimacy_score && review.legitimacy_score < 0.70) { // legitimacy_score from reviews.json
                    reviewFlags += 2;
                    reviewAnalysisPatterns.add("Some reviews have low AI-assessed legitimacy scores (from dataset).");
                }
                if (review.spam_flag) { // spam_flag from reviews.json
                    reviewFlags += 5; // Strong flag
                    reviewAnalysisPatterns.add("Some reviews were flagged as potential spam (from dataset).");
                }


                if (reviewFlags >= 3) { // Arbitrary threshold for "suspicious"
                    suspiciousReviewCount++;
                }
            });
        }
        
        // Use fake_review_percentage from Item.json as a baseline if available
        const dbFakePercentage = product.fake_review_percentage || 0;
        // Combine our heuristic with the dataset's percentage
        const combinedSuspiciousPercentage = Math.round((dbFakePercentage + (totalAnalyzedReviews > 0 ? (suspiciousReviewCount / totalAnalyzedReviews) * 100 : 0)) / 2);
        const finalSuspiciousCount = Math.round((product.rating_number || 0) * (combinedSuspiciousPercentage / 100));
        const finalGenuineCount = (product.rating_number || 0) - finalSuspiciousCount;


        analysisResult = {
          title: "Review Authenticity Analysis",
          summary: `Out of ${product.rating_number || 0} total reviews for "${product.title}", approximately ${finalSuspiciousCount} exhibit characteristics that may warrant further scrutiny. Estimated genuine reviews: ${finalGenuineCount}.`,
          estimatedGenuinePercentage: product.rating_number > 0 ? Math.round((finalGenuineCount / (product.rating_number || 1)) * 100) : 100,
          suspiciousReviewIndicatorsFound: suspiciousReviewCount, // Based on our analysis of sampled reviews
          patterns: reviewAnalysisPatterns.size > 0 ? Array.from(reviewAnalysisPatterns) : ["No highly suspicious patterns detected in the sampled reviews based on current checks."],
          datasetFakeReviewPercentage: `${dbFakePercentage.toFixed(1)}% (as per product data).`
        };
        break;

      // 4. TRUST SCORE ASSIGNMENT
      case 'trust-score':
        let trustScore = 50; // Base score
        let scoreBreakdown = {};

        // Product factors
        if (product.average_rating) {
            const ratingImpact = Math.round((product.average_rating - 2.5) * 8); // Scale 0-5 rating to -20 to +20 impact
            trustScore += ratingImpact;
            scoreBreakdown["Average Rating"] = `${product.average_rating.toFixed(1)}★ (${ratingImpact > 0 ? '+' : ''}${ratingImpact} pts)`;
        }
        if (product.rating_number) {
            const reviewVolumeImpact = Math.min(Math.round(product.rating_number / 10), 15); // Max 15 pts for volume
            trustScore += reviewVolumeImpact;
            scoreBreakdown["Review Volume"] = `${product.rating_number} reviews (+${reviewVolumeImpact} pts)`;
        }
        if (product.verified_product) {
            trustScore += 10;
            scoreBreakdown["Product Verification"] = "Verified (+10 pts)";
        } else {
             scoreBreakdown["Product Verification"] = "Not Verified (0 pts)";
        }
        if (product.fake_review_percentage) {
            const fakeReviewPenalty = Math.round(product.fake_review_percentage / 2);
            trustScore -= fakeReviewPenalty;
            scoreBreakdown["Suspected Fake Reviews"] = `${product.fake_review_percentage.toFixed(1)}% (-${fakeReviewPenalty} pts)`;
        }

        // Seller factors
        if (product.seller) {
            const sellerTrustImpact = Math.round((product.seller.trust_score - 70) / 2); // Scale seller score
            trustScore += sellerTrustImpact;
            scoreBreakdown["Seller Reputation"] = `Score ${product.seller.trust_score} (${sellerTrustImpact > 0 ? '+' : ''}${sellerTrustImpact} pts)`;
            if (product.seller.is_verified) {
                trustScore += 5;
                scoreBreakdown["Seller Verification"] = "Verified (+5 pts)";
            }
        } else {
             scoreBreakdown["Seller Information"] = "Unavailable (-5 pts)";
             trustScore -=5;
        }
        
        // Review quality (simple heuristic from our fake review analysis)
        // This is a bit circular if fake review analysis output isn't available yet, but for a mock:
        if (analysisResult.estimatedGenuinePercentage && analysisResult.estimatedGenuinePercentage < 80 ) { // Assuming we ran fake review earlier
             const reviewQualityPenalty = Math.round((80 - analysisResult.estimatedGenuinePercentage)/5);
             trustScore -= reviewQualityPenalty;
             scoreBreakdown["Review Quality (Est.)"] = `~${analysisResult.estimatedGenuinePercentage.toFixed(0)}% genuine (-${reviewQualityPenalty} pts)`;
        }


        trustScore = Math.min(Math.max(Math.round(trustScore), 5), 99); // Cap score

        analysisResult = {
          title: "Overall Trust Score",
          summary: `The TrustGuard AI has assigned an overall trust score of ${trustScore}/100 for "${product.title}".`,
          trustScore: trustScore,
          breakdown: scoreBreakdown,
        };
        break;

      // 5. LLM-GENERATED SUMMARY (using Together AI)
      case 'llm-summary':
        if (!together) {
            // ... (mock fallback as before)
            analysisResult = {
                title: "AI-Generated Product Summary (Mock)",
                summary: `This is a mock summary for "${product.title}". The LLM service is not configured. Product seems to be a ${product.category} by ${product.seller?.seller_name || product.store_seller_name || 'Unknown Brand'}.`,
                keywords: [product.category, "mock", "summary"],
            };
            break; 
        }
        try {
          // ... (LLM prompt and call logic as before)
          console.log(`Generating LLM summary for product: ${product.title}`);
          const productDescriptionText = Array.isArray(product.description) ? product.description.join(' ') : (product.description || "No description available.");
          let reviewSnippetsText = "No recent reviews sampled for summary.";
          if (product.reviews && product.reviews.length > 0) {
            reviewSnippetsText = product.reviews.slice(0, 3).map(r => `- "${r.text.substring(0,150)}..." (Rating: ${r.rating})`).join('\n'); // Take first 3, shorten text
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
          console.log("LLM Raw Response Text:", summaryText);

          analysisResult = {
            title: "AI-Generated Product Summary",
            summary: summaryText,
            keywords: [product.category, (product.seller?.seller_name?.split(' ')[0] || product.store_seller_name?.split(' ')[0] || "product"), "summary"],
          };
        } catch (e) {
          // ... (error handling for LLM as before)
          console.error("Error calling Together AI for LLM Summary:", e);
          let errorMessage = "Error generating AI summary. Please try again later.";
          if (e.status === 404 && e.error?.code === "model_not_available") {
            errorMessage = `The selected LLM model is currently unavailable (${e.error.message}). Please contact support or try a different model.`;
          }
          analysisResult = {
            title: "AI-Generated Product Summary",
            summary: errorMessage,
          };
        }
        break;
      default:
        return NextResponse.json({ message: 'Invalid analysis type' }, { status: 400 });
    }

    return NextResponse.json({ success: true, analysisType: analysisTypeFromParams, data: analysisResult });

  } catch (error) {
    console.error(`Failed to perform analysis for ${analysisTypeFromParams || 'unknown type'} (Product ID: ${queryProductId || 'unknown'}):`, error);
    return NextResponse.json({ message: 'Analysis failed', error: "An unexpected server error occurred." }, { status: 500 });
  }
}