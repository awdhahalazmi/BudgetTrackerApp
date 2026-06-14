# 💰 Budget Tracker

A full-stack Personal Budget Tracker with a modern, youthful UI. Track your monthly spending by category, visualize trends, and stay on top of your finances.

## Tech Stack

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS, Recharts
- **Backend**: Node.js / Express
- **Database & Auth**: Supabase (PostgreSQL + Auth)

## Project Structure

```
budget-tracker/
├── frontend/        # Next.js app (port 3000)
├── backend/         # Express API (port 3001)
└── supabase/
    └── migrations/  # SQL schema to run in Supabase
```

## Setup Guide

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and create a new project
2. Go to **SQL Editor** and run the file `supabase/migrations/001_initial_schema.sql`
3. Note your **Project URL** and **anon/public key** from Project Settings → API

### 2. Backend Setup

```bash
cd backend
npm install
cp .env.example .env
# Fill in .env with your Supabase URL and service role key
npm run dev
```

### 3. Frontend Setup

```bash
cd frontend
npm install
cp .env.local.example .env.local
# Fill in .env.local with your Supabase URL and anon key
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Features

- ✅ Signup / Login with Supabase Auth
- ✅ Monthly budget setup wizard with categories
- ✅ Dashboard with spending overview
- ✅ Category cards with progress bars
- ✅ Add / Edit / Delete expenses
- ✅ 3 interactive charts (Pie, Area, Bar)
- ✅ Budget warning & alert notifications
- ✅ Fully responsive (mobile + desktop)
