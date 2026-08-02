# LogiQ-On Tech — Supply Chain & Logistics Operations Platform

Welcome to the **LogiQ-On Tech** repository. This platform integrates Vendor Management, Master Data Management (MDM), Warehouse Point Operations, and Customer CRM under centralized Platform Owner Governance.

---

## 📌 Branching Rules & Strategy

We enforce a strict git branching model across all 15 development tasks (`KAN-1` to `KAN-15`):

* **`main`**: Production-ready branch. Only merged via Pull Requests after passing UAT and manager approval.
* **`dev`**: Staging integration branch. All daily completed tasks (`KAN-1` to `KAN-15`) merge into `dev` and automatically trigger staging deployment.
* **`feature/KAN-X-<task-name>`**: Daily feature branches created off `dev` for individual daily deliverables.

### Git Branching Workflow
```bash
# 1. Create and switch to daily feature branch
git checkout dev
git pull origin dev
git checkout -b feature/KAN-1-env-and-schema

# 2. Work & Commit daily deliverables
git add .
git commit -m "feat(KAN-1): Complete Day 1 env setup and DB schema"

# 3. Push and create Pull Request to dev
git push origin feature/KAN-1-env-and-schema
```

---

## 🚀 Environment Setup

### Prerequisites
* Node.js v18.0+ or v20.0+
* PostgreSQL 16+ instance
* Git

### Installation & Local Setup
```bash
# 1. Install dependencies
npm install

# 2. Copy environment file
cp .env.example .env

# 3. Run Prisma database migrations & seed
npx prisma migrate dev --name init
npx prisma db seed

# 4. Start local development server
npm run dev
```

The application will run at [http://localhost:3000](http://localhost:3000).

---

## 🛠️ Tech Stack Overview
* **Framework:** Next.js 14 (App Router, TypeScript, React 18/19)
* **Styling:** Tailwind CSS + Radix UI Primitives
* **Database & ORM:** PostgreSQL 16 managed via Prisma ORM
* **Authentication:** NextAuth.js (Session JWT, RBAC & MFA)
* **Validation:** Zod Schema Validation
