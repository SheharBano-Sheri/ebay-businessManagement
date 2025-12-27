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
    
    // For regular users (owner), adminId is their own ID
    // For team members, adminId is their admin's ID
    const adminId = session.user.adminId || session.user.id;

    const userId = session.user.id; // Get the actual user ID
    let query = {};
    
    // Master admin sees all vendors including pending ones
    const isMasterAdmin = session.user.role === 'master_admin';
    
    if (type === 'public') {
      query.vendorType = 'public';
      query.isActive = true;
      // Exclude user's own public vendor from marketplace
      query.publicVendorUserId = { $ne: userId };
      // Regular users only see approved public vendors
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
      // Get all vendors accessible to this admin
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

    // Add follower count for public vendors and check if current user added them
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

    // For regular users (owner), adminId is their own ID
    // For team members, adminId is their admin's ID
    const adminId = session.user.adminId || session.user.id;

    // Handle adding an existing public vendor to user's account
    if (linkedVendorId) {
      const publicVendor = await Vendor.findById(linkedVendorId);
      
      if (!publicVendor || publicVendor.vendorType !== 'public') {
        return NextResponse.json({ error: 'Public vendor not found' }, { status: 404 });
      }

      // Check if vendor is approved (master admin check is not needed for adding)
      if (publicVendor.approvalStatus !== 'approved') {
        return NextResponse.json({ error: 'This vendor is not yet approved' }, { status: 400 });
      }

      // Check if user already added this vendor
      if (publicVendor.addedByUsers && publicVendor.addedByUsers.includes(adminId)) {
        return NextResponse.json({ error: 'You have already added this vendor' }, { status: 400 });
      }

      // Add user to the vendor's addedByUsers list
      publicVendor.addedByUsers = publicVendor.addedByUsers || [];
      publicVendor.addedByUsers.push(adminId);
      await publicVendor.save();

      return NextResponse.json({ 
        message: 'Vendor added to your account',
        vendor: publicVendor 
      }, { status: 200 });
    }

    // Create new vendor (existing logic)
    if (!name || !vendorType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Prevent regular users from creating public vendors
    // Public vendors must sign up through "Become a Vendor" flow
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
