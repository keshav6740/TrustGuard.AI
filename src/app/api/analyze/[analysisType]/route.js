// src/app/api/analyze/[analysisType]/route.js
import { NextResponse } from "next/server";
import { PrismaClient } from "@prisma/client";
import Together from "together-ai";

let prisma;
if (process.env.NODE_ENV === "production") {
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

if (!together && process.env.NODE_ENV === "development") {
  console.warn(
    "API_ANALYZE_ROUTE (Corrected Schema): TOGETHER_API_KEY not found. LLM features will use mocks for fraud, counterfeit, fake reviews, and summary."
  );
}

// This function was part of your original code.
// While the main analysis types are moving to LLM or are heuristic,
// it's kept as per instructions to not remove code.
// It might be useful for other future fine-grained text analysis.
function analyzeReviewText(text) {
  let flags = [];
  if (!text || typeof text !== "string") return flags;
  if (text.length < 50) flags.push("Short review text");
  if (
    text.toLowerCase().includes("amazing product") ||
    text.toLowerCase().includes("best ever") ||
    text.toLowerCase().includes("highly recommend")
  )
    flags.push("Contains generic positive phrases");
  if (
    text.toLowerCase().includes("terrible") ||
    text.toLowerCase().includes("worst product") ||
    text.toLowerCase().includes("do not buy")
  )
    flags.push("Contains generic negative phrases");
  if (text.toUpperCase() === text && text.length > 20)
    flags.push("Review text is all caps");
  if ((text.match(/[!?.]{3,}/g) || []).length > 0)
    flags.push("Review text has excessive punctuation");
  return flags;
}

export async function POST(request, { params }) {
  let queryProductId;
  let analysisTypeFromParams;

  console.log(
    `API_ANALYZE_ROUTE (Corrected Schema): Destructured params received: ${JSON.stringify(
      params
    )}`
  );
  try {
    analysisTypeFromParams = params?.analysisType;

    if (!analysisTypeFromParams) {
      console.error(
        "API_ANALYZE_ROUTE: Analysis type parameter is missing from destructured params:",
        params
      );
      return NextResponse.json(
        { message: "Analysis type parameter is missing" },
        { status: 400 }
      );
    }

    const body = await request.json();
    queryProductId = body.productId;

    let itemProductNo;
    try {
      itemProductNo = BigInt(queryProductId);
    } catch (e) {
      console.error(
        "API_ANALYZE_ROUTE: Invalid product_no format for analysis:",
        queryProductId
      );
      return NextResponse.json(
        { message: "Invalid product ID" },
        { status: 400 }
      );
    }

    if (!prisma) {
      console.error(
        "API_ANALYZE_ROUTE: CRITICAL - Prisma client is not initialized!"
      );
      return NextResponse.json(
        { message: "Database client not initialized" },
        { status: 500 }
      );
    }
    console.log(
      `API_ANALYZE_ROUTE: Fetching item with product_no ${itemProductNo} for analysis type ${analysisTypeFromParams}`
    );

    const item = await prisma.items.findUnique({
      where: { product_no: itemProductNo },
      include: {
        Sellers: true,
        Reviews: {
          include: { Users: true },
          orderBy: { review_id: "desc" },
          take: 20, // Used for 'fake-review-analysis' and 'llm-summary' context
        },
      },
    });

    if (!item) {
      console.log(
        `API_ANALYZE_ROUTE: Item not found for product_no: ${itemProductNo}`
      );
      return NextResponse.json(
        { message: "Product not found for analysis" },
        { status: 404 }
      );
    }
    console.log(`API_ANALYZE_ROUTE: Item found: ${item.title} for analysis.`);

    let analysisResult = {};

    switch (analysisTypeFromParams) {
      case "fraud-detection":
        console.log(
          "API_ANALYZE_ROUTE: Performing LLM-based 'fraud-detection'"
        );
        if (!together) {
          analysisResult = {
            title: "Fraud Potential Assessment (Mock)",
            summary: "LLM service for fraud detection is not configured. This is a mock response based on simplified heuristics.",
            riskScore: 45, // Example mock value
            details: [
                `Analyzing product: "${item.title}" by seller "${item.Sellers?.seller_name || "Unknown Seller"}" (Mock Data)`,
                "Seller verification status (mocked).",
                "Price and rating anomalies (mocked check)."
            ],
          };
          break;
        }

        try {
          const productInfoForLLMFraud = `
            Product Name: ${item.title}
            Seller Name: ${item.Sellers?.seller_name || "Unknown Seller"}
            Seller Verified: ${item.Sellers?.is_verified === undefined ? "Unknown" : item.Sellers.is_verified ? "Yes" : "No"}
            Seller Total Products Listed: ${item.Sellers?.total_products === null || item.Sellers?.total_products === undefined ? "Unknown" : Number(item.Sellers.total_products)}
            Product Price: ₹${item.price !== null ? Number(item.price).toLocaleString("en-IN") : "Not available"}
            Average Rating: ${item.rating !== null ? Number(item.rating).toFixed(1) + " stars" : "Not rated"}
            Number of Ratings: ${Number(item.rating_number) || 0}
            Product Description (first 200 chars): ${item.description ? item.description.substring(0, 200) + "..." : "No description"}
            Product Category: ${item.category || "N/A"}
            Product Verified by Platform: ${item.verified_product === undefined ? "Unknown" : item.verified_product ? "Yes" : "No"}
          `;

          const llmPromptForFraud = `
            You are an AI expert specializing in e-commerce fraud detection for a platform called TrustGuard.AI.
            Analyze the following product information for potential fraud indicators.
            Consider factors such as:
            - Seller information (verification status, number of products listed, name consistency).
            - Product pricing (unusually low or high for its category, compared to similar items if possible - though you only have this item's data).
            - Rating and review count anomalies (e.g., high rating with very few reviews, sudden influx of reviews).
            - Product description cues (vagueness, inconsistencies, overly aggressive marketing).
            - Product verification status on the platform.

            Product Information:
            ${productInfoForLLMFraud}

            Your Analysis Task:
            1.  Provide an overall Fraud Risk Score (an integer between 0 and 100, where 100 signifies the highest possible risk).
            2.  Write a brief Summary of your assessment (2-4 sentences) explaining the main reasons for the score.
            3.  List up to 5 key Factors or observations (can be positive or negative) that contributed to your score. These should be specific.

            Format your response strictly as follows:
            Fraud Risk Score: [Your Score]
            Summary: [Your Summary]
            Key Factors:
            - [Factor 1]
            - [Factor 2]
            ...
          `;

          console.log(
            "API_ANALYZE_ROUTE: Sending data to LLM for fraud detection..."
          );
          const llmResponse = await together.chat.completions.create({
            model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
            messages: [{ role: "user", content: llmPromptForFraud }],
            max_tokens: 450, // Increased slightly for more detailed factors
            temperature: 0.5,
          });

          let llmOutputText = "LLM fraud analysis could not be completed.";
          if (llmResponse.choices && llmResponse.choices[0] && llmResponse.choices[0].message && llmResponse.choices[0].message.content) {
            llmOutputText = llmResponse.choices[0].message.content.trim();
          }
          console.log("API_ANALYZE_ROUTE: LLM Fraud Detection Raw Output:", llmOutputText);

          // Parse LLM output
          let fraudRiskScore = 50; // Default if parsing fails
          let summary = "Could not determine summary from LLM response.";
          let details = ["LLM response parsing failed or information not provided in expected format."];

          const scoreMatch = llmOutputText.match(/Fraud Risk Score:\s*(\d{1,3})/i);
          if (scoreMatch && scoreMatch[1]) {
            fraudRiskScore = parseInt(scoreMatch[1], 10);
          }

          const summaryMatch = llmOutputText.match(/Summary:\s*([\s\S]*?)(Key Factors:|$)/i);
          if (summaryMatch && summaryMatch[1]) {
            summary = summaryMatch[1].trim();
          } else {
             // Fallback for summary if "Key Factors:" is not present or summary is very short
            const genericSummaryLines = llmOutputText.split('\n');
            const summaryLineIndex = genericSummaryLines.findIndex(line => line.toLowerCase().startsWith('summary:'));
            if(summaryLineIndex !== -1) {
                let tempSummary = genericSummaryLines[summaryLineIndex].substring('summary:'.length).trim();
                // Try to grab a few lines if it looks like a paragraph
                for(let i = summaryLineIndex + 1; i < genericSummaryLines.length && !genericSummaryLines[i].toLowerCase().startsWith('key factors:'); i++) {
                    if (genericSummaryLines[i].trim() === "") break; // Stop at empty line
                    tempSummary += " " + genericSummaryLines[i].trim();
                }
                summary = tempSummary;
            }
          }

          const factorsMatch = llmOutputText.match(/Key Factors:\s*([\s\S]*)/i);
          if (factorsMatch && factorsMatch[1]) {
            details = factorsMatch[1].trim().split('\n').map(s => s.replace(/^- /, "").trim()).filter(Boolean);
            if (details.length === 0 && factorsMatch[1].trim() !== "") details = [factorsMatch[1].trim()]; // Handle single line factor
            if (details.length === 0) details = ["No specific factors listed by LLM, or formatting mismatch."];
          }

          analysisResult = {
            title: "LLM-Powered Fraud Potential Assessment",
            summary: `${summary} (Score: ${fraudRiskScore}/100)`,
            riskScore: fraudRiskScore,
            details: details,
            llm_full_response: llmOutputText, 
          };

        } catch (e) {
          console.error("API_ANALYZE_ROUTE: Error calling Together AI for Fraud Detection:", e);
          analysisResult = {
            title: "Fraud Potential Assessment Error",
            summary: "Error performing LLM-based fraud detection. Please try again later.",
            riskScore: -1, 
            details: [`Error: ${e.message || "Unknown error during LLM call"}`],
          };
        }
        break;

      case "counterfeit-detection":
        console.log(
          "API_ANALYZE_ROUTE: Performing LLM-based 'counterfeit-detection'"
        );
        if (!together) {
          analysisResult = {
            title: "Counterfeit Likelihood Report (Mock)",
            summary: "LLM service for counterfeit detection is not configured. This is a mock response.",
            authenticityConfidence: 65, // Example mock value
            indicators: [
                `Analyzing product: "${item.title}" (Mock Data)`,
                "Product verification status (mocked).",
                "Description keyword check (mocked)."
            ],
          };
          break;
        }

        try {
          const productInfoForLLMCounterfeit = `
            Product Name: ${item.title}
            Product Verified by Platform: ${item.verified_product === undefined ? "Unknown" : item.verified_product ? "Yes" : "No"}
            Seller Name: ${item.Sellers?.seller_name || "Unknown Seller"}
            Seller Verified: ${item.Sellers?.is_verified === undefined ? "Unknown" : item.Sellers.is_verified ? "Yes" : "No"}
            Product Description (full): "${item.description || "No description available."}"
            Product Category: ${item.category || "N/A"}
            Product Price: ₹${item.price !== null ? Number(item.price).toLocaleString("en-IN") : "Not available"}
            Brand (discernible from title/seller, if any): ${item.title?.split(" ")[0]} or ${item.Sellers?.seller_name?.split(" ")[0] || "Not explicitly stated"}
            Average Rating: ${item.rating !== null ? Number(item.rating).toFixed(1) + " stars" : "Not rated"}
            Number of Ratings: ${Number(item.rating_number) || 0}
          `;

          const llmPromptForCounterfeit = `
            You are an AI expert in identifying counterfeit e-commerce products for TrustGuard.AI.
            Analyze the provided product information to assess the likelihood of it being a counterfeit item.
            Pay close attention to:
            - Product verification status (platform verified is a strong signal).
            - Seller details (name, verification, association with brand).
            - Phrasing in the product description (e.g., "replica", "inspired by", "1:1", "high copy", "master copy", "first copy", disclaimers about authenticity).
            - Price relative to its category and perceived brand value (extremely low prices are suspicious for known brands).
            - Consistency of brand presentation.
            - Quality of the description (poor grammar, spelling errors can sometimes be an indicator for non-official listings).

            Product Information:
            ${productInfoForLLMCounterfeit}

            Your Analysis Task:
            1.  Provide an Authenticity Confidence Score (an integer between 0 and 100, where 100 means highly authentic/genuine, and 0 means highly likely counterfeit).
            2.  Write a brief Summary of your assessment (2-4 sentences) explaining your confidence level.
            3.  List up to 5 key Indicators (positive, negative, or neutral observations) that influenced your score. Be specific.

            Format your response strictly as follows:
            Authenticity Confidence Score: [Your Score]
            Summary: [Your Summary]
            Key Indicators:
            - [Indicator 1]
            - [Indicator 2]
            ...
          `;

          console.log(
            "API_ANALYZE_ROUTE: Sending data to LLM for counterfeit detection..."
          );
          const llmResponse = await together.chat.completions.create({
            model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
            messages: [{ role: "user", content: llmPromptForCounterfeit }],
            max_tokens: 500, // Increased for potentially longer descriptions to parse
            temperature: 0.4, // Slightly lower for more factual assessment
          });

          let llmOutputText = "LLM counterfeit analysis could not be completed.";
          if (llmResponse.choices && llmResponse.choices[0] && llmResponse.choices[0].message && llmResponse.choices[0].message.content) {
            llmOutputText = llmResponse.choices[0].message.content.trim();
          }
          console.log("API_ANALYZE_ROUTE: LLM Counterfeit Detection Raw Output:", llmOutputText);

          // Parse LLM output
          let authenticityConfidence = 50; // Default if parsing fails
          let summary = "Could not determine summary from LLM response.";
          let indicators = ["LLM response parsing failed or information not provided in expected format."];

          const scoreMatch = llmOutputText.match(/Authenticity Confidence Score:\s*(\d{1,3})/i);
          if (scoreMatch && scoreMatch[1]) {
            authenticityConfidence = parseInt(scoreMatch[1], 10);
          }

          const summaryMatch = llmOutputText.match(/Summary:\s*([\s\S]*?)(Key Indicators:|$)/i);
          if (summaryMatch && summaryMatch[1]) {
            summary = summaryMatch[1].trim();
          } else {
            const genericSummaryLines = llmOutputText.split('\n');
            const summaryLineIndex = genericSummaryLines.findIndex(line => line.toLowerCase().startsWith('summary:'));
            if(summaryLineIndex !== -1) {
                let tempSummary = genericSummaryLines[summaryLineIndex].substring('summary:'.length).trim();
                for(let i = summaryLineIndex + 1; i < genericSummaryLines.length && !genericSummaryLines[i].toLowerCase().startsWith('key indicators:'); i++) {
                     if (genericSummaryLines[i].trim() === "") break;
                    tempSummary += " " + genericSummaryLines[i].trim();
                }
                summary = tempSummary;
            }
          }

          const indicatorsMatch = llmOutputText.match(/Key Indicators:\s*([\s\S]*)/i);
          if (indicatorsMatch && indicatorsMatch[1]) {
            indicators = indicatorsMatch[1].trim().split('\n').map(s => s.replace(/^- /, "").trim()).filter(Boolean);
            if (indicators.length === 0 && indicatorsMatch[1].trim() !== "") indicators = [indicatorsMatch[1].trim()];
            if (indicators.length === 0) indicators = ["No specific indicators listed by LLM, or formatting mismatch."];
          }
          
          analysisResult = {
            title: "LLM-Powered Counterfeit Likelihood Report",
            summary: `${summary} (Confidence: ${authenticityConfidence}%)`,
            authenticityConfidence: authenticityConfidence,
            indicators: indicators,
            llm_full_response: llmOutputText,
          };

        } catch (e) {
          console.error("API_ANALYZE_ROUTE: Error calling Together AI for Counterfeit Detection:", e);
          analysisResult = {
            title: "Counterfeit Likelihood Report Error",
            summary: "Error performing LLM-based counterfeit detection. Please try again later.",
            authenticityConfidence: -1, 
            indicators: [`Error: ${e.message || "Unknown error during LLM call"}`],
          };
        }
        break;

      case "fake-review-analysis":
        console.log(
          "API_ANALYZE_ROUTE: Performing LLM-based 'fake-review-analysis'"
        );

        if (!together) {
          analysisResult = {
            title: "Fake Review Analysis (Mock)",
            summary:
              "LLM service for review analysis is not configured. Using heuristic placeholder.",
            estimatedGenuinePercentageInSample: 75, 
            patterns: ["Mock: Based on simplified checks like review length and generic phrases."],
            llm_full_response: "Mock response as LLM is not configured.",
          };
          break;
        }

        if (!item.Reviews || item.Reviews.length === 0) {
          analysisResult = {
            title: "Fake Review Analysis",
            summary: "No reviews available for this product to analyze.",
            estimatedGenuinePercentageInSample: null,
            patterns: ["No reviews to analyze."],
            llm_full_response: "No reviews present for analysis.",
          };
          break;
        }

        const reviewSampleForLLM = item.Reviews.slice(0, 10); 

        const reviewsTextForLLM = reviewSampleForLLM
          .map((review, index) => {
            return `Review ${index + 1}:
        User: ${review.Users?.username || "Anonymous"} (Total Reviews by User: ${ Number(review.Users?.total_reviews) || 0 })
        Rating: ${review.rating || "N/A"} stars
        Title: ${review.title || "N/A"}
        Text: "${review.text || "No text provided."}"
        Helpful Votes for this review: ${Number(review.helpful_vote) || 0}
        Date: ${review.date_time ? new Date(review.date_time).toLocaleDateString() : "N/A"}
        ---`;
          })
          .join("\n\n");

        const llmPromptForFakeReview = `
        You are an AI expert in detecting inauthentic or manipulated e-commerce product reviews for TrustGuard.AI.
        Analyze the following set of reviews for the product "${item.title}".
        Identify any reviews that seem suspicious, potentially fake, bot-generated, or overly biased without substance.
        For each review you identify as suspicious, briefly state the reason.
        Finally, provide an overall assessment: 
        1. An estimated percentage of how many of these sampled reviews seem authentic.
        2. A list of common suspicious patterns observed (if any).
        3. A list of individual suspicious reviews (if any, max 3) with brief reasons.

        Product: "${item.title}"
        Category: ${item.category}

        Reviews to Analyze:
        ${reviewsTextForLLM}

        Your Analysis (Format strictly):
        Overall Authenticity Estimate (for this sample): [Provide a percentage, e.g., "Approximately 70% seem authentic"]
        Suspicious Patterns Observed:
        - [Pattern 1, e.g., Repetitive phrasing across multiple reviews]
        - [Pattern 2, e.g., Lack of specific details, overly generic]
        - [Pattern 3, e.g., Reviews from users with no other activity or very new accounts]
        Individual Suspicious Reviews:
        - Review [Number]: [Reason, e.g., "Very vague, uses generic praise, user has 0 other reviews."]
        - Review [Number]: [Reason]
      `;

        try {
          console.log(
            "API_ANALYZE_ROUTE: Sending review data to LLM for fake review analysis..."
          );
          const llmResponse = await together.chat.completions.create({
            model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
            messages: [{ role: "user", content: llmPromptForFakeReview }],
            max_tokens: 700, // Increased for potentially detailed review analysis
            temperature: 0.4,
          });

          let llmOutputText = "LLM analysis could not be completed.";
          if (llmResponse.choices && llmResponse.choices[0] && llmResponse.choices[0].message && llmResponse.choices[0].message.content) {
            llmOutputText = llmResponse.choices[0].message.content.trim();
          }
          console.log("API_ANALYZE_ROUTE: LLM Fake Review Analysis Raw Output:", llmOutputText);

          let authenticityEstimate = "Could not determine authenticity estimate.";
          let suspiciousPatterns = ["Could not determine suspicious patterns from LLM response."];
          let estimatedGenuinePercentage = null;

          const estimateMatch = llmOutputText.match(/Overall Authenticity Estimate \(for this sample\):\s*Approximately (\d{1,3})% seem authentic/i);
          if (estimateMatch && estimateMatch[1]) {
            authenticityEstimate = `Approximately ${estimateMatch[1]}% of sampled reviews seem authentic.`;
            estimatedGenuinePercentage = parseFloat(estimateMatch[1]);
          } else {
            const genericEstimateMatch = llmOutputText.match(/(\d{1,3})%\s*(seem authentic|authentic)/i);
            if (genericEstimateMatch && genericEstimateMatch[1]) {
              authenticityEstimate = `${genericEstimateMatch[1]}% of sampled reviews seem authentic (inferred).`;
              estimatedGenuinePercentage = parseFloat(genericEstimateMatch[1]);
            }
          }

          const patternsMatch = llmOutputText.match(/Suspicious Patterns Observed:\s*([\s\S]*?)(Individual Suspicious Reviews:|$)/i);
          if (patternsMatch && patternsMatch[1]) {
            suspiciousPatterns = patternsMatch[1].trim().split('\n').map(s => s.replace(/^- /, "").trim()).filter(Boolean);
            if (suspiciousPatterns.length === 0 && patternsMatch[1].trim() !== "") suspiciousPatterns = [patternsMatch[1].trim()];
            if (suspiciousPatterns.length === 0) suspiciousPatterns = ["No specific patterns highlighted by LLM or parsing failed."];
          }
          
          analysisResult = {
            title: "LLM-Powered Review Authenticity Analysis",
            summary: `LLM analysis of ${reviewSampleForLLM.length} reviews. ${authenticityEstimate}`,
            llm_full_response: llmOutputText, 
            estimatedGenuinePercentageInSample: estimatedGenuinePercentage,
            patterns: suspiciousPatterns,
          };
        } catch (e) {
          console.error("API_ANALYZE_ROUTE: Error calling Together AI for Fake Review Analysis:", e);
          analysisResult = {
            title: "Fake Review Analysis Error",
            summary: "Error performing LLM-based review analysis. Please try again later.",
            estimatedGenuinePercentageInSample: null,
            patterns: [`Error: ${e.message || "Unknown error during LLM call"}`],
            llm_full_response: `Error: ${e.message || "Unknown error during LLM call"}`,
          };
        }
        break;

      case "trust-score": // This case remains heuristic-based as requested
        console.log("API_ANALYZE_ROUTE: Calculating heuristic 'trust-score'");
        let calculatedTrustScore = 50; // Base score
        let scoreBreakdownDetails = {};

        // Rating Impact
        if (item.rating !== null) {
          const ratingValue = Number(item.rating);
          const ratingImpact = Math.round((ratingValue - 3.0) * 10); // Neutral at 3.0 stars
          calculatedTrustScore += ratingImpact;
          scoreBreakdownDetails["Average Product Rating"] = `${ratingValue.toFixed(1)}★ (${ratingImpact >= 0 ? "+" : ""}${ratingImpact} pts)`;
        } else {
          scoreBreakdownDetails["Average Product Rating"] = "Not Rated (0 pts)";
        }

        // Review Volume Impact
        if (item.rating_number !== null) {
          const reviewCount = Number(item.rating_number);
          let reviewVolumeImpact = 0;
          if (reviewCount > 0) {
            reviewVolumeImpact = Math.min(Math.round(reviewCount / 10), 15); // Caps at +15 for 150+ reviews
            if (reviewCount < 5) reviewVolumeImpact -= 5; // Penalty for very few reviews
          }
          calculatedTrustScore += reviewVolumeImpact;
          scoreBreakdownDetails["Number of Reviews"] = `${reviewCount} reviews (${reviewVolumeImpact >= 0 ? "+" : ""}${reviewVolumeImpact} pts)`;
        } else {
          scoreBreakdownDetails["Number of Reviews"] = "0 reviews (-5 pts)";
          calculatedTrustScore -=5;
        }

        // Product Verification
        if (item.verified_product === true) {
          calculatedTrustScore += 15;
          scoreBreakdownDetails["Product Verification"] = "Verified by Platform (+15 pts)";
        } else if (item.verified_product === false) {
          calculatedTrustScore -= 5; // Explicitly not verified might be a slight negative
           scoreBreakdownDetails["Product Verification"] = "Marked Not Verified (-5 pts)";
        }
        else {
          scoreBreakdownDetails["Product Verification"] = "Verification Unknown (0 pts)";
        }

        // Seller Information & Verification
        if (item.Sellers) {
          if (item.Sellers.is_verified === true) {
            calculatedTrustScore += 10;
            scoreBreakdownDetails["Seller Verification"] = "Seller Verified (+10 pts)";
          } else if (item.Sellers.is_verified === false) {
             calculatedTrustScore -= 10;
             scoreBreakdownDetails["Seller Verification"] = "Seller NOT Verified (-10 pts)";
          } else {
            scoreBreakdownDetails["Seller Verification"] = "Seller Verification Unknown (-5 pts)";
            calculatedTrustScore -= 5;
          }

          // Seller Product Count
          if (item.Sellers.total_products !== null) {
            const sellerProductCount = Number(item.Sellers.total_products);
            if (sellerProductCount < 3) {
              calculatedTrustScore -= 5;
              scoreBreakdownDetails["Seller Product Count"] = `Low (${sellerProductCount}) (-5 pts)`;
            } else if (sellerProductCount > 50) {
              calculatedTrustScore += 5;
              scoreBreakdownDetails["Seller Product Count"] = `High (${sellerProductCount}) (+5 pts)`;
            } else {
              scoreBreakdownDetails["Seller Product Count"] = `Moderate (${sellerProductCount}) (0 pts)`;
            }
          } else {
            scoreBreakdownDetails["Seller Product Count"] = "Unknown (0 pts)";
          }

        } else {
          scoreBreakdownDetails["Seller Information"] = "Unavailable (-10 pts)";
          calculatedTrustScore -= 10;
        }

        // Price Sanity (Simple Check - could be expanded)
        if (item.price !== null && Number(item.price) < 100 && item.category && !["Books", "Accessories"].includes(item.category) ) { // Example: very low price for non-trivial items
            calculatedTrustScore -= 5;
            scoreBreakdownDetails["Price Point"] = "Potentially Suspiciously Low (-5 pts)";
        }


        // Extreme Low Rating Penalty
        if (item.rating !== null && Number(item.rating) < 2.0 && (Number(item.rating_number) || 0) > 5) {
          calculatedTrustScore -= 20; // Heavier penalty
          scoreBreakdownDetails["Low Rating Alert"] = `Significantly Low Rating (${Number(item.rating).toFixed(1)}★) (-20 pts)`;
        }
        
        calculatedTrustScore = Math.min(Math.max(Math.round(calculatedTrustScore), 0), 100); // Clamp score between 0 and 100

        analysisResult = {
          title: "Overall Product Trust Score",
          summary: `The TrustGuard AI has assigned an overall trust score of ${calculatedTrustScore}/100 for "${item.title}". This score is based on heuristic checks.`,
          trustScore: calculatedTrustScore,
          breakdown: scoreBreakdownDetails,
        };
        break;

      case "llm-summary":
        console.log("API_ANALYZE_ROUTE: Performing LLM-based 'llm-summary'");
        if (!together) {
          analysisResult = {
            title: "AI-Generated Product Summary (Mock)",
            summary: `This is a mock summary for "${item.title}". It appears to be a product in the "${item.category || 'unknown'}" category, sold by "${item.Sellers?.seller_name || 'an unknown seller'}". LLM service not configured.`,
            keywords: [item.category || "product", item.Sellers?.seller_name?.split(" ")[0] || "item", "summary", "mock"],
            llm_full_response: "Mock response as LLM is not configured.",
          };
          break;
        }
        try {
          console.log(`API_ANALYZE_ROUTE: Generating LLM summary for product: ${item.title}`);
          const productDescriptionText = item.description ? item.description.substring(0,1000) + (item.description.length > 1000 ? "..." : "") : "No description available."; // Limit description length
          
          let reviewSnippetsText = "No recent reviews sampled for summary.";
          if (item.Reviews && item.Reviews.length > 0) {
            reviewSnippetsText = item.Reviews.slice(0, 3) // Use up to 3 reviews
              .map(r => `- "${r.text ? r.text.substring(0, 150) : "Review text missing"}..." (Rating: ${r.rating || "N/A"})`) // Limit review text length
              .join("\n");
          }

          const llmPrompt = `
            You are an AI assistant for an e-commerce trust platform called TrustGuard.AI.
            Your task is to provide a concise, balanced, and strictly factual summary for the product named "${item.title}".
            Base your summary ONLY on the information provided below. Do NOT invent features, reviews, or sentiments not explicitly present.
            If information is scarce, keep the summary very brief and general, stating what is known.
            Aim for 3-4 informative sentences. Max 120 words.
            Focus on key characteristics, what the product is, its main purpose if clear, and overall user reception if available.

            Product Information:
            - Name: ${item.title}
            - Seller/Brand: ${item.Sellers?.seller_name || "Unknown Seller/Brand"}
            - Category: ${item.category || "Not specified"}
            - Description (excerpt): ${productDescriptionText}
            - Average Rating: ${item.rating ? Number(item.rating).toFixed(1) + " stars" : "Not Rated"} from ${Number(item.rating_number) || 0} reviews.
            - Price: ₹${item.price ? Number(item.price).toLocaleString("en-IN") : "Price not available"} 
            - Platform Verified Product: ${item.verified_product === true ? "Yes" : item.verified_product === false ? "No" : "Unknown"}
            
            Recent Review Snippets (use cautiously, may not represent all reviews and are only excerpts):
            ${reviewSnippetsText}

            Generate the summary now:
          `;
          const llmResponse = await together.chat.completions.create({
            model: "mistralai/Mixtral-8x7B-Instruct-v0.1",
            messages: [{ role: "user", content: llmPrompt }],
            max_tokens: 200, // Increased slightly for a bit more comprehensive summary
            temperature: 0.35,
          });
          let summaryText = "Could not generate summary at this time.";
          if (llmResponse.choices && llmResponse.choices[0] && llmResponse.choices[0].message && llmResponse.choices[0].message.content) {
            summaryText = llmResponse.choices[0].message.content.trim();
          }
          console.log("API_ANALYZE_ROUTE: LLM Summary Raw Response Text:", summaryText);
          analysisResult = {
            title: "AI-Generated Product Summary",
            summary: summaryText,
            keywords: [item.category || "product", item.Sellers?.seller_name?.split(" ")[0] || "item", "summary"],
            llm_full_response: summaryText, 
          };
        } catch (e) {
          console.error("API_ANALYZE_ROUTE: Error calling Together AI for LLM Summary:", e);
          let errorMessage = "Error generating AI summary. Please try again later.";
          if (e.response && e.response.data && e.response.data.error && typeof e.response.data.error.message === 'string') {
             errorMessage = `LLM API Error: ${e.response.data.error.message}`;
          } else if (e.message) {
            errorMessage = `LLM API Error: ${e.message}`;
          }
          analysisResult = {
            title: "AI-Generated Product Summary",
            summary: errorMessage,
            llm_full_response: errorMessage,
          };
        }
        break;
      default:
        console.warn(`API_ANALYZE_ROUTE: Invalid analysis type received: ${analysisTypeFromParams}`);
        return NextResponse.json({ message: "Invalid analysis type" }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      analysisType: analysisTypeFromParams,
      data: analysisResult,
    });
  } catch (error) {
    console.error(
      `API_ANALYZE_ROUTE (Corrected Schema): Failed to perform analysis for ${analysisTypeFromParams || "unknown type"} (Product ID: ${queryProductId || "unknown"}):`, error);
    let errorMsg = "An unexpected server error occurred.";
    if (error instanceof Error) {
        errorMsg = error.message;
    } else if (typeof error === 'string') {
        errorMsg = error;
    }
    return NextResponse.json(
      {
        message: "Analysis failed due to a server error.",
        error: errorMsg,
      },
      { status: 500 }
    );
  }
}
