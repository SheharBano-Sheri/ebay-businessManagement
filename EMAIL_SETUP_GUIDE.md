# Email Setup Guide for Team Invitations

Team member invitations now send real emails! Choose the **easiest option** below.

---

## ⚡ OPTION 1: Resend (RECOMMENDED - 2 Minutes Setup!)

### Why Resend?
- ✅ **No complicated Gmail setup** - Just one API key
- ✅ **Free tier** - 100 emails/day (3,000/month)
- ✅ **Works instantly** - No SMTP configuration needed
- ✅ **Professional** - Perfect for development and production

### Setup Steps:

1. **Sign up at [Resend.com](https://resend.com)** (Free account)
2. **Get your API key** from the dashboard
3. **Update `.env.local`**:
   ```env
   RESEND_API_KEY=re_your_api_key_here
   ```
4. **Restart your dev server** - Done! ✅

**Emails will be sent from:** `onboarding@resend.dev` (Resend's default test domain)

### Want to Use Your Own Domain? (Optional)
To send from `noreply@yourcompany.com`:
1. Go to Resend Dashboard → Domains
2. Add and verify your domain (add DNS records)
3. Update `.env.local`:
   ```env
   RESEND_API_KEY=re_your_api_key_here
   EMAIL_FROM=noreply@yourcompany.com
   ```

That's it! Now click "Invite Member" and emails will send automatically.

---

## Option 2: Gmail (More Complex - 15 Minutes Setup)

### Step 1: Enable 2-Factor Authentication
1. Go to [Google Account Security](https://myaccount.google.com/security)
2. Enable **2-Step Verification**

### Step 2: Create App Password
1. Visit [App Passwords](https://myaccount.google.com/apppasswords)
2. Select **Mail** and **Windows Computer** (or Other)
3. Click **Generate**
4. Copy the 16-character password (format: `xxxx xxxx xxxx xxxx`)

### Step 3: Update .env.local
```env
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=youremail@gmail.com
EMAIL_PASSWORD=xxxx xxxx xxxx xxxx
APP_NAME=eBay Business Management System
```

---

## Option 3: Outlook/Hotmail

```env
EMAIL_HOST=smtp-mail.outlook.com
EMAIL_PORT=587
EMAIL_USER=youremail@outlook.com
EMAIL_PASSWORD=your-outlook-password
APP_NAME=eBay Business Management System
```

---

## Option 4: SendGrid (Production Alternative)

### Step 1: Create SendGrid Account
1. Sign up at [SendGrid](https://sendgrid.com)
2. Verify your sender email
3. Create an API Key in Settings > API Keys

### Step 2: Update .env.local
```env
EMAIL_HOST=smtp.sendgrid.net
EMAIL_PORT=587
EMAIL_USER=apikey
EMAIL_PASSWORD=your-sendgrid-api-key
APP_NAME=eBay Business Management System
```

---

## Option 5: Mailgun

### Step 1: Create Mailgun Account
1. Sign up at [Mailgun](https://mailgun.com)
2. Add and verify your domain
3. Get SMTP credentials from Sending > Domain Settings

### Step 2: Update .env.local
```env
EMAIL_HOST=smtp.mailgun.org
EMAIL_PORT=587
EMAIL_USER=postmaster@your-domain.com
EMAIL_PASSWORD=your-mailgun-password
APP_NAME=eBay Business Management System
```

---

## Testing Email Sending

1. **Update your `.env.local`** with real credentials
2. **Restart your development server**:
   ```bash
   # Stop the server (Ctrl+C)
   npm run dev
   ```
3. **Test the invitation**:
   - Go to Dashboard > Team
   - Click "Invite Member"
   - Enter a valid email address
   - Check the recipient's inbox

---

## Email Template Features

When you invite a team member, they receive a professional email with:
- **Invitation details** (inviter name, role)
- **Direct sign-in link** with pre-filled email
- **HTML formatting** for better readability
- **Plain text fallback** for email clients without HTML support

---

## Troubleshooting

### "Email sending failed"
- ✅ Check your email credentials in `.env.local`
- ✅ Verify you used an **App Password** for Gmail (not your regular password)
- ✅ Make sure 2FA is enabled for Gmail
- ✅ Check spam folder for test emails
- ✅ Restart the dev server after changing `.env.local`

### Gmail App Password Not Working
- Ensure 2-Step Verification is **ON**
- Remove spaces from the app password in `.env.local`
- Try generating a new app password

### Emails Going to Spam
- For production, use a dedicated email service (SendGrid, Mailgun)
- Verify your sender domain with SPF/DKIM records
- Use a professional sender email address

---

## Production Deployment

For production, **DO NOT use personal Gmail**. Use a dedicated email service:

1. **SendGrid** - Free tier: 100 emails/day
2. **Mailgun** - Free tier: 5,000 emails/month
3. **AWS SES** - $0.10 per 1,000 emails
4. **Postmark** - Free tier: 100 emails/month

Update your production environment variables with the chosen service credentials.

---

## Security Notes

⚠️ **NEVER commit `.env.local` to git**  
⚠️ Use different credentials for development and production  
⚠️ Rotate email passwords regularly  
⚠️ For Gmail, use App Passwords only (never your main password)

---

## Need Help?

Check the console logs when inviting a member - they show:
- ✅ Email sent successfully: [message ID]
- ❌ Email sending failed: [error details]
