import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'data' or 'template'
    const adminId = session.user.adminId;

    if (type === 'template') {
      // Return CSV template
      const csvTemplate = 'Country,SKU,Product Name,Description,Type,Vendor ID,Stock Quantity,Unit Cost,Listing URL\n' +
                          'USA,SAMPLE-001,Sample Product,Product description,Electronics,vendor_id_here,100,29.99,https://example.com/product';
      
      return new NextResponse(csvTemplate, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="inventory-template.csv"'
        }
      });
    } else {
      // Export actual data
      const products = await Product.find({ adminId })
        .populate('vendorId', 'name')
        .sort({ createdAt: -1 });

      // Generate CSV from products
      let csv = 'Country,SKU,Product Name,Description,Type,Vendor,Stock Quantity,Unit Cost,Listing URL\n';
      
      products.forEach(product => {
        const row = [
          product.country || '',
          product.sku || '',
          product.name || '',
          `"${(product.description || '').replace(/"/g, '""')}"`, // Escape quotes
          product.type || '',
          product.vendorId?.name || '',
          product.stock || 0,
          product.unitCost || 0,
          product.listingUrl || ''
        ].join(',');
        csv += row + '\n';
      });

      return new NextResponse(csv, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="inventory-export-${new Date().toISOString().split('T')[0]}.csv"`
        }
      });
    }
  } catch (error) {
    console.error('Export products error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
