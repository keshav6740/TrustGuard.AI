// src/app/product/[id]/page.js
'use client';

import { useParams } from 'next/navigation';
import Image from 'next/image';
import Navbar from '@/components/Navbar';
import { useState, useEffect } from 'react'; // Added useEffect
import Footer from '@/components/Footer';

// AI Analysis Button Component (ensure this is defined or imported if it's separate)
const AnalysisButton = ({ productId, analysisType, label, setAnalysisResult, setIsLoadingAnalysis }) => {
  const handleClick = async () => {
    setIsLoadingAnalysis(true);
    setAnalysisResult(null); // Clear previous results
    try {
      const res = await fetch(`/api/analyze/${analysisType}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ productId }), // productId here is the Prisma integer ID
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.message || `Analysis failed: ${res.statusText}`);
      }
      const data = await res.json();
      setAnalysisResult(data.data);
    } catch (err) {
      setAnalysisResult({ title: "Error", summary: err.message });
      console.error(err);
    } finally {
      setIsLoadingAnalysis(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold hover:bg-gray-800 transition"
    >
      {label}
    </button>
  );
};


export default function ProductPage() {
  const params = useParams(); // Get the full params object
  const id = params?.id; // Extract id, params can be null initially on server
  
  const [product, setProduct] = useState(null); // State for fetched product
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [mainImage, setMainImage] = useState('');
  const [selectedSize, setSelectedSize] = useState('');

  const [analysisResult, setAnalysisResult] = useState(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(false);

  useEffect(() => {
    if (id) { // Only fetch if id is available
      const fetchProductDetails = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const res = await fetch(`/api/products/${id}`); // Fetch from your API
          if (!res.ok) {
            if (res.status === 404) {
                throw new Error('Product not found');
            }
            throw new Error(`Failed to fetch product: ${res.statusText} (${res.status})`);
          }
          const data = await res.json();
          setProduct(data);
          setMainImage(data.detailImage || data.image || ''); // Use fetched image
        } catch (err) {
          setError(err.message);
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchProductDetails();
    } else if (params && !id) { // If params exist but no id, could be an issue or still loading params
        setIsLoading(false);
        setError("Product ID not found in URL.");
    }
  }, [id, params]); // Re-run effect if 'id' or 'params' changes

  const getRatingPercentage = (star) => {
    if (!product || !product.reviews_list || product.reviews_list.length === 0) return '0%';
    const total = product.reviews_list.length;
    const count = product.reviews_list.filter(r => r.rating === star).length;
    return total ? `${(count / total) * 100}%` : '0%';
  };

  if (isLoading) return <div className="text-center py-10 min-h-screen">Loading product details...</div>;
  if (error) return <div className="text-center py-10 min-h-screen text-red-500">Error: {error}</div>;
  if (!product) return <div className="text-center py-10 min-h-screen">Product not found or could not be loaded.</div>;

  // Now, the 'product' variable will hold the data fetched from your API
  return (
    <div className="min-h-screen bg-white text-black">
      <Navbar />

      {/* MAIN SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 px-8 md:px-20 py-10">
        {/* IMAGE BLOCK */}
        <div className="relative w-full h-[500px] md:h-[600px]">
          <div className="w-full h-full relative rounded-xl shadow-md overflow-hidden">
            <Image
              src={mainImage || product.image} // Fallback to product.image if mainImage isn't set
              alt={product.name}
              fill
              className="object-cover transition-transform hover:scale-105"
              priority
              sizes="(max-width: 768px) 100vw, 50vw"
               onError={() => setMainImage('https://dummyimage.com/600x600/e0e0e0/757575.png&text=Image+Load+Error')}
            />
          </div>

          {product.thumbnails && product.thumbnails.length > 0 && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex gap-3 bg-white/80 backdrop-blur-sm rounded-xl px-3 py-2 shadow-lg">
              {/* Main image as a thumbnail option */}
              <Image
                  src={product.image}
                  alt={`${product.name} main thumbnail`}
                  width={70}
                  height={70}
                  onClick={() => setMainImage(product.image)}
                  className={`rounded-lg border cursor-pointer object-cover transition-transform hover:scale-105 ${mainImage === product.image ? 'ring-2 ring-black' : 'border-gray-300'}`}
              />
              {product.thumbnails.map((src, i) => (
                <Image
                  key={i}
                  src={src}
                  alt={`Thumb ${i + 1}`}
                  width={70}
                  height={70}
                  onClick={() => setMainImage(src)}
                  className={`rounded-lg border cursor-pointer object-cover transition-transform hover:scale-105 ${mainImage === src ? 'ring-2 ring-black' : 'border-gray-300'}`}
                />
              ))}
            </div>
          )}
        </div>

        {/* DETAILS */}
        <div className="flex flex-col gap-6">
          <div>
            <h2 className="text-3xl font-bold">{product.name}</h2>
            <p className="text-lg text-gray-500 mt-2 ml-1">{product.brand}</p>
          </div>
          <p className="text-4xl font-semibold">{product.price}</p>
          {product.sizes && product.sizes.length > 0 && (
            <div>
              <p className="font-medium mb-2">Size:</p>
              <div className="flex gap-3">
                {product.sizes.map((size) => (
                  <button
                    key={size}
                    onClick={() => setSelectedSize(size)}
                    className={`border px-4 py-1.5 rounded-md transition text-sm font-semibold
                    ${selectedSize === size
                        ? 'bg-black text-white'
                        : 'hover:bg-gray-800 hover:text-white'
                      }`}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
          )}

          <button className=" bg-black hover:bg-gray-900 text-white py-3 rounded-lg font-semibold transition hover:scale-105">
            Add to Cart
          </button>

          <div className='border rounded-2xl p-4 bg-pink-50'>
            <h4 className="text-lg font-semibold mb-2">Description & Fit</h4>
            <p className="text-gray-700 leading-relaxed">{product.description}</p>
          </div>

          {product.shipping && product.shipping.length > 0 && (
            <div className='border rounded-2xl p-4 bg-blue-50'>
                <h4 className="text-lg font-semibold mb-2">Shipping</h4>
                <ul className="space-y-1 text-sm text-gray-700">
                {product.shipping.map((s, i) => (
                    <li key={i}>
                    <strong>{s.label}:</strong> {s.value}
                    </li>
                ))}
                </ul>
            </div>
          )}
        </div>
      </div>

      {/* RATINGS & REVIEWS */}
      <div className="px-8 md:px-20 py-10 bg-gray-50 mb-5">
        <h3 className="text-2xl font-bold mb-6">Ratings & Reviews</h3>
        <div className="flex flex-col lg:flex-row gap-12">
          <div className="lg:w-1/3 border rounded-2xl p-6 bg-white shadow-md space-y-6">
            <p className="text-5xl font-bold">{product.rating || 0}★</p>
            <p className="text-sm text-gray-500 mb-4">{product.reviewsCount || 0} total reviews</p>
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((r) => (
                <div key={r} className="flex items-center gap-2">
                  <span className="text-sm w-5">{r}</span>
                  <div className="w-full h-2 bg-gray-200 rounded">
                    <div
                      className="h-2 bg-yellow-400 rounded"
                      style={{ width: getRatingPercentage(r) }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="lg:w-2/3">
            <div className="flex flex-wrap gap-3 mb-4">
              <AnalysisButton productId={product.id} analysisType="fraud-detection" label="Fraud Detection" setAnalysisResult={setAnalysisResult} setIsLoadingAnalysis={setIsLoadingAnalysis} />
              <AnalysisButton productId={product.id} analysisType="counterfeit-detection" label="Counterfeit Detection" setAnalysisResult={setAnalysisResult} setIsLoadingAnalysis={setIsLoadingAnalysis} />
              <AnalysisButton productId={product.id} analysisType="fake-review-analysis" label="Fake Review Analysis" setAnalysisResult={setAnalysisResult} setIsLoadingAnalysis={setIsLoadingAnalysis} />
              <AnalysisButton productId={product.id} analysisType="trust-score" label="Trust Score Assignment" setAnalysisResult={setAnalysisResult} setIsLoadingAnalysis={setIsLoadingAnalysis} />
              <AnalysisButton productId={product.id} analysisType="llm-summary" label="LLM-generated Summary" setAnalysisResult={setAnalysisResult} setIsLoadingAnalysis={setIsLoadingAnalysis} />
            </div>

            {isLoadingAnalysis && <div className="text-center p-4 border rounded-lg bg-yellow-50 my-4">Loading AI Analysis...</div>}
            {analysisResult && (
              <div className="p-4 border rounded-lg bg-green-50 my-4 shadow">
                <h4 className="text-xl font-semibold mb-2 text-green-700">{analysisResult.title || "AI Analysis Result"}</h4>
                <p className="text-gray-700 mb-2 whitespace-pre-line">{analysisResult.summary}</p>
                {/* ... other analysis result rendering ... */}
                {analysisResult.details && Array.isArray(analysisResult.details) && (
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    {analysisResult.details.map((detail, i) => <li key={i}>{detail}</li>)}
                  </ul>
                )}
                 {analysisResult.indicators && Array.isArray(analysisResult.indicators) && (
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    {analysisResult.indicators.map((indicator, i) => <li key={i}>{indicator}</li>)}
                  </ul>
                )}
                {analysisResult.patterns && Array.isArray(analysisResult.patterns) && (
                  <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                    {analysisResult.patterns.map((pattern, i) => <li key={i}>{pattern}</li>)}
                  </ul>
                )}
                 {typeof analysisResult.riskScore !== 'undefined' && <p className="text-sm">Risk Score: <span className="font-bold">{analysisResult.riskScore}/100</span></p>}
                 {typeof analysisResult.authenticityConfidence !== 'undefined' && <p className="text-sm">Authenticity Confidence: <span className="font-bold">{analysisResult.authenticityConfidence}%</span></p>}
                 {typeof analysisResult.genuinePercentage !== 'undefined' && <p className="text-sm">Genuine Reviews: <span className="font-bold">{analysisResult.genuinePercentage.toFixed(1)}%</span> ({analysisResult.suspiciousReviewCount} suspicious)</p>}
                 {typeof analysisResult.trustScore !== 'undefined' && <p className="text-lg">Trust Score: <span className="font-bold text-green-600">{analysisResult.trustScore}/100</span></p>}
                 {analysisResult.breakdown && typeof analysisResult.breakdown === 'object' && (
                    <div className="mt-2 text-xs">
                        <strong>Breakdown:</strong>
                        {Object.entries(analysisResult.breakdown).map(([key, value]) => (
                            <p key={key}>{key}: {String(value)}</p>
                        ))}
                    </div>
                 )}
                 {analysisResult.keywords && Array.isArray(analysisResult.keywords) && (
                    <div className="mt-2 text-xs">
                        <strong>Keywords:</strong> {analysisResult.keywords.join(', ')}
                    </div>
                 )}
              </div>
            )}

            {product.reviews_list && product.reviews_list.length > 0 ? (
              <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4 rounded-lg border p-4 bg-white shadow-md mt-3">
                {product.reviews_list.map((review, i) => (
                  <div key={i} className="border-b last:border-0 pb-3 mb-3">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">{review.name}</span>
                      <span className="text-yellow-500 font-semibold">{review.rating}★</span>
                    </div>
                    {review.title && <p className="text-md font-semibold mt-1">{review.title}</p>}
                    <p className="text-sm text-gray-700 mt-2">{review.comment}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(review.date).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex items-center justify-center h-40 border rounded-lg bg-white shadow-inner mt-3">
                <p className="text-gray-500 text-sm italic">No reviews yet for this product.</p>
              </div>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}