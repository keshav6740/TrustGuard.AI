// src/app/layout.js
import { Inter, Fira_Code } from 'next/font/google'; // Import standard Google Fonts
import "./globals.css";
import { CartProvider } from "../context/CartContext";

// Configure the new fonts
const inter = Inter({
  variable: "--font-sans", // You might want to update CSS if it references --font-geist-sans
  subsets: ["latin"],
});

const firaCode = Fira_Code({
  variable: "--font-mono", // You might want to update CSS if it references --font-geist-mono
  subsets: ["latin"],
  weight: ['400', '700'] // Example weights
});

export const metadata = {
  title: "TrustGuard AI",
  description: "AI-Powered Trust & Safety Platform for E-commerce",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      {/* Apply the new font variables */}
      <body
        className={`${inter.variable} ${firaCode.variable} antialiased`}
      >
        <CartProvider>
          {children}
        </CartProvider>
      </body>
    </html>
  );
}
