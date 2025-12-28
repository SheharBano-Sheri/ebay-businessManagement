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
    const id = searchParams.get('id'); // <--- CHECK FOR ID
    const type = searchParams.get('type');
    
    const adminId = session.user.adminId || session.user.id;
    const userId = session.user.id;
    const isMasterAdmin = session.user.role === 'master_admin';

    // --- FIX START: Handle Single Vendor Fetch by ID ---
    if (id) {
      const vendor = await Vendor.findById(id);
      
      if (!vendor) {
        return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
      }

      // Permission Logic:
      // 1. Master Admin can see anything.
      // 2. User can see Private/Virtual vendors ONLY if they own them (adminId match).
      // 3. User can see Public vendors if they are Active & Approved.
      const isOwner = vendor.vendorType !== 'public' && vendor.adminId === adminId;
      const isAccessiblePublic = vendor.vendorType === 'public' && vendor.isActive && (isMasterAdmin || vendor.approvalStatus === 'approved');

      if (!isMasterAdmin && !isOwner && !isAccessiblePublic) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
      }

      // Add meta data for public vendors (match list view behavior)
      const vendorObj = vendor.toObject();
      if (vendor.vendorType === 'public') {
        vendorObj.followerCount = vendor.addedByUsers?.length || 0;
        vendorObj.isAddedByCurrentUser = vendor.addedByUsers?.includes(adminId) || false;
      }

      return NextResponse.json({ vendor: vendorObj }, { status: 200 });
    }
    // --- FIX END ---

    let query = {};
    
    if (type === 'public') {
      query.vendorType = 'public';
      query.isActive = true;
      query.publicVendorUserId = { $ne: userId };
      if (!isMasterAdmin) {
        query.approvalStatus = 'approved';
      }
    } else if (type === 'private') {
      query.vendorType = 'private';
      query.adminId = adminId;
    } else if (type === 'virtual') {
      query.vendorType = 'virtual';
      query.adminId = adminId;
    } else {
      if (isMasterAdmin) {
        query = {
          $or: [
            { vendorType: 'public', isActive: true },
            { vendorType: 'private', adminId: adminId },
            { vendorType: 'virtual', adminId: adminId }
          ]
        };
      } else {
        query = {
          $or: [
            { vendorType: 'public', isActive: true, approvalStatus: 'approved' },
            { vendorType: 'private', adminId: adminId },
            { vendorType: 'virtual', adminId: adminId }
          ]
        };
      }
    }

    const vendors = await Vendor.find(query).sort({ createdAt: -1 });

    const vendorsWithMeta = vendors.map(vendor => {
      const vendorObj = vendor.toObject();
      if (vendor.vendorType === 'public') {
        vendorObj.followerCount = vendor.addedByUsers?.length || 0;
        vendorObj.isAddedByCurrentUser = vendor.addedByUsers?.includes(adminId) || false;
      }
      return vendorObj;
    });

    return NextResponse.json({ vendors: vendorsWithMeta }, { status: 200 });
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

    const { name, email, phone, website, vendorType, description, notes, address, linkedVendorId } = body;

    const adminId = session.user.adminId || session.user.id;

    if (linkedVendorId) {
      const publicVendor = await Vendor.findById(linkedVendorId);
      
      if (!publicVendor || publicVendor.vendorType !== 'public') {
        return NextResponse.json({ error: 'Public vendor not found' }, { status: 404 });
      }

      if (publicVendor.approvalStatus !== 'approved') {
        return NextResponse.json({ error: 'This vendor is not yet approved' }, { status: 400 });
      }

      if (publicVendor.addedByUsers && publicVendor.addedByUsers.includes(adminId)) {
        return NextResponse.json({ error: 'You have already added this vendor' }, { status: 400 });
      }

      publicVendor.addedByUsers = publicVendor.addedByUsers || [];
      publicVendor.addedByUsers.push(adminId);
      await publicVendor.save();

      return NextResponse.json({ 
        message: 'Vendor added to your account',
        vendor: publicVendor 
      }, { status: 200 });
    }

    if (!name || !vendorType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    if (vendorType === 'public' && session.user.role !== 'master_admin') {
      return NextResponse.json({ 
        error: 'Public vendors cannot be created directly. Please use "Become a Vendor" registration or contact us.' 
      }, { status: 403 });
    }

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
      isActive: true,
      addedByUsers: []
    });

    return NextResponse.json({ vendor }, { status: 201 });
  } catch (error) {
    console.error('Create vendor error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}