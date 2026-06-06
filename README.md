<div align="center">
  <h1>🏛️ LicitacIA</h1>
  <p><strong>AI-Powered Public Procurement & Tender Alert System</strong></p>

  [![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)](https://nextjs.org/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
  [![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)](https://tailwindcss.com/)
  [![Prisma](https://img.shields.io/badge/Prisma-6.0-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
</div>

<br />

## 📖 Overview

**LicitacIA** is a comprehensive, automated platform designed to monitor, aggregate, and analyze public procurement opportunities (tenders) from official government sources (such as BOE, DOUE, and regional platforms). 

Built with modern web technologies, it leverages Artificial Intelligence to classify, summarize, and match complex tender documents with user profiles, sending real-time, multi-channel alerts (Email, Telegram, WhatsApp) based on customized subscription plans.

This project was inspired by advanced workflow automation patterns (like n8n templates) but rebuilt from the ground up as a scalable, serverless full-stack application using **Next.js 15**.

## ✨ Key Features

- 🤖 **AI-Driven Analysis**: Integrates with OpenAI/Z-AI to intelligently parse, summarize, and tag complex legal tender documents, matching them against user keywords and sectors.
- 🕷️ **Automated Data Extraction**: Custom scrapers and XML/ZIP parsers to continuously ingest data from official government procurement portals.
- 🔔 **Multi-Channel Alert System**: Instant notifications delivered via Email, Telegram, and WhatsApp, customized by user preferences.
- 💳 **SaaS Subscription Model**: Built-in tiered access (Free, Premium, Enterprise) with payment gateway integration (Stripe/PayPal).
- 📊 **Real-Time Dashboard**: Interactive UI providing detailed metrics, advanced filtering, and tracking of relevant tenders.
- ⚡ **Modern Architecture**: Fully typed Next.js App Router backend/frontend with server actions, protected routes, and a Prisma ORM database layer.

## 🛠️ Technology Stack

### Frontend
- **Framework**: [Next.js 15](https://nextjs.org/) (React 19)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/) & [shadcn/ui](https://ui.shadcn.com/)
- **State Management**: [Zustand](https://zustand-demo.pmnd.rs/) & [React Query](https://tanstack.com/query/latest)
- **Components**: Framer Motion (Animations), Recharts (Data Visualization)

### Backend
- **Architecture**: Next.js API Routes (Serverless)
- **Database**: SQLite (Development) / PostgreSQL (Production ready) via **[Prisma ORM](https://www.prisma.io/)**
- **Authentication**: [NextAuth.js](https://next-auth.js.org/) (Role-based access control)
- **Real-time**: Socket.io

### AI & Integrations
- **AI Models**: OpenAI API, Groq SDK, Z-AI
- **Payments**: Stripe / PayPal (via API endpoints)
- **Scraping**: Cheerio, Fast-XML-Parser, Adm-Zip

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18.x or higher
- **npm** or **yarn**
- **API Keys**: OpenAI (for AI analysis), Telegram Bot Token (for alerts), Stripe (for payments)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/yourusername/licitacia.git
   cd licitacia
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment Setup:**
   Create a `.env` file in the root directory and configure your keys:
   ```env
   # Database
   DATABASE_URL="file:./prisma/dev.db"

   # Authentication
   NEXTAUTH_URL="http://localhost:3000"
   NEXTAUTH_SECRET="your-super-secret-key"

   # AI APIs
   OPENAI_API_KEY="sk-..."
   ZAI_API_KEY="..."

   # External Services (Optional for dev)
   STRIPE_SECRET_KEY="sk_test_..."
   TELEGRAM_BOT_TOKEN="..."
   ```

4. **Initialize the Database:**
   ```bash
   npm run db:push
   npm run db:generate
   ```

5. **Run the Development Server:**
   ```bash
   npm run dev
   ```
   *The application will be available at [http://localhost:3000](http://localhost:3000).*

## 📂 Project Structure

```text
src/
├── app/                  # Next.js App Router (Pages & API Endpoints)
│   ├── api/              # Serverless API routes (auth, cron, scrape, webhooks)
│   ├── dashboard/        # Protected user dashboard
│   └── admin/            # Admin control panel
├── components/           # Reusable UI components (shadcn/ui, layouts)
├── hooks/                # Custom React hooks
├── lib/                  # Core logic, DB clients, utility functions, scrapers
├── scripts/              # Standalone utility scripts (cron jobs, db seeding)
└── services/             # External service integrations
```

## 📸 Screenshots

*(Recommend adding 2-3 screenshots of your dashboard, tender analysis view, and dark mode interface here to make the repository visually appealing to recruiters.)*

<details>
<summary>Click to view placeholders</summary>
<br>
<!-- Add your image tags here like: <img src="./public/screenshots/dashboard.png" width="800" alt="Dashboard"> -->
> 🖼️ *Dashboard View*
<br>
> 🖼️ *Tender Detail & AI Summary*
</details>

## 💡 Future Roadmap

- [ ] Migration of local SQLite DB to PostgreSQL for production deployment.
- [ ] Integration of CI/CD pipelines (GitHub Actions) for automated testing and deployment.
- [ ] Full coverage of unit and end-to-end testing (Jest / Playwright).
- [ ] Expanding scraping sources to international platforms (TED - Tenders Electronic Daily).

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/yourusername/licitacia/issues).

## 📝 License

This project is [MIT](https://choosealicense.com/licenses/mit/) licensed.

---
*Crafted with precision for optimal public procurement tracking.*
