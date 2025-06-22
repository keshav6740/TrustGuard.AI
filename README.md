# TrustGuard.AI - AI-Powered Trust & Safety Platform for E-commerce

## 🚀 HackOn 5.0 with Amazon - Team BugSlayer

**Team Members:** Kartavya Antani, Pranamya G Kulal, Varshith Jhalla, Keshav
**Theme:** AI-Powered Trust & Safety Platform
**Project Name (as per slides):** TrustGuard.AI – AI-Powered Trust & Safety Platform for E-commerce

---

## 📖 Project Overview

TrustGuard.AI is a conceptual platform designed to enhance trust and safety within e-commerce environments. This Next.js application serves as a Minimum Viable Product (MVP) / Proof of Concept for the buyer-facing interface, demonstrating how AI-driven insights can empower consumers to make safer purchasing decisions.

The platform aims to detect and flag fraudulent activities, counterfeit products, and fake reviews by leveraging (conceptually) advanced AI models including LLMs, Computer Vision, and Graph Neural Networks. This MVP simulates the presentation of these insights to the end-user on a familiar e-commerce product listing and detail page experience.

---

## ✨ Core Features (MVP)

*   **Product Listing & Detail Pages:** A browseable e-commerce interface.
*   **Search & Category Filtering:** Users can search for products and filter by category.
*   **AI-Powered Insight Simulation:** Buttons on the product detail page simulate various AI analyses:
    *   **Fraud Detection:** Provides a heuristic-based fraud potential score.
    *   **Counterfeit Detection:** Offers an estimated authenticity confidence.
    *   **Fake Review Analysis:** Analyzes review characteristics to flag potentially suspicious reviews using heuristics.
    *   **Trust Score Assignment:** Calculates an overall trust score for a product based on multiple data points.
    *   **LLM-Generated Summary:** **(Live API Call)** Connects to the Together AI API (using Mistral/Mixtral model) to generate a concise product summary based on its details and review snippets.
*   **Client-Side Shopping Cart:** Users can add products to a cart, view the cart, and manage quantities. (Data stored in `localStorage`).
*   **Database Backend:** Utilizes Supabase (PostgreSQL) as the database, managed with Prisma ORM.
*   **Responsive UI:** Basic responsiveness for different screen sizes.

---

## 🛠️ Tech Stack

*   **Frontend:** Next.js (React Framework - v14 Stable)
*   **Styling:** Tailwind CSS
*   **Backend/API:** Next.js API Routes
*   **Database:** Supabase (PostgreSQL)
*   **ORM:** Prisma
*   **External AI API:** Together AI (for LLM summaries)
*   **Icons:** Heroicons

---

## ⚙️ Setup and Installation

1.  **Prerequisites:**
    *   Node.js (v18.x or later recommended)
    *   npm or yarn
    *   A Supabase account and a PostgreSQL database instance.
    *   A Together AI API Key (for LLM summary feature).

2.  **Clone the Repository:**
    ```bash
    git clone https://github.com/keshav6740/TrustGuard.AI.git 
    # Replace with your actual repository URL
    cd TrustGuard.AI 
    # Or your project folder name
    ```

3.  **Install Dependencies:**
    ```bash
    npm install
    # or
    # yarn install
    ```

4.  **Set Up Environment Variables:**
    *   Create a `.env` file in the project root by copying `.env.example`.
        ```bash
        cp .env.example .env
        ```
    *   Update the `.env` file with your actual credentials:
        *   `DATABASE_URL`: Your Supabase PostgreSQL connection string (for **runtime/seeding**, use the **Pooler URL** - port 6543, with `?pgbouncer=true`).
        *   `DIRECT_URL`: Your Supabase PostgreSQL connection string (for **migrations**, use the **Direct URL** - port 5432, no `pgbouncer`).
        *   `TOGETHER_API_KEY`: Your API key from [Together AI](https://api.together.ai/).

5.  **Database Setup (using Prisma):**
    *   Ensure your `DATABASE_URL` in `.env` is temporarily set to the `DIRECT_URL` value.
    *   Apply database migrations to set up the schema:
        ```bash
        npx prisma migrate dev --name init_schema 
        # Or the name of your latest migration if one already exists for the current schema
        ```
        *(If you have an existing database that already matches `prisma/schema.prisma`, you might have used `npx prisma db pull` and `npx prisma migrate resolve --applied "baseline_migration_name"` as per earlier steps. New users cloning would typically just run `migrate dev`)*
    *   **Important:** After migrations, switch `DATABASE_URL` in `.env` back to the **POOLER URL** for running the application.

6.  **Seed the Database (If using JSON seed files - This step is NO LONGER APPLICABLE if your Supabase DB is pre-populated and you deleted seed.mjs):**
    *(If your Supabase database is already populated with the required data matching the schema, you can skip this step. The project was transitioned to fetch directly from a pre-populated DB.)*
    ```bash
    # npx prisma db seed 
    # This command is only needed if you have a prisma/seed.mjs file and corresponding data files.
    ```

7.  **Run Prisma Generate (Good practice after setup/installs):**
    ```bash
    npx prisma generate
    ```

8.  **Run the Development Server:**
    ```bash
    npm run dev
    ```
    Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

---

## 🔗 API Endpoints (Brief Overview)

*   `GET /api/products`: Fetches a list of all products. Supports `q` (search) and `category` query parameters.
*   `GET /api/products/[id]`: Fetches details for a single product by its `product_no`.
*   `POST /api/analyze/[analysisType]`: Accepts a `productId` (which is `product_no`) and an `analysisType` to perform simulated AI analysis.
    *   `analysisType` can be: `fraud-detection`, `counterfeit-detection`, `fake-review-analysis`, `trust-score`, `llm-summary`.

---

## 💡 Future Improvements (Conceptual)

*   **Real AI Model Integration:** Replace heuristic-based analyses with actual trained ML models for fraud, counterfeit, and fake review detection (e.g., using services like AWS SageMaker, Rekognition, Comprehend, or custom models).
*   **Advanced Graph Analysis:** Implement GNNs (e.g., with Amazon Neptune) for detecting review collusion rings.
*   **Real-time Monitoring & Alerting System:** For proactive trust and safety actions.
*   **Admin Dashboard:** For moderators to review flagged content and manage the platform.
*   **User Authentication & Profiles:** To personalize experiences and track user-specific trust metrics.
*   **Full Checkout Process:** Integration with payment gateways.
*   **More Sophisticated Trust Score Engine:** Incorporating more data points and weighted factors.
*   **Enhanced UI/UX:** Further polish on visual design and user interactions.

---

## 📝 Notes & Known Issues (Example)

*   **Image Hotlinking:** Some product images sourced directly from e-commerce sites (e.g., Amazon) may fail to load due to hotlinking protection. For the demo, ensure critical product images use publicly accessible URLs or the provided fallback mechanism. The `next.config.mjs` needs to whitelist all image hostnames.
*   **AI Analysis Time:** The "LLM Product Summary" makes a live API call and may take a few seconds to respond. Other AI analyses are currently heuristic-based for speed in this MVP.

---
