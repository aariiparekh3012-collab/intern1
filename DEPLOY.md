# Deploying Aurum PMS — Free Tier Guide

Everything below is 100% free. No credit card needed.

---

## STEP 1: Push Code to GitHub

1. Go to **github.com** → Sign in (or create account)
2. Click the **+** icon top-right → **New repository**
3. Name it `aurum-pms` (or whatever you like), keep it **Public** or **Private**
4. Do NOT check "Add README" (you already have code)
5. Click **Create repository**
6. Open a terminal on your computer, `cd` into your project folder:

```bash
cd "C:\Users\AARYA\OneDrive\Desktop\discretionary portfolio management"
git init
git add .
git commit -m "Initial commit - Aurum PMS"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/aurum-pms.git
git push -u origin main
```

Replace `YOUR_USERNAME` with your actual GitHub username.

---

## STEP 2: Set Up Free Database (Neon)

1. Go to **neon.tech** → Sign up with GitHub
2. Click **Create Project**
   - Name: `aurum-pms`
   - Region: pick closest to you
   - Postgres version: 16
3. After creation, you'll see a **Connection string** like:
   ```
   postgresql://username:password@ep-something.region.aws.neon.tech/neondb?sslmode=require
   ```
4. **COPY THIS** — you'll need it in Step 3. Save it somewhere safe.
5. Now run the init SQL. In the Neon dashboard, click **SQL Editor** and paste:

```sql
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE SCHEMA IF NOT EXISTS onboarding;
CREATE SCHEMA IF NOT EXISTS client;
CREATE SCHEMA IF NOT EXISTS reference;
CREATE SCHEMA IF NOT EXISTS portfolio;
CREATE SCHEMA IF NOT EXISTS trading;
CREATE SCHEMA IF NOT EXISTS performance;
CREATE SCHEMA IF NOT EXISTS notifications;
```

Click **Run**. This creates all the schemas your app needs.

---

## STEP 3: Deploy Backend on Render

1. Go to **render.com** → Sign up with GitHub
2. Click **New** → **Web Service**
3. Connect your `aurum-pms` repo
4. Configure:
   - **Name**: `aurum-pms-api`
   - **Root Directory**: `backend`
   - **Runtime**: Python
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: **Free**
5. Click **Advanced** → **Add Environment Variable** and add these:

| Key | Value |
|-----|-------|
| `DATABASE_URL` | The Neon connection string from Step 2 — BUT change `postgresql://` to `postgresql+psycopg://` at the start |
| `JWT_SECRET` | Click "Generate" or type any random 64-character string |
| `PII_ENCRYPTION_KEY` | Generate one by running `python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"` on your computer, paste the result |
| `CORS_ORIGINS` | Leave blank for now (you'll update after Step 4) |
| `ENVIRONMENT` | `production` |

6. Click **Create Web Service**
7. Wait for it to build and deploy (2-4 minutes)
8. You'll get a URL like `https://aurum-pms-api.onrender.com`
9. Test it: visit `https://aurum-pms-api.onrender.com/api/v1/health` — should return JSON

---

## STEP 4: Deploy Frontend on Vercel

1. Go to **vercel.com** → Sign up with GitHub
2. Click **Add New** → **Project**
3. Import your `aurum-pms` repo
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: Click **Edit** → type `frontend`
   - **Build Command**: `npm run build` (should auto-detect)
   - **Output Directory**: `dist` (should auto-detect)
5. Click **Environment Variables** and add:

| Key | Value |
|-----|-------|
| `VITE_API_URL` | `https://aurum-pms-api.onrender.com/api/v1` (your Render URL from Step 3 + `/api/v1`) |

6. Click **Deploy**
7. Wait 1-2 minutes → you'll get a URL like `https://aurum-pms.vercel.app`

---

## STEP 5: Connect Everything

1. Go back to **Render dashboard** → your backend service → **Environment**
2. Update `CORS_ORIGINS` to your Vercel URL:
   ```
   https://aurum-pms.vercel.app
   ```
   (use your actual Vercel URL)
3. Click **Save Changes** — Render will auto-redeploy

---

## STEP 6: Test It

1. Visit your Vercel URL
2. Register a new account
3. Try the onboarding flow
4. Everything should work!

---

## Optional: Custom Domain (Free with Freenom alternatives)

If you want a custom `.com` domain, that costs money. But both Vercel and Render give you free subdomains:
- Frontend: `your-name.vercel.app`
- Backend: `your-name.onrender.com`

These are perfectly shareable links.

---

## Troubleshooting

**Backend won't start?**
- Check Render logs for the error
- Most common: DATABASE_URL format wrong (needs `postgresql+psycopg://` not `postgresql://`)

**Frontend shows network errors?**
- Check that VITE_API_URL is set correctly in Vercel
- Check that CORS_ORIGINS in Render matches your Vercel URL exactly

**Site is slow on first load?**
- Normal on free tier — Render spins down after 15min of no traffic
- First request after sleep takes ~30 seconds, then it's fast

**Database connection error?**
- Make sure you added `?sslmode=require` to the Neon URL
- Make sure schemas were created (Step 2, SQL part)
