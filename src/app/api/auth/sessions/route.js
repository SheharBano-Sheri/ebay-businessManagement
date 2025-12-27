import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import Session from '@/models/Session';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const activeSessions = await Session.find({
      userId: session.user.id,
      isActive: true,
      expiresAt: { $gt: new Date() }
    }).sort({ lastActive: -1 });

    // Parse user agent to extract browser and OS info
    const sessionsWithDetails = activeSessions.map(sess => {
      const ua = sess.userAgent.toLowerCase();
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
        _id: sess._id,
        browser,
        os,
        device,
        ipAddress: sess.ipAddress,
        location: sess.location || 'Unknown',
        lastActive: sess.lastActive,
        createdAt: sess.createdAt,
        isCurrent: sess.sessionToken === session.sessionToken
      };
    });

    return NextResponse.json({ sessions: sessionsWithDetails }, { status: 200 });

  } catch (error) {
    console.error('Get sessions error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { searchParams } = new URL(request.url);
    const sessionId = searchParams.get('sessionId');
    const action = searchParams.get('action');

    if (action === 'all') {
      // Revoke all sessions except current
      await Session.updateMany(
        { 
          userId: session.user.id,
          sessionToken: { $ne: session.sessionToken },
          isActive: true
        },
        { 
          isActive: false 
        }
      );

      return NextResponse.json({ 
        message: 'All other sessions have been revoked' 
      }, { status: 200 });
    }

    if (sessionId) {
      // Revoke specific session
      const sess = await Session.findById(sessionId);
      
      if (!sess || sess.userId.toString() !== session.user.id) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      
      // Don't allow revoking current session this way
      if (sess.sessionToken === session.sessionToken) {
        return NextResponse.json({ 
          error: 'Cannot revoke current session. Please use sign out.' 
        }, { status: 400 });
      }

      sess.isActive = false;
      await sess.save();

      return NextResponse.json({ 
        message: 'Session revoked successfully' 
      }, { status: 200 });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });

  } catch (error) {
    console.error('Delete session error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
