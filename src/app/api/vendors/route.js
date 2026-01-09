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
    const id = searchParams.get('id');
    const type = searchParams.get('type');
    const own = searchParams.get('own'); 
    
    const adminId = session.user.adminId || session.user.id;
    const userId = session.user.id;
    const isMasterAdmin = session.user.role === 'master_admin';

    // --- CASE 1: Fetch Own Vendor Profile (For Settings Page) ---
    if (own) {
      const vendor = await Vendor.findOne({ 
        $or: [{ publicVendorUserId: userId }, { adminId: userId, vendorType: 'public' }] 
      });
      return NextResponse.json({ vendor }, { status: 200 });
    }

    // --- CASE 2: Fetch Single Vendor by ID ---
    if (id) {
      const vendor = await Vendor.findById(id);
      
      if (!vendor) {
        return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });
      }

      const isOwner = vendor.vendorType !== 'public' && vendor.adminId === adminId;
      const isPublicOwner = vendor.publicVendorUserId === userId;
      const isAccessiblePublic = vendor.vendorType === 'public' && vendor.isActive && (isMasterAdmin || vendor.approvalStatus === 'approved' || isPublicOwner);

      if (!isMasterAdmin && !isOwner && !isAccessiblePublic) {
        const hasAdded = vendor.addedByUsers && vendor.addedByUsers.includes(adminId);
        if (!hasAdded && !isPublicOwner) {
             return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
        }
      }

      // Add meta data
      const vendorObj = vendor.toObject();
      if (vendor.vendorType === 'public') {
        vendorObj.followerCount = vendor.addedByUsers?.length || 0;
        vendorObj.isAddedByCurrentUser = vendor.addedByUsers?.includes(adminId) || false;
      }

      return NextResponse.json({ vendor: vendorObj }, { status: 200 });
    }

    // --- CASE 3: List Vendors ---
    let query = {};
    
    if (type === 'public') {
      query.vendorType = 'public';
      query.isActive = true;
      query.publicVendorUserId = { $ne: userId };
      if (!isMasterAdmin) {
        query.approvalStatus = 'approved';
        query.isHidden = { $ne: true }; // Hide hidden vendors from regular users
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
            { vendorType: 'public', isActive: true, approvalStatus: 'approved', isHidden: { $ne: true } },
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

// --- PATCH Method: Force Update Requirements ---
export async function PATCH(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    await connectDB();
    const body = await request.json();
    const { id, requirements } = body;

    const vendor = await Vendor.findById(id);
    if (!vendor) return NextResponse.json({ error: 'Vendor not found' }, { status: 404 });

    const userId = session.user.id;
    const adminId = session.user.adminId || session.user.id;
    const isOwner = vendor.publicVendorUserId == userId || vendor.adminId == adminId;

    if (!isOwner) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    // --- FIX: Force update and mark modified ---
    if (requirements) {
        // We set the object explicitly to ensure structure
        vendor.requirements = {
            paymentProof: requirements.paymentProof ?? true,
            shippingLabel: requirements.shippingLabel ?? false,
            packingSlip: requirements.packingSlip ?? false,
            instructions: requirements.instructions || ""
        };
        // CRITICAL: Tell Mongoose this field changed so it saves it
        vendor.markModified('requirements');
    }

    await vendor.save();
    return NextResponse.json({ message: 'Settings updated', vendor }, { status: 200 });

  } catch (error) {
    console.error('Update vendor error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

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
        error: 'Public vendors cannot be created directly.' 
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
      addedByUsers: [],
      // Initialize requirements on creation
      requirements: {
        paymentProof: true,
        shippingLabel: false,
        packingSlip: false,
        instructions: ""
      }
    });

    return NextResponse.json({ vendor }, { status: 201 });
  } catch (error) {
    console.error('Create vendor error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}