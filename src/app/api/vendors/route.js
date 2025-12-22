import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Vendor from '@/models/Vendor';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // public, private, virtual
    const adminId = session.user.adminId;

    let query = {};
    
    if (type === 'public') {
      query.vendorType = 'public';
      query.isActive = true;
    } else if (type === 'private') {
      query.vendorType = 'private';
      query.adminId = adminId;
    } else if (type === 'virtual') {
      query.vendorType = 'virtual';
      query.adminId = adminId;
    } else {
      // Get all vendors accessible to this admin
      query = {
        $or: [
          { vendorType: 'public', isActive: true },
          { vendorType: 'private', adminId: adminId },
          { vendorType: 'virtual', adminId: adminId }
        ]
      };
    }

    const vendors = await Vendor.find(query).sort({ createdAt: -1 });

    return NextResponse.json({ vendors }, { status: 200 });
  } catch (error) {
    console.error('Get vendors error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();
    const body = await request.json();

    const { name, email, phone, website, vendorType, description, notes, address } = body;

    if (!name || !vendorType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const adminId = session.user.adminId;

    const vendor = await Vendor.create({
      name,
      email,
      phone,
      website,
      vendorType,
      adminId: vendorType === 'private' ? adminId : undefined,
      description,
      notes,
      address,
      isActive: true
    });

    return NextResponse.json({ vendor }, { status: 201 });
  } catch (error) {
    console.error('Create vendor error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
