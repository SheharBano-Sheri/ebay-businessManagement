// Permission checking middleware
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { NextResponse } from 'next/server';
import User from '@/models/User';
import connectDB from '@/lib/mongodb';

/**
 * Check if user has required permission for a module and action
 * @param {string} module - The module name (orders, inventory, vendors, etc.)
 * @param {string} action - The action (view, edit)
 * @returns {Promise<{authorized: boolean, user: object|null, error: string|null}>}
 */
export async function checkPermission(module, action = 'view') {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return { authorized: false, user: null, error: 'Unauthorized - No session' };
    }

    await connectDB();
    
    // Always fetch fresh user data from database to get latest permissions
    const user = await User.findOne({ email: session.user.email }).lean();
    
    if (!user) {
      return { authorized: false, user: null, error: 'User not found' };
    }

    // Owners, master admins have full access
    if (user.role === 'owner' || user.role === 'master_admin') {
      return { authorized: true, user, error: null };
    }

    // Public vendors have limited access (not to team management)
    if (user.role === 'public_vendor') {
      const allowedModules = ['orders', 'inventory', 'vendors', 'accounts', 'payments'];
      if (allowedModules.includes(module)) {
        return { authorized: true, user, error: null };
      }
      return { authorized: false, user, error: 'Public vendors cannot access this module' };
    }

    // Team members - check permissions (fresh from database)
    if (user.role === 'team_member' && user.permissions) {
      const modulePerms = user.permissions[module];
      
      if (!modulePerms || modulePerms.length === 0) {
        return { authorized: false, user, error: `No access to ${module}` };
      }

      // Check if user has the required action permission
      if (modulePerms.includes(action)) {
        return { authorized: true, user, error: null };
      }

      return { authorized: false, user, error: `No ${action} permission for ${module}` };
    }

    return { authorized: false, user, error: 'Invalid user role' };

  } catch (error) {
    console.error('Permission check error:', error);
    return { authorized: false, user: null, error: 'Internal server error' };
  }
}

/**
 * Wrapper for API routes that require permission checking
 * @param {string} module - The module name
 * @param {string} method - HTTP method (GET, POST, PUT, DELETE)
 * @param {function} handler - The actual route handler
 * @returns {Promise<NextResponse>}
 */
export async function withPermission(module, method, handler) {
  // Map HTTP methods to permission actions
  const actionMap = {
    'GET': 'view',
    'POST': 'edit',
    'PUT': 'edit',
    'PATCH': 'edit',
    'DELETE': 'edit'
  };

  const action = actionMap[method] || 'view';
  
  const { authorized, user, error } = await checkPermission(module, action);

  if (!authorized) {
    return NextResponse.json({ 
      error: error || 'Insufficient permissions',
      required: { module, action }
    }, { status: 403 });
  }

  // Pass the user to the handler
  return handler(user);
}
