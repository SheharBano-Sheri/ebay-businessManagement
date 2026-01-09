import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import { checkPermission } from '@/lib/permissions';

export async function POST(request) {
  try {
    // Check permission - need 'edit' for bulk delete
    const { authorized, user, error } = await checkPermission('inventory', 'edit');
    
    if (!authorized) {
      return NextResponse.json({ error: error || 'Insufficient permissions to delete products' }, { status: 403 });
    }
    
    const session = await getServerSession(authOptions);
    await connectDB();

    const body = await request.json();
    const { productIds } = body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      return NextResponse.json({ error: 'No products selected' }, { status: 400 });
    }

    const adminId = session.user.adminId || session.user.id;

    // Delete only products that belong to the user's admin
    const result = await Product.deleteMany({ 
      _id: { $in: productIds }, 
      adminId: adminId 
    });

    return NextResponse.json({ 
      message: `${result.deletedCount} product(s) deleted successfully`,
      deletedCount: result.deletedCount
    }, { status: 200 });

  } catch (error) {
    console.error('Bulk delete products error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
