import { NextResponse } from 'next/server';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    await connectDB();

    // Check if master admin already exists
    const existingMasterAdmin = await User.findOne({ 
      role: 'master_admin',
      email: 'masteradmin@geniebms.local'
    });

    if (existingMasterAdmin) {
      return NextResponse.json(
        { message: 'Master Admin already exists', user: { email: existingMasterAdmin.email } },
        { status: 200 }
      );
    }

    // Create Master Admin user
    const hashedPassword = await bcrypt.hash('admin890', 10);
    
    const masterAdmin = await User.create({
      email: 'masteradmin@geniebms.local',
      password: hashedPassword,
      name: 'MasterAdmin',
      accountType: 'user',
      role: 'master_admin',
      membershipPlan: 'enterprise',
      membershipStart: new Date(),
      membershipEnd: new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000), // 100 years
      isActive: true
    });

    return NextResponse.json({
      message: 'Master Admin created successfully',
      user: {
        id: masterAdmin._id,
        email: masterAdmin.email,
        name: masterAdmin.name,
        role: masterAdmin.role
      }
    }, { status: 201 });

  } catch (error) {
    console.error('Seed master admin error:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    );
  }
}
