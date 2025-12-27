import { NextResponse } from 'next/server';

export async function GET() {
  try {
    const nodemailer = require('nodemailer');
    
    // Log environment variables (without password)
    const config = {
      host: process.env.EMAIL_HOST,
      port: process.env.EMAIL_PORT,
      user: process.env.EMAIL_USER,
      hasPassword: !!process.env.EMAIL_PASSWORD,
      passwordLength: process.env.EMAIL_PASSWORD?.length || 0
    };
    
    console.log('Email config:', config);
    
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
      return NextResponse.json({
        success: false,
        error: 'Email credentials not configured',
        config
      });
    }
    
    const transporter = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: parseInt(process.env.EMAIL_PORT),
      secure: false,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
      tls: {
        rejectUnauthorized: false
      }
    });
    
    // Test connection
    await transporter.verify();
    
    return NextResponse.json({
      success: true,
      message: 'SMTP connection successful',
      config
    });
    
  } catch (error) {
    console.error('Test email error:', error);
    return NextResponse.json({
      success: false,
      error: error.message,
      stack: error.stack
    }, { status: 500 });
  }
}
