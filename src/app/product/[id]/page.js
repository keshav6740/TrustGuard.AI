// src/app/product/[id]/page.js
'use client';

import { useParams } from 'next/navigation';
import Image from 'next/image';
import Navbar from '../components/Navbar';
import { useState, useEffect } from 'react';
import Footer from '../components/Footer';
import { useCart } from '../context/CartContext';
import { CheckCircleIcon } from '@heroicons/react/24/solid';
import { ShoppingBagIcon as ShoppingBagIconOutline, PhotoIcon, UserCircleIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';

// AnalysisButton Component
const AnalysisButton = ({ productId, analysisType, label, setAnalysisResult, setIsLoadingAnalysis }) => {
  const handleClick = async () => {
    console.log(`AnalysisButton: Clicked "${label}" for product ID ${productId}, type: ${analysisType}`);
    setIsLoadingAnalysis(true);
    setAnalysisResult(null); 
    try {
      const res = await fetch(`/api/analyze/${analysisType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }), // productId here is the item.product_no
      });
      const responseText = await res.text();
      console.log(`AnalysisButton (${analysisType}): API Raw Response Text:`, responseText);

      if (!res.ok) {
        console.error(`AnalysisButton (${analysisType}): API Error! Status: ${res.status}, Response: ${responseText}`);
        let errorMessage = `Analysis failed: ${res.statusText} (${res.status})`;
        try { const errData = JSON.parse(responseText); errorMessage = errData.message || errorMessage; } catch (e) { /* Ignore */ }
        throw new Error(errorMessage);
      }
      
      const data = JSON.parse(responseText);
      console.log(`AnalysisButton (${analysisType}): Data from API:`, JSON.stringify(data, null, 2));

      if (data && data.data) {
          console.log(`AnalysisButton (${analysisType}): Setting analysisResult with:`, JSON.stringify(data.data, null, 2));
          setAnalysisResult(data.data);
      } else {
          console.error(`AnalysisButton (${analysisType}): API response missing 'data' field or data is null.`);
          setAnalysisResult({ title: "Response Error", summary: "Invalid response structure from AI analysis API." });
      }
    } catch (err) {
      console.error(`AnalysisButton (${analysisType}): Error during fetch or processing:`, err);
      setAnalysisResult({ title: "Fetch Error", summary: err.message || "An unexpected error occurred." });
    } finally {
      setIsLoadingAnalysis(false);
    }
  };
  return ( <button onClick={handleClick} className="px-3 py-2 sm:px-4 rounded-lg bg-gray-700 text-white text-xs sm:text-sm font-medium hover:bg-gray-600 transition-colors duration-150 ease-in-out shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50 whitespace-nowrap"> {label} </button> );
};


export default function ProductPage() {
  const params = useParams();
  // The 'id' from the URL will now be the 'product_no'
  const productIdFromUrl = params?.id; 
  
  const { addToCart } = useCart();
  const [product, setProduct] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mainImage, setMainImage] = useState(null); 
  const [selectedSize, setSelectedSize] = useState('');
  const [addedToCartMessage, setAddedToCartMessage] = useState('');

  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);

  useEffect(() => {
    if (productIdFromUrl) {
      const fetchProductDetails = async () => {
        console.log(`PRODUCT_DETAIL_PAGE (product_no: ${productIdFromUrl}): Fetching details...`);
        setIsLoading(true);
        setError(null);
        setMainImage(null);
        setProduct(null);
        setAnalysisResult(null);
        setIsLoadingAnalysis(false);
        try {
          // The API endpoint expects the 'product_no' as the ID in the URL
          const res = await fetch(`/api/products/${productIdFromUrl}`); 
          if (!res.ok) {
            if (res.status === 404) throw new Error(`Product with ID ${productIdFromUrl} not found.`);
            const errorText = await res.text();
            throw new Error(`Failed to fetch product: ${res.statusText} (${res.status}). Response: ${errorText}`);
          }
          const data = await res.json();
          console.log(`PRODUCT_DETAIL_PAGE (product_no: ${productIdFromUrl}): Data received from API:`, JSON.stringify(data, null, 2));
          setProduct(data); // 'data' here should match 'responseProduct' from your API
          // 'data.image' from API is 'item.image_url', 'data.detailImage' is also 'item.image_url'
          setMainImage(data.detailImage || data.image || null); 
        } catch (err) {
          console.error(`PRODUCT_DETAIL_PAGE (product_no: ${productIdFromUrl}): Error fetching product details:`, err);
          setError(err.message);
        } finally {
          setIsLoading(false);
        }
      };
      fetchProductDetails();
    } else if (params && !productIdFromUrl && !isLoading) { 
        console.log("PRODUCT_DETAIL_PAGE: No product_no found in params.");
        setIsLoading(false);
        setError("Product ID not found in URL.");
    }
  }, [productIdFromUrl]); // Re-run if productIdFromUrl (which is params.id) changes

  useEffect(() => {
    if (analysisResult) {
        console.log("PRODUCT_DETAIL_PAGE: analysisResult state updated:", JSON.stringify(analysisResult, null, 2));
    }
  }, [analysisResult]);

  const handleAddToCart = () => {
    if (product) {
      // product.id from the API response is now item.product_no (as a number)
      // product.name is item.title
      // product.price_numeric is item.price (as a number)
      // product.image is item.image_url
      const cartProduct = {
        id: product.id, // This is product_no, used as unique ID in cart
        name: product.name,
        price_numeric: product.price_numeric, 
        image: product.image,
      };
      addToCart(cartProduct);
      setAddedToCartMessage(`${product.name} added to cart!`);
      setTimeout(() => setAddedToCartMessage(''), 3000);
    }
  };
  
  const getRatingPercentage = (star) => {
    if (!product || !product.reviews_list || product.reviews_list.length === 0) return '0%';
    const total = product.reviews_list.length;
    const count = product.reviews_list.filter(r => r.rating === star).length;
    return total ? `${(count / total) * 100}%` : '0%';
  };

  if (isLoading) return <div className="flex justify-center items-center min-h-screen text-xl text-gray-700">Loading product details...</div>;
  if (error) return <div className="flex justify-center items-center min-h-screen text-red-600 text-xl p-8 text-center">Error: {error}</div>;
  if (!product) return <div className="flex justify-center items-center min-h-screen text-xl text-gray-700">Product data unavailable.</div>;

  // Use 'image' from product data, which is now 'item.image_url' or null from API
  const imageSrcToDisplay = mainImage || product.image; 

  return (
    <div className="min-h-screen bg-white text-gray-900">
      <Navbar />
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12 px-4 sm:px-6 md:px-8 py-10">
          {/* IMAGE BLOCK */}
          <div className="md:sticky md:top-24 h-fit">
            <div className="relative w-full aspect-[4/5] rounded-xl shadow-2xl overflow-hidden bg-gray-100">
              {imageSrcToDisplay ? (
                <Image
                  src={imageSrcToDisplay}
                  alt={product.name || 'Product image'}
                  fill
                  className="object-contain"
                  priority
                  sizes="(max-width: 768px) 90vw, 45vw"
                  onError={() => {
                    setMainImage('https://dummyimage.com/800x1000/e0e0e0/757575.png&text=Image+Error');
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center text-gray-400">
                  <PhotoIcon className="w-24 h-24 mb-2" /> <span>No Image Available</span>
                </div>
              )}
            </div>
            {(product.image || (product.thumbnails && product.thumbnails.length > 0)) && (
              <div className="mt-4 flex justify-center gap-2 sm:gap-3">
                {product.image && (
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 cursor-pointer rounded-md overflow-hidden border-2 hover:border-indigo-500 transition-all" onClick={() => product.image && setMainImage(product.image)}>
                    <Image src={product.image} alt={`${product.name} main thumbnail`} fill className={`object-cover ${mainImage === product.image ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`} onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }}/>
                  </div>
                )}
                {product.thumbnails && product.thumbnails.map((thumbSrc, i) => ( thumbSrc && (
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 cursor-pointer rounded-md overflow-hidden border-2 hover:border-indigo-500 transition-all" key={i} onClick={() => setMainImage(thumbSrc)}>
                    <Image src={thumbSrc} alt={`Thumb ${i + 1}`} fill className={`object-cover ${mainImage === thumbSrc ? 'ring-2 ring-indigo-500 ring-offset-2' : ''}`} onError={(e) => { e.currentTarget.parentElement.style.display = 'none'; }} />
                  </div>
                )))}
              </div>
            )}
          </div>

          {/* DETAILS Column */}
          <div className="flex flex-col gap-6">
            <div>
              <p className="text-sm uppercase text-gray-500 tracking-wider mb-1">{product.brand || "Brand Unavailable"}</p>
              <h1 className="text-3xl lg:text-4xl font-bold text-gray-800">{product.name || "Product Name Unavailable"}</h1>
              {product.seller_info && (
                <p className="text-xs text-gray-500 mt-1">Sold by: <span className="font-medium">{product.seller_info.name}</span> {product.seller_info.is_verified && <ShieldCheckIcon className="inline w-4 h-4 text-green-600 ml-1" title="Verified Seller"/>}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-yellow-500 font-bold text-xl flex items-center">{product.rating || 0} ★</span>
              <span className="text-sm text-gray-500 hover:underline cursor-pointer">({product.reviewsCount || 0} customer reviews)</span>
            </div>
            <p className="text-4xl font-semibold text-gray-900">{product.price || "Price Unavailable"}</p>
            
            {product.sizes && product.sizes.length > 0 && ( /* Your new schema might not have 'sizes' on Items directly */
              <div> <p className="font-medium text-gray-700 mb-2">Available Sizes:</p> <div className="flex flex-wrap gap-2"> {product.sizes.map((size) => ( <button key={size} onClick={() => setSelectedSize(size)} className={`border px-4 py-2 rounded-md transition text-sm font-medium ${selectedSize === size ? 'bg-gray-800 text-white ring-2 ring-offset-1 ring-gray-800' : 'bg-white text-gray-700 hover:bg-gray-100 focus:ring-2 focus:ring-indigo-500'}`}> {size} </button> ))} </div> </div>
            )}
            <button onClick={handleAddToCart} className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3.5 rounded-lg font-semibold text-lg transition duration-150 ease-in-out transform hover:scale-105 flex items-center justify-center gap-2 shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-opacity-50">
              <ShoppingBagIconOutline className="h-6 w-6"/> Add to Cart
            </button>
            {addedToCartMessage && ( <div className="mt-2 text-center text-green-600 font-medium flex items-center justify-center gap-1.5 py-2 px-3 bg-green-50 rounded-md border border-green-200"> <CheckCircleIcon className="h-5 w-5"/> {addedToCartMessage} </div> )}
            
            <div className='border border-gray-200 rounded-lg p-6 bg-gray-50'>
              <h4 className="text-xl font-semibold text-gray-800 mb-3">Description</h4>
              <div className="text-gray-600 leading-relaxed prose prose-sm max-w-none">
                  {product.description ? product.description.split('\n').map((line, i) => <p key={i}>{line}</p>) : "No description available."}
              </div>
            </div>
            {product.shipping && product.shipping.length > 0 && product.shipping[0].label && (
              <div className='border border-gray-200 rounded-lg p-6 bg-gray-50'>
                  <h4 className="text-xl font-semibold text-gray-800 mb-3">Shipping Information</h4>
                  <ul className="space-y-1.5 text-sm text-gray-600"> {product.shipping.map((s, i) => ( <li key={i}> <strong className="text-gray-700">{s.label}:</strong> {s.value} </li> ))} </ul>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RATINGS & AI INSIGHTS SECTION */}
      <div className="px-4 sm:px-8 md:px-20 py-10 bg-gray-100">
        <div className="container mx-auto">
            <h3 className="text-3xl font-bold text-gray-800 mb-8 text-center">Ratings & AI Insights</h3>
            <div className="flex flex-col lg:flex-row gap-8 xl:gap-12">
              {/* Rating Summary Block */}
              <div className="lg:w-1/3 bg-white rounded-xl shadow-xl p-6 space-y-6">
                  <p className="text-5xl font-bold text-gray-800 text-center">{product.rating || 0} ★</p>
                  <p className="text-sm text-gray-500 text-center mb-4">{product.reviewsCount || 0} total reviews</p>
                  <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((r) => ( <div key={r} className="flex items-center gap-3"> <span className="text-sm text-gray-600 w-12 text-right">{r} star{r > 1 ? 's' : ''}</span> <div className="w-full h-2.5 bg-gray-200 rounded-full"> <div className="h-2.5 bg-yellow-400 rounded-full" style={{ width: getRatingPercentage(r) }} /> </div> </div> ))}
                  </div>
              </div>
              {/* AI Analysis & Reviews Block */}
              <div className="lg:w-2/3 space-y-6">
                  <div className="bg-white rounded-xl shadow-xl p-6">
                      <h4 className="text-xl font-semibold text-gray-800 mb-4">AI Analysis Tools</h4>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                          {/* Ensure product.id (which is product_no) is passed to AnalysisButton */}
                          <AnalysisButton productId={product.id} analysisType="fraud-detection" label="Fraud Detection" setAnalysisResult={setAnalysisResult} setIsLoadingAnalysis={setIsLoadingAnalysis} />
                          <AnalysisButton productId={product.id} analysisType="counterfeit-detection" label="Counterfeit Detection" setAnalysisResult={setAnalysisResult} setIsLoadingAnalysis={setIsLoadingAnalysis} />
                          <AnalysisButton productId={product.id} analysisType="fake-review-analysis" label="Fake Review Analysis" setAnalysisResult={setAnalysisResult} setIsLoadingAnalysis={setIsLoadingAnalysis} />
                          <AnalysisButton productId={product.id} analysisType="trust-score" label="Trust Score Assignment" setAnalysisResult={setAnalysisResult} setIsLoadingAnalysis={setIsLoadingAnalysis} />
                          <AnalysisButton productId={product.id} analysisType="llm-summary" label="LLM Product Summary" setAnalysisResult={setAnalysisResult} setIsLoadingAnalysis={setIsLoadingAnalysis} />
                      </div>
                  </div>

                  {isLoadingAnalysis && ( <div className="text-center p-6 border rounded-lg bg-yellow-100 my-6 shadow-md"> <p className="text-lg font-semibold text-yellow-700 animate-pulse">Loading AI Analysis...</p> </div> )}
                  {analysisResult && !isLoadingAnalysis && (
                      <div className="p-6 border border-gray-200 rounded-xl bg-green-50 my-6 shadow-xl">
                          <h4 className="text-2xl font-bold text-green-800 mb-3 border-b border-green-200 pb-3"> {analysisResult.title || "AI Analysis Result"} </h4>
                          {analysisResult.summary && ( <p className="text-gray-700 mb-4 leading-relaxed whitespace-pre-line"> {analysisResult.summary} </p> )}
                          {analysisResult.riskScore && ( <p className="text-gray-600 mb-1"> <strong>Risk Score:</strong> <span className="font-semibold">{analysisResult.riskScore}/100</span> </p> )}
                          {analysisResult.authenticityConfidence && ( <p className="text-gray-600 mb-1"> <strong>Authenticity Confidence:</strong> <span className="font-semibold">{analysisResult.authenticityConfidence}%</span> </p> )}
                          {analysisResult.estimatedGenuinePercentage && ( <p className="text-gray-600 mb-1"> <strong>Est. Genuine Reviews:</strong> <span className="font-semibold">{analysisResult.estimatedGenuinePercentage.toFixed(0)}%</span> {analysisResult.suspiciousReviewsInSample !== undefined && ` (${analysisResult.suspiciousReviewsInSample} / ${analysisResult.sampledReviewsAnalyzed} sampled flagged)`} </p> )}
                          {analysisResult.datasetDeclaredFakeReviewPercentage && ( <p className="text-xs text-gray-500 mb-2"> (Dataset declared fake %: {analysisResult.datasetDeclaredFakeReviewPercentage}) </p> )}
                          {analysisResult.trustScore && ( <p className="text-xl font-semibold text-gray-800 my-2"> <strong>Trust Score:</strong> <span className="font-bold text-green-700 text-2xl">{analysisResult.trustScore}/100</span> </p> )}
                          {(analysisResult.details || analysisResult.indicators || analysisResult.patterns) && ( <div className="mt-4"> <strong className="text-sm text-gray-700 block mb-1">Key Points:</strong> <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mt-1"> {analysisResult.details?.map((item, i) => <li key={`detail-${i}`}>{item}</li>)} {analysisResult.indicators?.map((item, i) => <li key={`indicator-${i}`}>{item}</li>)} {analysisResult.patterns?.map((item, i) => <li key={`pattern-${i}`}>{item}</li>)} </ul> </div> )}
                          {analysisResult.breakdown && typeof analysisResult.breakdown === 'object' && ( <div className="mt-4 text-xs text-gray-500 border-t border-gray-200 pt-3"> <strong>Breakdown:</strong> {Object.entries(analysisResult.breakdown).map(([key, value]) => ( <p key={key}><span className="font-medium text-gray-600">{key}:</span> {String(value)}</p> ))} </div> )}
                          {analysisResult.keywords && Array.isArray(analysisResult.keywords) && ( <div className="mt-3 text-xs text-gray-500"> <strong>Keywords:</strong> {analysisResult.keywords.join(', ')} </div> )}
                          {analysisResult.error && ( <p className="mt-4 text-sm text-red-600 p-3 bg-red-50 border border-red-200 rounded-md"> <strong>Note:</strong> {analysisResult.error} </p> )}
                      </div>
                  )}

                  <div className="bg-white rounded-xl shadow-xl p-6">
                      <h4 className="text-xl font-semibold text-gray-800 mb-4">Customer Reviews</h4>
                      {product.reviews_list && product.reviews_list.length > 0 ? (
                      <div className="max-h-[500px] overflow-y-auto space-y-6 pr-2">
                          {product.reviews_list.map((review, i) => (
                          <div key={review.review_id || i} className="border-b border-gray-200 pb-4 last:border-b-0 last:pb-0">
                              <div className="flex justify-between items-start mb-1">
                                  <div>
                                      <span className="font-semibold text-gray-700">{review.name || 'Anonymous'}</span>
                                      {/* Add verified_purchase display if it exists in your new review data from API */}
                                      {/* {review.verified_purchase && <span className="ml-2 text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full">Verified</span>} */}
                                  </div>
                                  <span className="text-yellow-500 font-bold flex items-center">{review.rating || 'N/A'}★</span>
                              </div>
                              <p className="text-xs text-gray-400 mb-2">{review.date ? new Date(review.date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Date not available'}</p>
                              {review.title && <h5 className="text-md font-semibold text-gray-700 mb-1">{review.title}</h5>}
                              <p className="text-sm text-gray-600 leading-relaxed">{review.comment || "No comment."}</p>
                              {review.helpful_vote !== null && review.helpful_vote > 0 && 
                                  <p className="text-xs text-gray-500 mt-2">{review.helpful_vote} people found this helpful</p>
                              }
                          </div>
                          ))}
                      </div>
                      ) : ( <div className="flex flex-col items-center justify-center h-40 text-gray-500"> <UserCircleIcon className="w-16 h-16 text-gray-300 mb-2"/> <span>No reviews yet for this product.</span> </div> )}
                  </div>
              </div>
            </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
