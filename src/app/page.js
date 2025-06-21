// src/app/page.js
'use client';
import Image from 'next/image';
import { ChevronDownIcon } from '@heroicons/react/24/solid';
import { useState, useEffect, useCallback } from 'react'; // Added useCallback
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import Footer from '@/components/Footer';

export default function Home() {
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentSearchTerm, setCurrentSearchTerm] = useState(''); // Renamed for clarity
  const [currentCategory, setCurrentCategory] = useState(''); // Added for category filtering

  // Use useCallback for fetchProducts to avoid re-creating it on every render
  // unless its dependencies (currentSearchTerm, currentCategory) change.
  const fetchProducts = useCallback(async (searchTerm, category) => {
    setIsLoading(true);
    setError(null);
    let apiUrl = '/api/products';
    const queryParams = [];

    if (searchTerm) {
      queryParams.push(`q=${encodeURIComponent(searchTerm)}`);
    }
    if (category) {
      queryParams.push(`category=${encodeURIComponent(category)}`);
    }

    if (queryParams.length > 0) {
      apiUrl += `?${queryParams.join('&')}`;
    }

    try {
      const res = await fetch(apiUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch products: ${res.statusText} (${res.status})`);
      }
      const data = await res.json();
      setProducts(data);
    } catch (err) {
      setError(err.message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, []); // Empty dependency array for useCallback, actual dependencies handled in useEffect

  useEffect(() => {
    // Debounce search or fetch on demand
    const timeoutId = setTimeout(() => {
      fetchProducts(currentSearchTerm, currentCategory);
    }, 500); // Fetch after 500ms of no typing or category change

    return () => clearTimeout(timeoutId); // Cleanup timeout
  }, [currentSearchTerm, currentCategory, fetchProducts]); // Re-fetch when these change

  const handleSearchChange = (term) => {
    setCurrentSearchTerm(term);
    setCurrentCategory(''); // Clear category when performing a general search
  };

  const handleCategoryFilter = (category) => {
    setCurrentCategory(category);
    setCurrentSearchTerm(''); // Clear general search when filtering by category
  };

  return (
    <div className="min-h-screen flex flex-col bg-white text-black">
      <Navbar onSearch={handleSearchChange} />
      <section
        className="relative h-full w-full bg-slate-950 overflow-hidden
    [background-image:radial-gradient(circle_500px_at_50%_200px,#3e3e3e,transparent)] py-16 md:py-24"
      >
        <h1 className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2
    text-[clamp(3rem,10vw,10rem)] font-extrabold tracking-tight text-white z-10
    select-none uppercase drop-shadow-[2px_4px_4px_rgba(0,0,0,0.7)] transition-all duration-500">
          SHOPGUARD
        </h1>
        <Image
          src="/limited_time.gif"
          alt="Sale Sticker Top Right"
          width={250}
          height={100}
          className="absolute top-4 right-4 z-20 rotate-[2deg]
     w-[150px] sm:w-[180px] md:w-[220px] lg:w-[250px]
     transition-transform duration-500
     hover:scale-110"
        />
        <Image
          src="/new.gif"
          alt="Sale Sticker Bottom Left"
          width={250}
          height={100}
          className="absolute bottom-10 left-6 z-20 -rotate-[15deg]  md:bottom-35
     w-[150px] sm:w-[180px] md:w-[220px] lg:w-[250px]
     transition-transform duration-500
     hover:scale-110"
        />
        <div className="relative z-30 flex flex-col items-center justify-center text-center space-y-6 pt-20 md:pt-32">
          <Image
            src="/model.png"
            alt="Model"
            width={320}
            height={340}
            className="rounded-2xl shadow-xl object-contain transition-transform duration-500 hover:scale-110"
          />
          <p className="max-w-2xl text-gray-400 text-sm sm:text-base px-4">
            <strong className="block text-white font-semibold mb-1">
              Detect Fake. Spot Risk. Shop Smart.
            </strong>
            SHOPGUARD AI uses cutting-edge AI to analyze product listings, flag suspicious reviews, and detect potential fraud or counterfeits — empowering buyers with transparency and trust.
          </p>
          <button className="inline-flex items-center gap-2 border border-white text-white px-6 py-2 rounded-full text-sm font-semibold transition-all duration-300 hover:bg-white hover:text-black hover:scale-105">
            explore ⭢
          </button>
        </div>
      </section>

      <main className="flex flex-1">
        <aside
          className="w-64 border rounded-2xl hidden md:block p-6 ml-5 mt-6 h-fit"
          style={{
            backgroundColor: '#ffffff',
            opacity: 0.8,
            backgroundImage: `
      radial-gradient(circle, transparent 20%, #ffffff 20%, #ffffff 80%, transparent 80%, transparent),
      radial-gradient(circle, transparent 20%, #ffffff 20%, #ffffff 80%, transparent 80%, transparent),
      linear-gradient(#fcb9ff 2px, transparent 2px),
      linear-gradient(90deg, #fcb9ff 2px, #ffffff 2px)
    `,
            backgroundPosition: '0 0, 25px 25px, 0 -1px, -1px 0',
            backgroundSize: '50px 50px, 50px 50px, 25px 25px, 25px 25px',
          }}
        >
          <div className="flex items-center justify-between cursor-pointer mb-4" onClick={() => setFiltersOpen(!filtersOpen)}>
            <h2 className="font-semibold text-lg">Category</h2>
            <ChevronDownIcon className={`w-5 h-5 transform transition ${filtersOpen ? 'rotate-180' : ''}`} />
          </div>
          {filtersOpen && (
            <ul className="space-y-3 text-sm text-gray-700">
              {['Electronics', 'Fashion and Apparel', 'Home and Kitchen', 'Health and Beauty', 'Toys and Games', 'Books and Media', 'Sports and Fitness', 'Baby and Maternity', 'Groceries and Food', 'Furniture and Home Decor'].map(category => ( // Added more categories from Item.json
                 <li key={category} className="font-medium border rounded-2xl bg-white p-3 cursor-pointer hover:bg-gray-100" onClick={() => handleCategoryFilter(category)}>
                    + {category}
                 </li>
              ))}
            </ul>
          )}
        </aside>

        <section className="flex-1 p-6">
          {isLoading && <p className="text-center py-10">Loading products...</p>}
          {error && <p className="text-center text-red-500 py-10">Error: {error}</p>}
          {!isLoading && !error && products.length === 0 && <p className="text-center py-10">No products found for "{currentSearchTerm || currentCategory}". Try a different search or category.</p>}

          {!isLoading && !error && products.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {products.map((p, index) => ( // Added index for priority
                <Link href={`/product/${p.id}`} key={p.id}>
                  <div className="border rounded-xl overflow-hidden shadow hover:shadow-lg transition cursor-pointer h-full flex flex-col">
                    <div className="relative w-full h-[300px]">
                      <Image
                        src={p.image}
                        alt={p.name}
                        fill
                        sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                        className="object-cover"
                        priority={index < 3} // Prioritize loading for first 3 images
                      />
                    </div>
                    <div className="p-4 flex flex-col flex-grow">
                      <h3 className="text-sm font-medium uppercase text-gray-500">{p.brand}</h3>
                      <p className="font-semibold text-base flex-grow">{p.name}</p>
                      <div className="flex items-center mt-1 mb-2 gap-1">
                        <span className="text-green-600 font-semibold text-sm bg-green-100 px-2 py-0.5 rounded-md">
                          {p.rating}★
                        </span>
                        <span className="text-xs text-gray-500">| {p.reviews} reviews</span>
                      </div>
                      <p className="text-lg font-bold mt-auto">{p.price}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}

          {/* Basic Pagination - can be enhanced with actual page numbers and logic */}
          {!isLoading && !error && products.length > 0 && (
            <div className="flex justify-center items-center mt-10 gap-2 text-sm">
              <button className="border px-3 py-1 rounded bg-gray-100 hover:bg-gray-200">
                1
              </button>
              <button className="border px-3 py-1 rounded hover:bg-gray-100">
                2
              </button>
              <button className="border px-3 py-1 rounded hover:bg-gray-100">
                Next →
              </button>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  );
}