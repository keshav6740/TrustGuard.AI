// src/context/CartContext.js
'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext(undefined); // Initialize with undefined

export const useCart = () => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState([]);
  const [isCartLoaded, setIsCartLoaded] = useState(false); // To track if cart is loaded from localStorage

  // Load cart from localStorage on initial client-side render
  useEffect(() => {
    try {
      const storedCart = localStorage.getItem('shoppingCart');
      if (storedCart) {
        setCartItems(JSON.parse(storedCart));
      }
    } catch (error) {
      console.error("Failed to parse cart from localStorage:", error);
      localStorage.removeItem('shoppingCart'); // Clear corrupted data
    }
    setIsCartLoaded(true); // Mark cart as loaded
  }, []);

  // Save cart to localStorage whenever it changes, but only after initial load
  useEffect(() => {
    if (isCartLoaded) { // Only save after initial load to prevent overwriting with empty array
        try {
            localStorage.setItem('shoppingCart', JSON.stringify(cartItems));
        } catch (error) {
            console.error("Failed to save cart to localStorage:", error);
        }
    }
  }, [cartItems, isCartLoaded]);

  const addToCart = (product) => {
    if (!product || typeof product.id === 'undefined' || typeof product.price_numeric === 'undefined') {
        console.error("Attempted to add invalid product to cart:", product);
        return;
    }
    setCartItems(prevItems => {
      const existingItem = prevItems.find(item => item.id === product.id);
      if (existingItem) {
        return prevItems.map(item =>
          item.id === product.id ? { ...item, quantity: (item.quantity || 0) + 1 } : item
        );
      } else {
        return [...prevItems, { ...product, quantity: 1 }];
      }
    });
  };

  const removeFromCart = (productId) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, quantity) => {
    const newQuantity = Math.max(0, quantity); // Ensure quantity is not negative
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      ).filter(item => item.quantity > 0) // Remove item if quantity becomes 0
    );
  };

  const clearCart = () => {
    setCartItems([]);
    // No need to explicitly remove from localStorage here, 
    // the useEffect for cartItems will update it to an empty array.
    // However, if you want to be explicit: localStorage.removeItem('shoppingCart');
  };

  const getCartTotal = () => {
    if (!isCartLoaded) return 0; // Don't calculate total until cart is loaded
    return cartItems.reduce((total, item) => {
        const price = parseFloat(item.price_numeric); // Ensure price is a number
        const quantity = parseInt(item.quantity, 10) || 0; // Ensure quantity is a number
        if (!isNaN(price) && !isNaN(quantity)) {
            return total + (price * quantity);
        }
        return total;
    }, 0);
  };
  
  const cartCount = isCartLoaded ? cartItems.reduce((count, item) => count + (item.quantity || 0), 0) : 0;

  const value = {
    cartItems,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart,
    getCartTotal,
    cartCount,
    isCartLoaded, // Optionally expose this if needed by components
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};