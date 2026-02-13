import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { generateVerificationToken, generateTokenExpiry } from '@/lib/verification';
import { sendVerificationEmail } from '@/lib/email';

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { email } = body;

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Find user by email
    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ 
        error: 'No account found with this email address',
        code: 'USER_NOT_FOUND'
      }, { status: 404 });
    }

    // Check if email is already verified
    if (user.isEmailVerified) {
      return NextResponse.json({ 
        message: 'Email is already verified. You can log in to your account.',
        code: 'ALREADY_VERIFIED'
      }, { status: 200 });
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken();
    const verificationTokenExpiry = generateTokenExpiry();

    // Update user with new token
    user.emailVerificationToken = verificationToken;
    user.emailVerificationTokenExpiry = verificationTokenExpiry;
    user.emailVerificationTokenUsed = false; // Reset used flag
    await user.save();

    // Send verification email
    try {
      const emailResult = await sendVerificationEmail({
        to: email,
        name: user.name,
        verificationToken: verificationToken
      });
      
      if (!emailResult.success && !emailResult.skipped) {
        console.error('Failed to send verification email:', emailResult.error);
        return NextResponse.json({ 
          error: 'Failed to send verification email. Please try again later.',
          code: 'EMAIL_SEND_FAILED'
        }, { status: 500 });
      }

      if (emailResult.skipped) {
        return NextResponse.json({
          message: 'Email service is not configured. Verification token generated but email not sent.',
          code: 'EMAIL_SERVICE_NOT_CONFIGURED',
          warning: true
        }, { status: 200 });
      }

      return NextResponse.json({
        message: 'Verification email sent successfully! Please check your inbox.',
        code: 'SUCCESS'
      }, { status: 200 });

    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      return NextResponse.json({ 
        error: 'Failed to send verification email. Please try again later.',
        code: 'EMAIL_SEND_FAILED'
      }, { status: 500 });
    }

  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
