import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Product from '@/models/Product';
import Vendor from '@/models/Vendor';

export async function POST(request) {
  try {
    console.log('=== CSV Upload Started ===');
    const session = await getServerSession(authOptions);
    
    if (!session) {
      console.log('No session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('User:', session.user.email, 'AdminId:', session.user.adminId);

    await connectDB();

    const formData = await request.formData();
    const file = formData.get('file');
    
    if (!file) {
      console.log('No file in form data');
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    console.log('File received:', file.name, file.size, 'bytes');

    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    console.log('Total lines:', lines.length);
    
    if (lines.length < 2) {
      console.log('CSV file is empty or has no data rows');
      return NextResponse.json({ error: 'CSV file is empty or invalid' }, { status: 400 });
    }

    console.log('Header:', lines[0]);

    // Skip header row
    const dataLines = lines.slice(1);
    
    // For regular users (owner), adminId is their own ID
    // For team members, adminId is their admin's ID
    const adminId = session.user.adminId || session.user.id;
    
    console.log('Using adminId for vendor query:', adminId);
    
    // Get all vendors for matching
    const vendors = await Vendor.find({ adminId });
    const vendorMap = new Map();
    vendors.forEach(v => {
      vendorMap.set(v.name.toLowerCase().trim(), v._id);
      vendorMap.set(v._id.toString(), v._id);
    });

    console.log('Available vendors:', Array.from(vendorMap.keys()));

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
        
        console.log(`Row ${i + 2}: Parsed fields:`, fields);
        
        if (fields.length < 6) {
          results.errors.push(`Row ${i + 2}: Insufficient columns (need at least 6, got ${fields.length})`);
          results.failed++;
          continue;
        }

        const [country, sku, name, description, type, vendorIdentifier, stock, unitCost, listingUrl] = fields;

        if (!sku || !name) {
          results.errors.push(`Row ${i + 2}: Missing required fields (SKU: "${sku}", Name: "${name}")`);
          results.failed++;
          continue;
        }

        // Find vendor by name or ID (case-insensitive, trimmed)
        const vendorKey = vendorIdentifier.toLowerCase().trim();
        const vendorId = vendorMap.get(vendorKey) || vendorMap.get(vendorIdentifier);
        
        if (!vendorId) {
          results.errors.push(`Row ${i + 2}: Vendor "${vendorIdentifier}" not found. Available vendors: ${Array.from(vendorMap.keys()).join(', ')}`);
          results.failed++;
          continue;
        }

        // Check if product with same SKU exists
        const existingProduct = await Product.findOne({ adminId, sku });
        
        // Detect currency from country
        const countryCurrencyMap = {
          'USA': 'USD', 'US': 'USD', 'United States': 'USD',
          'UK': 'GBP', 'United Kingdom': 'GBP',
          'Canada': 'CAD', 'Australia': 'AUD', 'India': 'INR',
          'Japan': 'JPY', 'China': 'CNY', 'Germany': 'EUR',
          'France': 'EUR', 'Italy': 'EUR', 'Spain': 'EUR',
          'Netherlands': 'EUR', 'Belgium': 'EUR', 'Austria': 'EUR',
          'Switzerland': 'CHF', 'Sweden': 'SEK', 'Norway': 'NOK',
          'Denmark': 'DKK', 'Poland': 'PLN', 'Mexico': 'MXN',
          'Brazil': 'BRL', 'Argentina': 'ARS', 'South Korea': 'KRW',
          'Singapore': 'SGD', 'Hong Kong': 'HKD', 'New Zealand': 'NZD',
          'UAE': 'AED', 'Saudi Arabia': 'SAR', 'South Africa': 'ZAR',
          'Turkey': 'TRY', 'Russia': 'RUB'
        };
        const detectedCurrency = country ? (countryCurrencyMap[country] || countryCurrencyMap[country.trim()] || 'USD') : 'USD';
        
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
          existingProduct.currency = detectedCurrency;
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
            currency: detectedCurrency,
            isActive: true
          });
        }

        results.success++;
      } catch (error) {
        console.error(`Row ${i + 2} error:`, error);
        results.errors.push(`Row ${i + 2}: ${error.message}`);
        results.failed++;
      }
    }

    console.log('Upload results:', results);

    return NextResponse.json({ 
      message: `Import completed: ${results.success} successful, ${results.failed} failed`,
      results 
    }, { status: 200 });

  } catch (error) {
    console.error('Upload products error:', error);
    return NextResponse.json({ error: 'Internal server error: ' + error.message }, { status: 500 });
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
