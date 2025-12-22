# Vercel Deployment Guide

## ✅ Fixed Issues
- Wrapped `useSearchParams()` in Suspense boundaries in:
  - `/auth/signup/page.jsx`
  - `/dashboard/inventory/page.jsx`

## 🔧 Environment Variables Setup

Make sure you have these environment variables set in Vercel:

```env
MONGODB_URI=mongodb+srv://sheri_db:zhyDJUPTR37OCZ2s@cluster0.nzke1cd.mongodb.net/ebay-bms?retryWrites=true&w=majority

NEXTAUTH_SECRET=KnkLD86vVLQ2nJfRMHF2qPq6gdX21AFR+zwXDPCozJU=

NEXTAUTH_URL=https://your-app-name.vercel.app
# ⚠️ IMPORTANT: Update this to your actual Vercel URL after first deployment

APP_NAME=eBay Business Management System

# Email (Optional - for team invitations)
RESEND_API_KEY=re_your_api_key_here
EMAIL_FROM=noreply@yourdomain.com

# These are for development/future features
FAKE_EMAIL_API_KEY=test-email-key
FAKE_PAYMENT_API_KEY=test-payment-key
CURRENCY_EXCHANGE_API_KEY=test-currency-key
```

## 📝 Important Steps After First Deployment

1. **Update NEXTAUTH_URL**
   - After your first deployment, Vercel will give you a URL like: `https://ebay-bms-xyz123.vercel.app`
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Update `NEXTAUTH_URL` to your actual URL
   - Redeploy the app

2. **Test Authentication**
   - Try signing up for a new account
   - Try signing in
   - If you get authentication errors, double-check `NEXTAUTH_URL`

3. **Set Up Custom Domain (Optional)**
   - Go to Vercel Dashboard → Your Project → Settings → Domains
   - Add your custom domain
   - Update `NEXTAUTH_URL` to use your custom domain
   - Update `EMAIL_FROM` if using Resend with your domain

## 🚀 Deployment Commands

If you want to deploy from CLI:

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Deploy to production
vercel --prod
```

## 🐛 Troubleshooting

### Build Fails with "useSearchParams" Error
✅ Already fixed! The components are now wrapped in Suspense boundaries.

### Authentication Not Working
- Check that `NEXTAUTH_URL` matches your deployed URL exactly
- Make sure `NEXTAUTH_SECRET` is set
- Clear browser cookies and try again

### Database Connection Issues
- Verify MongoDB URI is correct
- Check that your IP is whitelisted in MongoDB Atlas (or allow all: `0.0.0.0/0`)
- Test connection using MongoDB Compass

### Email Invitations Not Working
- Sign up for Resend.com (free tier)
- Get your API key
- Update `RESEND_API_KEY` in Vercel
- Redeploy

## 📊 Performance Tips

1. **Enable Edge Runtime for API Routes** (Optional)
   - Add `export const runtime = 'edge'` to your API routes for faster response times
   - Note: Not all Node.js APIs work in edge runtime

2. **Image Optimization**
   - Next.js automatically optimizes images
   - Make sure you're using `next/image` component

3. **Caching**
   - Static pages are automatically cached
   - API routes use default caching strategies

## 🔒 Security Checklist

- ✅ Never commit `.env.local` to git
- ✅ Use strong `NEXTAUTH_SECRET`
- ✅ Use HTTPS only (Vercel does this automatically)
- ✅ Keep MongoDB credentials secure
- ✅ Rotate API keys regularly
- ✅ Enable MongoDB IP whitelist for production

## 📱 Testing Your Deployment

1. Visit your deployed URL
2. Try signing up
3. Create an account
4. Upload some orders (CSV)
5. Check all pages work correctly
6. Test on mobile devices

## 🆘 Need Help?

- [Vercel Documentation](https://vercel.com/docs)
- [Next.js Deployment](https://nextjs.org/docs/deployment)
- [MongoDB Atlas Help](https://www.mongodb.com/docs/atlas/)

---

**Note**: The first deployment might take 2-3 minutes. Subsequent deployments are usually faster.
