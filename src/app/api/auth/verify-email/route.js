import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import { isTokenExpired } from '@/lib/verification';

export async function POST(request) {
  try {
    await connectDB();
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json({ error: 'Verification token is required' }, { status: 400 });
    }

    // Find user with this verification token
    const user = await User.findOne({ emailVerificationToken: token });

    if (!user) {
      return NextResponse.json({ 
        error: 'Invalid verification token',
        code: 'INVALID_TOKEN'
      }, { status: 400 });
    }

    // Check if token was already used
    if (user.emailVerificationTokenUsed) {
      return NextResponse.json({ 
        error: 'This verification link has already been used',
        code: 'TOKEN_USED'
      }, { status: 400 });
    }

    // Check if email is already verified
    if (user.isEmailVerified) {
      return NextResponse.json({ 
        message: 'Email is already verified',
        code: 'ALREADY_VERIFIED'
      }, { status: 200 });
    }

    // Check if token has expired
    if (isTokenExpired(user.emailVerificationTokenExpiry)) {
      return NextResponse.json({ 
        error: 'Verification link has expired. Please request a new verification email.',
        code: 'TOKEN_EXPIRED',
        email: user.email
      }, { status: 400 });
    }

    // Verify the email
    user.isEmailVerified = true;
    user.emailVerificationTokenUsed = true;
    user.emailVerifiedAt = new Date();
    await user.save();

    return NextResponse.json({
      message: 'Email verified successfully! You can now log in to your account.',
      code: 'SUCCESS',
      user: {
        email: user.email,
        name: user.name
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}

// GET endpoint to verify token from URL parameter
export async function GET(request) {
  try {
    await connectDB();
    const { searchParams } = new URL(request.url);
    const token = searchParams.get('token');

    if (!token) {
      return NextResponse.json({ error: 'Verification token is required' }, { status: 400 });
    }

    // Find user with this verification token
    const user = await User.findOne({ emailVerificationToken: token });

    if (!user) {
      return NextResponse.json({ 
        error: 'Invalid verification token',
        code: 'INVALID_TOKEN'
      }, { status: 400 });
    }

    // Check if token was already used
    if (user.emailVerificationTokenUsed) {
      return NextResponse.json({ 
        error: 'This verification link has already been used',
        code: 'TOKEN_USED'
      }, { status: 400 });
    }

    // Check if email is already verified
    if (user.isEmailVerified) {
      return NextResponse.json({ 
        message: 'Email is already verified',
        code: 'ALREADY_VERIFIED'
      }, { status: 200 });
    }

    // Check if token has expired
    if (isTokenExpired(user.emailVerificationTokenExpiry)) {
      return NextResponse.json({ 
        error: 'Verification link has expired. Please request a new verification email.',
        code: 'TOKEN_EXPIRED',
        email: user.email
      }, { status: 400 });
    }

    // Verify the email
    user.isEmailVerified = true;
    user.emailVerificationTokenUsed = true;
    user.emailVerifiedAt = new Date();
    await user.save();

    return NextResponse.json({
      message: 'Email verified successfully! You can now log in to your account.',
      code: 'SUCCESS',
      user: {
        email: user.email,
        name: user.name
      }
    }, { status: 200 });

  } catch (error) {
    console.error('Email verification error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
