import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import LoginHistory from '@/models/LoginHistory';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get('limit') || '20');

    const loginHistory = await LoginHistory.find({
      userId: session.user.id
    })
    .sort({ createdAt: -1 })
    .limit(limit);

    // Parse user agent to extract details
    const historyWithDetails = loginHistory.map(entry => {
      const ua = entry.userAgent.toLowerCase();
      let browser = 'Unknown';
      let os = 'Unknown';
      let device = 'Desktop';

      // Detect browser
      if (ua.includes('chrome')) browser = 'Chrome';
      else if (ua.includes('firefox')) browser = 'Firefox';
      else if (ua.includes('safari')) browser = 'Safari';
      else if (ua.includes('edge')) browser = 'Edge';
      else if (ua.includes('opera')) browser = 'Opera';

      // Detect OS
      if (ua.includes('windows')) os = 'Windows';
      else if (ua.includes('mac')) os = 'macOS';
      else if (ua.includes('linux')) os = 'Linux';
      else if (ua.includes('android')) os = 'Android';
      else if (ua.includes('ios') || ua.includes('iphone') || ua.includes('ipad')) os = 'iOS';

      // Detect device
      if (ua.includes('mobile') || ua.includes('android') || ua.includes('iphone')) device = 'Mobile';
      else if (ua.includes('tablet') || ua.includes('ipad')) device = 'Tablet';

      return {
        _id: entry._id,
        browser,
        os,
        device,
        ipAddress: entry.ipAddress,
        location: entry.location || 'Unknown',
        success: entry.success,
        createdAt: entry.createdAt
      };
    });

    return NextResponse.json({ history: historyWithDetails }, { status: 200 });

  } catch (error) {
    console.error('Get login history error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
