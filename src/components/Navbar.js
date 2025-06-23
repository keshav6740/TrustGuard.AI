// src/components/Navbar.js
'use client';
import React, { useState, useCallback } from 'react';
import Link from 'next/link';
import { useCart } from '../context/CartContext';
import { ShoppingBagIcon } from '@heroicons/react/24/outline';

// Simple debounce function (if you choose to use it here)
function debounce(func, delay) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => { clearTimeout(timeout); func(...args); };
    clearTimeout(timeout);
    timeout = setTimeout(later, delay);
  };
}

export default function Navbar({ onSearch }) {
  const [inputValue, setInputValue] = useState('');
  const { cartCount } = useCart();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const debouncedSearch = useCallback(debounce((term) => {
    if (onSearch) {
      onSearch(term);
    }
  }, 500), [onSearch]);

  const handleInputChange = (e) => {
    const term = e.target.value;
    setInputValue(term);
    if (onSearch) {
      onSearch(term);
    }
  };

  return (
    <header
      className="shadow px-6 py-4 flex justify-between items-center sticky top-0 z-40 backdrop-blur-md bg-[#f3edb3]"
      style={{ /* ... your existing styles ... */ }}
    >
      {/* Updated Link for TRUSTGUARD AI */}
      <Link href="/" className="text-2xl font-bold tracking-tight text-black transition-all duration-300 hover:shadow-[0_0_15px_rgba(255,255,0,0.8)]">
        TRUSTGUARD AI
      </Link>

      <div className="flex items-center gap-4 w-1/2 md:w-1/3 lg:w-1/2"> {/* Adjusted width for responsiveness */}
        <input
          type="text"
          placeholder="Search products..."
          value={inputValue}
          onChange={handleInputChange}
          className="border border-gray-300 rounded-lg px-4 py-2 text-sm flex-grow bg-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-yellow-400"
        />
        <div className="relative">
          {/* Updated Link for Cart */}
          <Link href="/cart" aria-label="Shopping cart" className="block"> {/* className can be applied directly */}
            <ShoppingBagIcon className="h-7 w-7 text-gray-700 hover:text-black" /> {/* Removed cursor-pointer as Link handles it */}
          </Link>
          {cartCount > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center pointer-events-none">
              {cartCount}
            </span>
          )}
        </div>
      </div>
    </header>
  );
}
