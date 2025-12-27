export async function sendTeamInvitationEmail({ to, name, inviterName, inviterEmail, role, inviteToken }) {
  try {
    // If no email service is configured, return success but log a warning
    if (!process.env.RESEND_API_KEY && !process.env.EMAIL_HOST) {
      console.warn('Email service not configured. Skipping invitation email.');
      return { success: true, skipped: true, message: 'Email service not configured' };
    }

    // Use the configured email as the sender (e.g., Onboarding@geniebms.com)
    const senderEmail = process.env.EMAIL_USER || inviterEmail;
    const senderName = process.env.APP_NAME || 'Genie Business Management System';
    
    const inviteLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/signup?token=${inviteToken}&email=${encodeURIComponent(to)}`;
    
    // If Resend API key is configured, use Resend (simpler)
    if (process.env.RESEND_API_KEY) {
      const { Resend } = require('resend');
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
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>Team Invitation</h1>
              </div>
              <div class="content">
                <p>Hi <strong>${name}</strong>,</p>
                
                <p><strong>${inviterName}</strong> (${inviterEmail}) has invited you to join their team on Genie Business Management System.</p>
                
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
        text: `
Hi ${name},

${inviterName} (${inviterEmail}) has invited you to join their team on eBay Business Management System.

Your Role: ${role.charAt(0).toUpperCase() + role.slice(1)}
Invited by: ${inviterName}

As a ${role}, you'll have access to collaborate on orders, inventory, and other business operations.

Click here to accept invitation and join the team: ${inviteLink}

This link will create your account automatically. No plan selection needed - you'll be added to ${inviterName}'s team directly.

If you didn't expect this invitation, you can safely ignore this email.

(c) ${new Date().getFullYear()} eBay Business Management System. All rights reserved.
        `,
      });

      if (error) {
        console.error('Resend email error:', error);
        return { success: false, error: error.message };
      }

      console.log('Email sent successfully via Resend:', data?.id);
      return { success: true, messageId: data?.id };
    }

    // Fallback to nodemailer if Resend not configured
    console.log('Using SMTP email configuration:', {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      user: process.env.EMAIL_USER,
      hasPassword: !!process.env.EMAIL_PASSWORD
    });

    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.EMAIL_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      }
    });

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      replyTo: inviterEmail, // Reply goes to the admin who invited
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
      text: `
Hi ${name},

${inviterName} (${inviterEmail}) has invited you to join their team on eBay Business Management System.

Your Role: ${role.charAt(0).toUpperCase() + role.slice(1)}
Invited by: ${inviterName}

As a ${role}, you'll have access to collaborate on orders, inventory, and other business operations.

Click here to accept invitation and join the team: ${inviteLink}

This link will create your account automatically. No plan selection needed - you'll be added to ${inviterName}'s team directly.

If you didn't expect this invitation, you can safely ignore this email.

(c) ${new Date().getFullYear()} eBay Business Management System. All rights reserved.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent successfully via SMTP:', info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, error: error.message };
  }
}

export async function sendVendorInvitationEmail({ to, name, businessName, inviterName, inviterEmail, inviteToken }) {
  try {
    // If no email service is configured, return success but log a warning
    if (!process.env.RESEND_API_KEY && !process.env.EMAIL_HOST) {
      console.warn('Email service not configured. Skipping vendor invitation email.');
      return { success: true, skipped: true, message: 'Email service not configured' };
    }

    const senderEmail = process.env.EMAIL_USER || inviterEmail;
    const senderName = process.env.APP_NAME || 'Genie Business Management System';
    
    const inviteLink = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/signup?token=${inviteToken}&email=${encodeURIComponent(to)}&type=vendor`;
    
    // If Resend API key is configured, use Resend
    if (process.env.RESEND_API_KEY) {
      const { Resend } = require('resend');
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
        text: `
Hi ${name},

${inviterName} (${inviterEmail}) has invited ${businessName} to join the eBay Business Management System marketplace as a vendor.

Benefits:
- Connect with eBay businesses looking for suppliers
- Manage your product catalog
- Track orders and relationships
- Build your vendor profile

Click here to accept invitation and join the marketplace: ${inviteLink}

This link will create your vendor account automatically. No subscription required!

If you didn't expect this invitation, you can safely ignore this email.

(c) ${new Date().getFullYear()} eBay Business Management System. All rights reserved.
        `,
      });

      if (error) {
        console.error('Resend email error:', error);
        return { success: false, error: error.message };
      }

      console.log('Vendor invitation email sent via Resend:', data?.id);
      return { success: true, messageId: data?.id };
    }

    // Fallback to nodemailer
    const nodemailer = require('nodemailer');
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST || 'smtp.gmail.com',
      port: process.env.EMAIL_PORT || 587,
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    });

    const mailOptions = {
      from: `"${senderName}" <${senderEmail}>`,
      replyTo: inviterEmail, // Reply goes to the admin who invited
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
      text: `
Hi ${name},

${inviterName} (${inviterEmail}) has invited ${businessName} to join the eBay Business Management System marketplace as a vendor.

Benefits:
- Connect with eBay businesses looking for suppliers
- Manage your product catalog
- Track orders and relationships
- Build your vendor profile

Click here to accept invitation and join the marketplace: ${inviteLink}

This link will create your vendor account automatically. No subscription required!

If you didn't expect this invitation, you can safely ignore this email.

(c) ${new Date().getFullYear()} eBay Business Management System. All rights reserved.
      `,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('Vendor invitation email sent via SMTP:', info.messageId);
    return { success: true, messageId: info.messageId };

  } catch (error) {
    console.error('Vendor invitation email failed:', error);
    return { success: false, error: error.message };
  }
}
