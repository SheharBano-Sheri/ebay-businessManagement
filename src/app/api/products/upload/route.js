import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import Vendor from '@/models/Vendor';

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length < 2) {
      return NextResponse.json({ error: 'CSV file is empty or invalid' }, { status: 400 });
    }

    // Skip header row
    const dataLines = lines.slice(1);
    const adminId = session.user.adminId;
    
    // Get all vendors for matching
    const vendors = await Vendor.find({ adminId });
    const vendorMap = new Map();
    vendors.forEach(v => {
      vendorMap.set(v.name.toLowerCase(), v._id);
      vendorMap.set(v._id.toString(), v._id);
    });

    const results = {
      success: 0,
      failed: 0,
      errors: []
    };

    for (let i = 0; i < dataLines.length; i++) {
      try {
        const line = dataLines[i];
        // Parse CSV line (handle quoted fields)
        const fields = parseCSVLine(line);
        
        if (fields.length < 8) {
          results.errors.push(`Row ${i + 2}: Insufficient columns`);
          results.failed++;
          continue;
        }

        const [country, sku, name, description, type, vendorIdentifier, stock, unitCost, listingUrl] = fields;

        if (!sku || !name) {
          results.errors.push(`Row ${i + 2}: Missing required fields (SKU or Name)`);
          results.failed++;
          continue;
        }

        // Find vendor by name or ID
        const vendorId = vendorMap.get(vendorIdentifier.toLowerCase()) || vendorMap.get(vendorIdentifier);
        
        if (!vendorId) {
          results.errors.push(`Row ${i + 2}: Vendor "${vendorIdentifier}" not found`);
          results.failed++;
          continue;
        }

        // Check if product with same SKU exists
        const existingProduct = await Product.findOne({ adminId, sku });
        
        if (existingProduct) {
          // Update existing product
          existingProduct.country = country || existingProduct.country;
          existingProduct.name = name;
          existingProduct.description = description || existingProduct.description;
          existingProduct.type = type || existingProduct.type;
          existingProduct.vendorId = vendorId;
          existingProduct.stock = parseInt(stock) || 0;
          existingProduct.unitCost = parseFloat(unitCost) || 0;
          existingProduct.listingUrl = listingUrl || existingProduct.listingUrl;
          existingProduct.updatedAt = new Date();
          await existingProduct.save();
        } else {
          // Create new product
          await Product.create({
            country,
            sku,
            name,
            description,
            type,
            listingUrl,
            adminId,
            vendorId,
            addedBy: session.user.id,
            stock: parseInt(stock) || 0,
            unitCost: parseFloat(unitCost) || 0,
            currency: 'USD',
            isActive: true
          });
        }

        results.success++;
      } catch (error) {
        results.errors.push(`Row ${i + 2}: ${error.message}`);
        results.failed++;
      }
    }

    return NextResponse.json({ 
      message: `Import completed: ${results.success} successful, ${results.failed} failed`,
      results 
    }, { status: 200 });

  } catch (error) {
    console.error('Upload products error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

// Helper function to parse CSV line with quoted fields
function parseCSVLine(line) {
  const fields = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote
        current += '"';
        i++;
      } else {
        // Toggle quote mode
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      fields.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  
  fields.push(current.trim());
  return fields;
}
