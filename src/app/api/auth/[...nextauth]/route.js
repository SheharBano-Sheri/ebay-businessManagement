import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import connectDB from '@/lib/mongodb';
import User from '@/models/User';
import bcrypt from 'bcryptjs';

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      async authorize(credentials) {
        try {
          await connectDB();

          const user = await User.findOne({ email: credentials.email });

          if (!user) {
            throw new Error('No user found with this email');
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            throw new Error('Invalid password');
          }

          if (!user.isActive) {
            throw new Error('Account is inactive');
          }

          // Check if public vendor is approved
          if (user.role === 'public_vendor') {
            const vendor = await connectDB().then(() => 
              require('@/models/Vendor').default.findOne({ publicVendorUserId: user._id })
            );
            if (vendor && vendor.approvalStatus === 'pending') {
              throw new Error('Your vendor account is pending approval by the administrator');
            }
            if (vendor && vendor.approvalStatus === 'rejected') {
              throw new Error('Your vendor account application has been rejected');
            }
          }

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            accountType: user.accountType,
            role: user.role,
            membershipPlan: user.membershipPlan,
            adminId: user.adminId?.toString() || user._id.toString(),
            permissions: user.permissions
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
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id;
        session.user.accountType = token.accountType;
        session.user.role = token.role;
        session.user.membershipPlan = token.membershipPlan;
        session.user.adminId = token.adminId;
        session.user.permissions = token.permissions;
      }
      return session;
    }
  },
  pages: {
    signIn: '/auth/signin',
    signUp: '/auth/signup'
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  secret: process.env.NEXTAUTH_SECRET
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
