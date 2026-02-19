import nodemailer from "nodemailer";

export async function sendTeamInvitationEmail({
  to,
  name,
  inviterName,
  inviterEmail,
  role,
  inviteToken,
}) {
  try {
    if (!process.env.RESEND_API_KEY && !process.env.EMAIL_HOST) {
      console.warn("Email service not configured. Skipping invitation email.");
      return {
        success: true,
        skipped: true,
        message: "Email service not configured",
      };
    }

    const senderEmail = process.env.EMAIL_USER || inviterEmail;
    const senderName =
      process.env.APP_NAME || "Genie Business Management System";

    const inviteLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/signup?token=${inviteToken}&email=${encodeURIComponent(to)}`;

    // Plain Text Version (Updated to match HTML link count)
    const textContent = `
Hi ${name},

${inviterName} (${inviterEmail}) has invited you to join their team on eBay Business Management System.

Your Role: ${role.charAt(0).toUpperCase() + role.slice(1)}
Invited by: ${inviterName}

As a ${role}, you'll have access to collaborate on orders, inventory, and other business operations.

Accept Invitation & Join Team:
${inviteLink}

If the link above doesn't work, copy and paste this URL into your browser:
${inviteLink}

This link will create your account automatically. No plan selection needed - you'll be added to ${inviterName}'s team directly.

If you didn't expect this invitation, you can safely ignore this email.

(c) ${new Date().getFullYear()} eBay Business Management System. All rights reserved.
`;

    if (process.env.RESEND_API_KEY) {
      const { Resend } = require("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { data, error } = await resend.emails.send({
        from: `${senderName} <${senderEmail}>`,
        to,
        subject: `You've been invited to join ${inviterName}'s team`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .info-box { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
              .link-text { word-break: break-all; color: #667eea; font-size: 12px; margin-top: 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Team Invitation</h1>
              </div>
              <div class="content">
                <p>Hi <strong>${name}</strong>,</p>
                
                <p><strong>${inviterName}</strong> (${inviterEmail}) has invited you to join their team on eBay Business Management System.</p>
                
                <div class="info-box">
                  <p><strong>Your Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}</p>
                  <p><strong>Invited by:</strong> ${inviterName}</p>
                </div>
                
                <p>As a <strong>${role}</strong>, you'll have access to collaborate on orders, inventory, and other business operations.</p>
                
                <p style="text-align: center;">
                  <a href="${inviteLink}" class="button">
                    Accept Invitation & Join Team
                  </a>
                </p>

                <p style="font-size: 12px; margin-top: 20px;">If the button doesn't work, copy this link:</p>
                <div class="link-text">${inviteLink}</div>
                
                <p><small>This link will create your account and automatically add you to the team. No plan selection needed!</small></p>
                
                <div class="footer">
                  <p>If you didn't expect this invitation, you can safely ignore this email.</p>
                  <p>&copy; ${new Date().getFullYear()} eBay Business Management System. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
        text: textContent,
      });

      if (error) {
        console.error("Resend email error:", error);
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data?.id };
    }

    // SMTP Configuration with Secure Logic Fix
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: parseInt(process.env.EMAIL_PORT) === 465, // True only for 465
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
    });

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      replyTo: inviterEmail,
      to,
      subject: `You've been invited to join ${inviterName}'s team`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .info-box { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
            .link-text { word-break: break-all; color: #667eea; font-size: 12px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Team Invitation</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${name}</strong>,</p>
              
              <p><strong>${inviterName}</strong> (${inviterEmail}) has invited you to join their team on eBay Business Management System.</p>
              
              <div class="info-box">
                <p><strong>Your Role:</strong> ${role.charAt(0).toUpperCase() + role.slice(1)}</p>
                <p><strong>Invited by:</strong> ${inviterName}</p>
              </div>
              
              <p>As a <strong>${role}</strong>, you'll have access to collaborate on orders, inventory, and other business operations.</p>
              
              <p style="text-align: center;">
                <a href="${inviteLink}" class="button">
                  Accept Invitation & Join Team
                </a>
              </p>

              <p style="font-size: 12px; margin-top: 20px;">If the button doesn't work, copy this link:</p>
              <div class="link-text">${inviteLink}</div>
              
              <p><small>This link will create your account and automatically add you to the team. No plan selection needed!</small></p>
              
              <div class="footer">
                <p>If you didn't expect this invitation, you can safely ignore this email.</p>
                <p>&copy; ${new Date().getFullYear()} eBay Business Management System. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: textContent,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Email sending failed:", error);
    return { success: false, error: error.message };
  }
}

export async function sendVendorInvitationEmail({
  to,
  name,
  businessName,
  inviterName,
  inviterEmail,
  inviteToken,
}) {
  try {
    if (!process.env.RESEND_API_KEY && !process.env.EMAIL_HOST) {
      console.warn(
        "Email service not configured. Skipping vendor invitation email.",
      );
      return {
        success: true,
        skipped: true,
        message: "Email service not configured",
      };
    }

    const senderEmail = process.env.EMAIL_USER || inviterEmail;
    const senderName =
      process.env.APP_NAME || "Genie Business Management System";

    const inviteLink = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/auth/signup?token=${inviteToken}&email=${encodeURIComponent(to)}&type=vendor`;

    const textContent = `
Hi ${name},

${inviterName} (${inviterEmail}) has invited ${businessName} to join the eBay Business Management System marketplace as a vendor.

Benefits:
- Connect with eBay businesses looking for suppliers
- Manage your product catalog
- Track orders and relationships
- Build your vendor profile

Accept Invitation & Join Marketplace:
${inviteLink}

If the link above doesn't work, copy and paste this URL into your browser:
${inviteLink}

This link will create your vendor account automatically. No subscription required!

If you didn't expect this invitation, you can safely ignore this email.

(c) ${new Date().getFullYear()} eBay Business Management System. All rights reserved.
`;

    if (process.env.RESEND_API_KEY) {
      const { Resend } = require("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { data, error } = await resend.emails.send({
        from: `${senderName} <${senderEmail}>`,
        to,
        subject: `You've been invited to join GenieBMS Marketplace`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .info-box { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
              .link-text { word-break: break-all; color: #667eea; font-size: 12px; margin-top: 10px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Vendor Marketplace Invitation</h1>
              </div>
              <div class="content">
                <p>Hi <strong>${name}</strong>,</p>
                
                <p><strong>${inviterName}</strong> (${inviterEmail}) has invited <strong>${businessName}</strong> to join the eBay Business Management System marketplace as a vendor.</p>
                
                <div class="info-box">
                  <p><strong>Benefits:</strong></p>
                  <ul>
                    <li>Connect with eBay businesses looking for suppliers</li>
                    <li>Manage your product catalog</li>
                    <li>Track orders and relationships</li>
                    <li>Build your vendor profile</li>
                  </ul>
                </div>
                
                <p style="text-align: center;">
                  <a href="${inviteLink}" class="button">
                    Accept Invitation & Join Marketplace
                  </a>
                </p>

                <p style="font-size: 12px; margin-top: 20px;">If the button doesn't work, copy this link:</p>
                <div class="link-text">${inviteLink}</div>
                
                <p><small>This link will create your vendor account automatically. No subscription required!</small></p>
                
                <div class="footer">
                  <p>If you didn't expect this invitation, you can safely ignore this email.</p>
                  <p>&copy; ${new Date().getFullYear()} eBay Business Management System. All rights reserved.</p>
                </div>
              </div>
            </div>
          </body>
          </html>
        `,
        text: textContent,
      });

      if (error) {
        console.error("Resend email error:", error);
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data?.id };
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || "smtp.gmail.com",
      port: process.env.EMAIL_PORT || 587,
      secure: parseInt(process.env.EMAIL_PORT) === 465,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      replyTo: inviterEmail,
      to,
      subject: `You've been invited to join GenieBMS Marketplace`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .button { display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            .info-box { background: white; padding: 15px; border-left: 4px solid #667eea; margin: 20px 0; }
            .link-text { word-break: break-all; color: #667eea; font-size: 12px; margin-top: 10px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Vendor Marketplace Invitation</h1>
            </div>
            <div class="content">
              <p>Hi <strong>${name}</strong>,</p>
              
              <p><strong>${inviterName}</strong> (${inviterEmail}) has invited <strong>${businessName}</strong> to join the eBay Business Management System marketplace as a vendor.</p>
              
              <div class="info-box">
                <p><strong>Benefits:</strong></p>
                <ul>
                  <li>Connect with eBay businesses looking for suppliers</li>
                  <li>Manage your product catalog</li>
                  <li>Track orders and relationships</li>
                  <li>Build your vendor profile</li>
                </ul>
              </div>
              
              <p style="text-align: center;">
                <a href="${inviteLink}" class="button">
                  Accept Invitation & Join Marketplace
                </a>
              </p>

              <p style="font-size: 12px; margin-top: 20px;">If the button doesn't work, copy this link:</p>
              <div class="link-text">${inviteLink}</div>
              
              <p><small>This link will create your vendor account automatically. No subscription required!</small></p>
              
              <div class="footer">
                <p>If you didn't expect this invitation, you can safely ignore this email.</p>
                <p>&copy; ${new Date().getFullYear()} eBay Business Management System. All rights reserved.</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
      text: textContent,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Vendor invitation email failed:", error);
    return { success: false, error: error.message };
  }
}

export async function sendVerificationEmail({ to, name, verificationToken }) {
  try {
    if (!process.env.RESEND_API_KEY && !process.env.EMAIL_HOST) {
      console.warn(
        "Email service not configured. Skipping verification email.",
      );
      return {
        success: true,
        skipped: true,
        message: "Email service not configured",
      };
    }

    const senderEmail = process.env.EMAIL_USER || "noreply@geniebms.com";
    const senderName =
      process.env.APP_NAME || "Genie Business Management System";
    const appUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";

    const verificationLink = `${appUrl}/auth/verify-email?token=${verificationToken}`;

    // Updated Plain Text to match HTML link quantity (2 links)
    const textContent = `
Hi ${name},

Welcome to Genie Business Management System! We're excited to have you on board.

To complete your registration and access your account, please verify your email address by clicking the button below:

${verificationLink}

IMPORTANT:
- This verification link will expire in 24 hours.
- This link can only be used once.

If the button above doesn't work, copy and paste this link into your browser:
${verificationLink}

If you didn't create an account with us, please ignore this email.

Need help? Contact our support team.

(c) ${new Date().getFullYear()} Genie Business Management System. All rights reserved.
`;

    if (process.env.RESEND_API_KEY) {
      const { Resend } = require("resend");
      const resend = new Resend(process.env.RESEND_API_KEY);
      const { data, error } = await resend.emails.send({
        from: `${senderName} <${senderEmail}>`,
        to,
        subject: "Please Verify Your Email Address",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
              .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
              .header { 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                color: white; 
                padding: 40px 30px; 
                text-align: center; 
              }
              .header h1 { margin: 0; font-size: 28px; }
              .content { padding: 40px 30px; }
              .content h2 { color: #333; margin-top: 0; }
              .button { 
                display: inline-block; 
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                color: white !important; 
                padding: 15px 40px; 
                text-decoration: none; 
                border-radius: 5px; 
                margin: 25px 0; 
                font-weight: bold;
                text-align: center;
              }
              .button-container { text-align: center; }
              .info-box { 
                background: #f9f9f9; 
                border-left: 4px solid #667eea; 
                padding: 15px; 
                margin: 20px 0; 
                border-radius: 4px;
              }
              .footer { 
                text-align: center; 
                padding: 20px 30px; 
                background: #f9f9f9; 
                color: #666; 
                font-size: 12px; 
              }
              .footer p { margin: 5px 0; }
              .link-text { 
                word-break: break-all; 
                color: #667eea; 
                font-size: 12px; 
                margin-top: 20px;
                padding: 10px;
                background: #f9f9f9;
                border-radius: 4px;
              }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✉️ Verify Your Email</h1>
              </div>
              <div class="content">
                <h2>Hi ${name},</h2>
                
                <p>Welcome to <strong>Genie Business Management System</strong>! We're excited to have you on board.</p>
                
                <p>To complete your registration and access your account, please verify your email address by clicking the button below:</p>
                
                <div class="button-container">
                  <a href="${verificationLink}" class="button">
                    Verify Email Address
                  </a>
                </div>
                
                <div class="info-box">
                  <p><strong>⏰ Important:</strong> This verification link will expire in <strong>24 hours</strong>.</p>
                  <p><strong>🔒 Security:</strong> This link can only be used once.</p>
                </div>
                
                <p>If the button doesn't work, copy and paste this link into your browser:</p>
                <div class="link-text">${verificationLink}</div>
                
                <p style="margin-top: 30px;">If you didn't create an account with us, please ignore this email.</p>
              </div>
              <div class="footer">
                <p><strong>Need help?</strong> Contact our support team</p>
                <p>&copy; ${new Date().getFullYear()} Genie Business Management System. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `,
        text: textContent,
      });

      if (error) {
        console.error("Resend verification email error:", error);
        return { success: false, error: error.message };
      }

      return { success: true, messageId: data?.id };
    }

    if (
      !process.env.EMAIL_HOST ||
      !process.env.EMAIL_USER ||
      !process.env.EMAIL_PASSWORD
    ) {
      console.warn("SMTP not fully configured. Skipping verification email.");
      return { success: true, skipped: true, message: "SMTP not configured" };
    }

    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT || "587"),
      secure: parseInt(process.env.EMAIL_PORT) === 465, // Corrected SSL logic
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false,
      },
      debug: true,
      logger: true,
    });

    try {
      await transporter.verify();
    } catch (verifyError) {
      console.error("❌ SMTP verification failed:", verifyError);
      return {
        success: false,
        error: `SMTP connection failed: ${verifyError.message}`,
      };
    }

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      to,
      subject: "Please Verify Your Email Address",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f4f4f4; margin: 0; padding: 0; }
            .container { max-width: 600px; margin: 20px auto; background: white; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .header { 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white; 
              padding: 40px 30px; 
              text-align: center; 
            }
            .header h1 { margin: 0; font-size: 28px; }
            .content { padding: 40px 30px; }
            .content h2 { color: #333; margin-top: 0; }
            .button { 
              display: inline-block; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
              color: white !important; 
              padding: 15px 40px; 
              text-decoration: none; 
              border-radius: 5px; 
              margin: 25px 0; 
              font-weight: bold;
              text-align: center;
            }
            .button-container { text-align: center; }
            .info-box { 
              background: #f9f9f9; 
              border-left: 4px solid #667eea; 
              padding: 15px; 
              margin: 20px 0; 
              border-radius: 4px;
            }
            .footer { 
              text-align: center; 
              padding: 20px 30px; 
              background: #f9f9f9; 
              color: #666; 
              font-size: 12px; 
            }
            .footer p { margin: 5px 0; }
            .link-text { 
              word-break: break-all; 
              color: #667eea; 
              font-size: 12px; 
              margin-top: 20px;
              padding: 10px;
              background: #f9f9f9;
              border-radius: 4px;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>✉️ Verify Your Email</h1>
            </div>
            <div class="content">
              <h2>Hi ${name},</h2>
              
              <p>Welcome to <strong>Genie Business Management System</strong>! We're excited to have you on board.</p>
              
              <p>To complete your registration and access your account, please verify your email address by clicking the button below:</p>
              
              <div class="button-container">
                <a href="${verificationLink}" class="button">
                  Verify Email Address
                </a>
              </div>
              
              <div class="info-box">
                <p><strong>⏰ Important:</strong> This verification link will expire in <strong>24 hours</strong>.</p>
                <p><strong>🔒 Security:</strong> This link can only be used once.</p>
              </div>
              
              <p>If the button doesn't work, copy and paste this link into your browser:</p>
              <div class="link-text">${verificationLink}</div>
              
              <p style="margin-top: 30px;">If you didn't create an account with us, please ignore this email.</p>
            </div>
            <div class="footer">
              <p><strong>Need help?</strong> Contact our support team</p>
              <p>&copy; ${new Date().getFullYear()} Genie Business Management System. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `,
      text: textContent,
    };

    const info = await transporter.sendMail(mailOptions);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Verification email failed:", error);
    return { success: false, error: error.message };
  }
}
