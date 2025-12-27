import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '../../auth/[...nextauth]/route';
import connectDB from '@/lib/mongodb';
import TeamMember from '@/models/TeamMember';
import User from '@/models/User';

export async function PATCH(request, context) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await context.params;
    const adminId = session.user.adminId || session.user.id;

    const { role, permissions } = await request.json();

    const member = await TeamMember.findOne({ _id: id, adminId });

    if (!member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    if (member.role === 'owner') {
      return NextResponse.json({ error: 'Cannot modify owner permissions' }, { status: 403 });
    }

    // Update member
    if (role) member.role = role;
    if (permissions) member.permissions = permissions;

    await member.save();

    console.log('Team member updated:', id);

    return NextResponse.json({ 
      message: 'Team member updated successfully',
      member
    }, { status: 200 });

  } catch (error) {
    console.error('Update team member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    await connectDB();

    const { id } = await context.params;
    const adminId = session.user.adminId || session.user.id;

    const member = await TeamMember.findOne({ _id: id, adminId });

    if (!member) {
      return NextResponse.json({ error: 'Team member not found' }, { status: 404 });
    }

    if (member.role === 'owner') {
      return NextResponse.json({ error: 'Cannot remove the owner' }, { status: 403 });
    }

    // Delete the team member record (this removes pending invitations too)
    await TeamMember.deleteOne({ _id: id });

    // Delete the associated User account if it exists (active members)
    const userDeleted = await User.deleteOne({ email: member.email, adminId });
    
    console.log('Team member removed:', id);
    console.log('User account deleted:', userDeleted.deletedCount > 0);
    
    // If member was still pending, the invitation is now expired (TeamMember deleted)
    // If member was active, both User and TeamMember are deleted
    // Either way, they cannot sign in until invited again

    return NextResponse.json({ 
      message: 'Team member removed successfully. Invitation expired.' 
    }, { status: 200 });

  } catch (error) {
    console.error('Remove team member error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
