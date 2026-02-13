import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import Session from '@/models/Session';
import LoginHistory from '@/models/LoginHistory';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
        ipAddress: { label: 'IP Address', type: 'text' },
        userAgent: { label: 'User Agent', type: 'text' }
      },
      async authorize(credentials) {
        try {
          await connectDB();

          const user = await User.findOne({ email: credentials.email });

          if (!user) {
            // Log failed login attempt
            if (credentials.email) {
              await LoginHistory.create({
                userId: null,
                email: credentials.email,
                ipAddress: credentials.ipAddress || 'unknown',
                userAgent: credentials.userAgent || 'unknown',
                success: false,
                failureReason: 'User not found'
              });
            }
            throw new Error('No user found with this email');
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            // Log failed login attempt
            await LoginHistory.create({
              userId: user._id,
              ipAddress: credentials.ipAddress || 'unknown',
              userAgent: credentials.userAgent || 'unknown',
              success: false,
              failureReason: 'Invalid password'
            });
            throw new Error('Invalid password');
          }

          // Check if email is verified (skip for team members who accept invitations)
          if (!user.isEmailVerified && user.role !== 'team_member') {
            await LoginHistory.create({
              userId: user._id,
              ipAddress: credentials.ipAddress || 'unknown',
              userAgent: credentials.userAgent || 'unknown',
              success: false,
              failureReason: 'Email not verified'
            });
            throw new Error('Please verify your email address before logging in. Check your inbox for the verification link.');
          }

          if (!user.isActive) {
            // Determine the reason for inactive account
            let failureReason = 'Account inactive';
            let errorMessage = 'Your account has been deactivated. Please contact support for assistance.';
            
            // Check if account is pending approval
            if (user.planApprovalStatus === 'pending') {
              failureReason = 'Account pending approval';
              errorMessage = 'Your account is pending approval by the administrator. Please check back later.';
            } 
            // Check if account was blocked by admin
            else if (user.planApprovalStatus === 'approved' || user.membershipPlan === 'personal') {
              failureReason = 'Account blocked by admin';
              errorMessage = 'Your account has been blocked by the administrator. Please contact support for more information.';
            }
            // Check if plan was rejected
            else if (user.planApprovalStatus === 'rejected') {
              failureReason = 'Plan rejected';
              errorMessage = 'Your plan application has been rejected. Please contact support for more information.';
            }

            // Log failed login attempt
            await LoginHistory.create({
              userId: user._id,
              ipAddress: credentials.ipAddress || 'unknown',
              userAgent: credentials.userAgent || 'unknown',
              success: false,
              failureReason: failureReason
            });
            throw new Error(errorMessage);
          }

          // Check if Enterprise plan user needs approval (this is redundant but kept for explicit clarity)
          if (user.membershipPlan === 'enterprise' && user.planApprovalStatus === 'pending') {
            await LoginHistory.create({
              userId: user._id,
              ipAddress: credentials.ipAddress || 'unknown',
              userAgent: credentials.userAgent || 'unknown',
              success: false,
              failureReason: 'Enterprise plan pending approval'
            });
            throw new Error('Your Enterprise plan is pending approval by the administrator. Please check back later.');
          }

          if (user.membershipPlan === 'enterprise' && user.planApprovalStatus === 'rejected') {
            await LoginHistory.create({
              userId: user._id,
              ipAddress: credentials.ipAddress || 'unknown',
              userAgent: credentials.userAgent || 'unknown',
              success: false,
              failureReason: 'Enterprise plan rejected'
            });
            throw new Error('Your Enterprise plan application has been rejected. Please contact support for more information.');
          }

          // Check if public vendor is approved
          if (user.role === 'public_vendor') {
            // Check vendorApprovalStatus on user model
            if (user.vendorApprovalStatus === 'pending') {
              await LoginHistory.create({
                userId: user._id,
                ipAddress: credentials.ipAddress || 'unknown',
                userAgent: credentials.userAgent || 'unknown',
                success: false,
                failureReason: 'Vendor pending approval'
              });
              throw new Error('Your vendor account is pending approval by the administrator');
            }
            if (user.vendorApprovalStatus === 'rejected') {
              await LoginHistory.create({
                userId: user._id,
                ipAddress: credentials.ipAddress || 'unknown',
                userAgent: credentials.userAgent || 'unknown',
                success: false,
                failureReason: 'Vendor application rejected'
              });
              throw new Error('Your vendor account application has been rejected. Please contact support for more information.');
            }
            
            // Double-check with vendor record
            const vendor = await connectDB().then(() => 
              require('@/models/Vendor').default.findOne({ publicVendorUserId: user._id })
            );
            if (vendor && vendor.approvalStatus === 'pending') {
              // Log failed login attempt
              await LoginHistory.create({
                userId: user._id,
                ipAddress: credentials.ipAddress || 'unknown',
                userAgent: credentials.userAgent || 'unknown',
                success: false,
                failureReason: 'Vendor pending approval'
              });
              throw new Error('Your vendor account is pending approval by the administrator');
            }
            if (vendor && vendor.approvalStatus === 'rejected') {
              // Log failed login attempt
              await LoginHistory.create({
                userId: user._id,
                ipAddress: credentials.ipAddress || 'unknown',
                userAgent: credentials.userAgent || 'unknown',
                success: false,
                failureReason: 'Vendor rejected'
              });
              throw new Error('Your vendor account application has been rejected. Please contact support for more information.');
            }
          }

          // Create session token
          const sessionToken = crypto.randomBytes(32).toString('hex');
          
          // Create session record
          await Session.create({
            userId: user._id,
            sessionToken,
            ipAddress: credentials.ipAddress || 'unknown',
            userAgent: credentials.userAgent || 'unknown',
            isActive: true,
            lastActive: new Date(),
            expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
          });

          // Log login history
          await LoginHistory.create({
            userId: user._id,
            ipAddress: credentials.ipAddress || 'unknown',
            userAgent: credentials.userAgent || 'unknown',
            success: true
          });

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            accountType: user.accountType,
            role: user.role,
            membershipPlan: user.membershipPlan,
            adminId: user.adminId?.toString() || user._id.toString(),
            permissions: user.permissions,
            sessionToken
          };
        } catch (error) {
          throw new Error(error.message);
        }
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.accountType = user.accountType;
        token.role = user.role;
        token.membershipPlan = user.membershipPlan;
        token.adminId = user.adminId;
        token.permissions = user.permissions;
        token.sessionToken = user.sessionToken;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        // Check if user is still active (not blocked)
        try {
          await connectDB();
          const user = await User.findById(token.id).select('isActive planApprovalStatus role');
          
          if (!user || !user.isActive) {
            // User has been blocked or deleted - invalidate session
            if (token.sessionToken) {
              await Session.findOneAndUpdate(
                { sessionToken: token.sessionToken },
                { isActive: false }
              ).catch(() => {});
            }
            throw new Error('Session invalid - account has been blocked');
          }
        } catch (error) {
          // If user check fails, return null session to force re-login
          console.error('Session validation error:', error);
          return null;
        }

        session.user.id = token.id;
        session.user.accountType = token.accountType;
        session.user.role = token.role;
        session.user.membershipPlan = token.membershipPlan;
        session.user.adminId = token.adminId;
        session.user.permissions = token.permissions;
        session.sessionToken = token.sessionToken;
        
        // Update last active time
        if (token.sessionToken) {
          await Session.findOneAndUpdate(
            { sessionToken: token.sessionToken },
            { lastActive: new Date() }
          ).catch(() => {});
        }
      }
      return session;
    }
  },
  events: {
    async signOut({ token }) {
      // Revoke the session when user signs out
      if (token?.sessionToken) {
        await connectDB();
        await Session.findOneAndUpdate(
          { sessionToken: token.sessionToken },
          { isActive: false }
        ).catch(() => {});
      }
    }
  },
  pages: {
    signIn: '/auth/signin'
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
