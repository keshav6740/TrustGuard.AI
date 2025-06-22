// src/app/checkout/page.js
'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import Navbar from 'C:/Users/Admin/Downloads/new/trust_guard/src/components/Navbar';
import Footer from 'C:/Users/Admin/Downloads/new/trust_guard/src/components/Footer';
import { useCart } from 'C:/Users/Admin/Downloads/new/trust_guard/src/context/CartContext'; // To clear the cart after "checkout"
import { CheckCircleIcon, ArrowLeftIcon } from '@heroicons/react/24/solid';

export default function CheckoutPage() {
  const { cartItems, getCartTotal, clearCart, isCartLoaded } = useCart();

  // Clear the cart once the user reaches this "confirmation" page
  useEffect(() => {
    if (isCartLoaded && cartItems.length > 0) { // Ensure cart is loaded and not already empty
      clearCart();
    }
  }, [isCartLoaded, clearCart, cartItems.length]); // Depend on cartItems.length to re-trigger if needed

  if (!isCartLoaded) {
      return (
          <div className="min-h-screen flex flex-col bg-gray-100">
              <Navbar />
              <main className="flex-grow container mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
                  <p className="text-xl text-gray-500">Loading checkout...</p>
              </main>
              <Footer />
          </div>
      );
  }

  const orderTotal = getCartTotal(); // Get total before cart is cleared by useEffect, or pass from previous page via state/query if needed

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 py-12 flex flex-col items-center justify-center text-center">
        <CheckCircleIcon className="w-24 h-24 text-green-500 mb-6" />
        <h1 className="text-4xl font-bold text-gray-800 mb-4">Thank You for Your Order!</h1>
        <p className="text-lg text-gray-600 mb-8">
          Your order has been successfully placed (this is a mock confirmation). <br />
          A real implementation would involve payment processing and order fulfillment.
        </p>
        
        {/* Optionally display a brief order summary if you pass data here */}
        {/* For now, we'll just show a generic message */}

        <div className="mt-8 space-y-4 sm:space-y-0 sm:flex sm:space-x-4">
            <Link 
                href="/" 
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg shadow-md transition duration-150 ease-in-out"
            >
                <ArrowLeftIcon className="w-5 h-5"/>
                Continue Shopping
            </Link>
            {/* You could add a link to a mock "Order History" page too */}
        </div>
      </main>
      <Footer />
    </div>
  );
}