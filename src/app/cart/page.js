// src/app/cart/page.js
'use client';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import Navbar from 'C:/Users/Admin/Downloads/new/trust_guard/src/components/Navbar';
import Footer from 'C:/Users/Admin/Downloads/new/trust_guard/src/components/Footer';
import { useCart } from 'C:/Users/Admin/Downloads/new/trust_guard/src/context/CartContext';
import { TrashIcon, PlusCircleIcon, MinusCircleIcon, ShoppingCartIcon } from '@heroicons/react/24/outline';
import { useRouter } from 'next/navigation'; // <-- IMPORT useRouter

export default function CartPage() {
  const { cartItems, removeFromCart, updateQuantity, getCartTotal, clearCart, isCartLoaded } = useCart();
  const router = useRouter(); // <-- INITIALIZE useRouter

  // ... (empty cart logic as before) ...
  if (!isCartLoaded) { /* ... loading state ... */ }
  if (cartItems.length === 0) { /* ... empty cart state ... */ }


  const handleProceedToCheckout = () => {
    // In a real app, you might save the cart to DB here or pass cart ID
    router.push('/checkout'); 
  };

  const totalAmount = getCartTotal();

  return (
    <div className="min-h-screen flex flex-col bg-gray-100">
      <Navbar />
      <main className="flex-grow container mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* ... (Cart Page Title and Items List as before) ... */}
        <h1 className="text-4xl font-bold text-gray-800 mb-10 text-center">Your Shopping Cart</h1>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white rounded-xl shadow-xl p-6 space-y-6">
            {cartItems.map(item => (
              // ... (item rendering as before) ...
              <div 
                key={item.id} 
                className="flex flex-col md:flex-row items-center justify-between border-b border-gray-200 pb-6 last:border-b-0 last:pb-0"
              >
                <div className="flex items-center w-full md:w-auto mb-4 md:mb-0">
                  <div className="relative w-24 h-24 mr-5 flex-shrink-0">
                    <Image 
                      src={item.image || 'https://dummyimage.com/100x100/eee/aaa.png&text=No+Img'} 
                      alt={item.name} 
                      fill
                      className="rounded-md object-cover"
                      sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                    />
                  </div>
                  <div className="flex-grow">
                    <Link href={`/product/${item.id}`} className="text-lg font-semibold text-gray-800 hover:text-indigo-600 transition duration-150">
                      {item.name}
                    </Link>
                    <p className="text-sm text-gray-500">
                      Unit Price: ₹{parseFloat(item.price_numeric).toLocaleString('en-IN')}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 sm:gap-6 w-full md:w-auto justify-between md:justify-end">
                  <div className="flex items-center">
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity - 1)}
                      className="text-gray-500 hover:text-indigo-600 p-1 rounded-full transition duration-150"
                      aria-label="Decrease quantity"
                      disabled={item.quantity <= 1}
                    >
                      <MinusCircleIcon className="h-7 w-7"/>
                    </button>
                    <span className="px-3 text-lg font-medium text-gray-700 w-10 text-center">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.id, item.quantity + 1)}
                      className="text-gray-500 hover:text-indigo-600 p-1 rounded-full transition duration-150"
                      aria-label="Increase quantity"
                    >
                      <PlusCircleIcon className="h-7 w-7"/>
                    </button>
                  </div>
                  <p className="text-lg font-semibold text-gray-800 w-28 text-right">
                    ₹{(parseFloat(item.price_numeric) * item.quantity).toLocaleString('en-IN')}
                  </p>
                  <button onClick={() => removeFromCart(item.id)} className="text-red-500 hover:text-red-700 p-1 transition duration-150">
                    <TrashIcon className="h-6 w-6"/>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div className="lg:col-span-1 bg-white rounded-xl shadow-xl p-6 h-fit sticky top-28">
            <h2 className="text-2xl font-semibold text-gray-800 border-b border-gray-200 pb-4 mb-6">Order Summary</h2>
            {/* ... (subtotal, shipping in summary as before) ... */}
            <div className="space-y-3 mb-6">
              <div className="flex justify-between text-gray-600">
                <span>Subtotal</span>
                <span>₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <div className="flex justify-between text-gray-600">
                <span>Shipping</span>
                <span className="text-green-600 font-medium">FREE</span>
              </div>
            </div>
            <div className="border-t border-gray-200 pt-4">
              <div className="flex justify-between text-xl font-bold text-gray-800 mb-6">
                <span>Total Amount</span>
                <span>₹{totalAmount.toLocaleString('en-IN')}</span>
              </div>
              <button 
                className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                onClick={handleProceedToCheckout} // <-- UPDATED onClick
              >
                Place Order
              </button>
              <button 
                onClick={clearCart}
                className="w-full mt-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2 px-4 rounded-lg transition duration-150"
              >
                Clear Cart
              </button>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}