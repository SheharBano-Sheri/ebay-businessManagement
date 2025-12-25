"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Users, Crown, AlertCircle, Mail, Trash2, Eye, Edit, Shield } from "lucide-react";

export default function TeamPage() {
  const { data: session } = useSession();
  const [membershipInfo, setMembershipInfo] = useState(null);
  const [teamMembers, setTeamMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingMember, setEditingMember] = useState(null);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    role: 'member',
    permissions: {
      orders: ['view'],
      inventory: ['view'],
      vendors: ['view'],
      accounts: [],
      payments: []
    }
  });

  useEffect(() => {
    if (session?.user) {
      setMembershipInfo({
        plan: session.user.membershipPlan || "personal",
        role: session.user.role || "owner",
      });
      fetchTeamMembers();
    }
  }, [session]);

  const fetchTeamMembers = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/team');
      const data = await response.json();
      if (response.ok) {
        setTeamMembers(data.members || []);
      }
    } catch (error) {
      console.error('Failed to fetch team members');
    } finally {
      setLoading(false);
    }
  };

  const handleInviteMember = async () => {
    if (!inviteForm.email || !inviteForm.name) {
      toast.error('Please fill in all fields');
      return;
    }

    try {
      const response = await fetch('/api/team', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.emailSent 
          ? 'Team member invited! An email has been sent with signup instructions.' 
          : 'Team member invited! Please share the signup link manually.'
        );
        setIsInviteOpen(false);
        setInviteForm({
          email: '',
          name: '',
          role: 'member',
          permissions: {
            orders: ['view'],
            inventory: ['view'],
            vendors: ['view'],
            accounts: [],
            payments: []
          }
        });
        fetchTeamMembers();
      } else {
        toast.error(data.error || 'Failed to invite member');
      }
    } catch (error) {
      toast.error('Error inviting team member');
    }
  };

  const handleRemoveMember = async (memberId) => {
    if (!confirm('Are you sure you want to remove this team member?')) {
      return;
    }

    try {
      const response = await fetch(`/api/team/${memberId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Team member removed');
        fetchTeamMembers();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to remove member');
      }
    } catch (error) {
      toast.error('Error removing team member');
    }
  };

  const handleEditMember = (member) => {
    setEditingMember({
      ...member,
      permissions: member.permissions || {
        orders: [],
        inventory: [],
        vendors: [],
        accounts: [],
        payments: []
      }
    });
    setIsEditOpen(true);
  };

  const handleUpdateMember = async () => {
    try {
      const response = await fetch(`/api/team/${editingMember._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: editingMember.role,
          permissions: editingMember.permissions
        })
      });

      if (response.ok) {
        toast.success('Member permissions updated');
        setIsEditOpen(false);
        setEditingMember(null);
        fetchTeamMembers();
      } else {
        const data = await response.json();
        toast.error(data.error || 'Failed to update member');
      }
    } catch (error) {
      toast.error('Error updating member');
    }
  };

  const planLimits = {
    personal: { members: 0, description: "Solo usage only" },
    pro: { members: 10, description: "Up to 10 team members" },
    enterprise: { members: Infinity, description: "Unlimited team members" },
  };

  const currentPlan = membershipInfo?.plan || "personal";
  const limit = planLimits[currentPlan];

  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      }}
    >
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col p-4 lg:p-6">
          <div className="space-y-4">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Team Management</h1>
                <p className="text-muted-foreground">
                  Manage your team members and their permissions
                </p>
              </div>
            </div>

            {/* Membership Status Card */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Crown className="h-5 w-5 text-yellow-500" />
                      Current Plan
                    </CardTitle>
                    <CardDescription className="mt-2">
                      {limit.description}
                    </CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-lg px-4 py-2 capitalize">
                    {currentPlan}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Team Members</p>
                    <p className="text-2xl font-bold">
                      {teamMembers.length} / {limit.members === Infinity ? "∞" : limit.members}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Active Invitations</p>
                    <p className="text-2xl font-bold">{teamMembers.filter(m => m.status === 'pending').length}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Your Role</p>
                    <p className="text-2xl font-bold capitalize">{membershipInfo?.role}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Upgrade Notice for Personal Plan */}
            {currentPlan === "personal" && (
              <Card className="border-yellow-500/50 bg-yellow-500/5">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <AlertCircle className="h-6 w-6 text-yellow-500 mt-0.5" />
                    <div className="flex-1">
                      <h3 className="font-semibold mb-2">Team Features Not Available</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        Your Personal plan does not include team collaboration features.
                        Upgrade to Pro or Enterprise to invite team members and manage permissions.
                      </p>
                      <div className="flex gap-2">
                        <Button>Upgrade to Pro</Button>
                        <Button variant="outline">View Plans</Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Team Members List (for Pro/Enterprise) */}
            {currentPlan !== "personal" && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Team Members</CardTitle>
                      <CardDescription>
                        Manage your team and their access permissions
                      </CardDescription>
                    </div>
                    <Button onClick={() => setIsInviteOpen(true)} disabled={teamMembers.length >= limit.members}>
                      <Mail className="mr-2 h-4 w-4" />
                      Invite Member
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex justify-center py-8">
                      <p className="text-muted-foreground">Loading team members...</p>
                    </div>
                  ) : teamMembers.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-12">
                      <Users className="h-12 w-12 text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">No team members yet</p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Invite team members to collaborate on your eBay business
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {teamMembers.map((member) => (
                        <div key={member._id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-medium">{member.name?.charAt(0).toUpperCase()}</span>
                            </div>
                            <div>
                              <p className="font-medium">{member.name}</p>
                              <p className="text-sm text-muted-foreground">{member.email}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-3">
                            <Badge variant={member.status === 'active' ? 'default' : 'secondary'} className="capitalize">
                              {member.status || 'pending'}
                            </Badge>
                            <Badge variant="outline" className="capitalize">{member.role}</Badge>
                            {member.role !== 'owner' && (
                              <>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleEditMember(member)}
                                >
                                  <Shield className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleRemoveMember(member._id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Invite Member Dialog */}
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
              <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Invite Team Member</DialogTitle>
                  <DialogDescription>
                    Send an invitation to add a new member to your team
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="John Doe"
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="john@example.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={inviteForm.role} onValueChange={(value) => {
                      // Auto-set permissions based on role
                      let newPermissions = { ...inviteForm.permissions };
                      if (value === 'admin') {
                        newPermissions = {
                          orders: ['view', 'edit'],
                          inventory: ['view', 'edit'],
                          vendors: ['view', 'edit'],
                          accounts: ['view', 'edit'],
                          payments: ['view']
                        };
                      } else if (value === 'manager') {
                        newPermissions = {
                          orders: ['view', 'edit'],
                          inventory: ['view', 'edit'],
                          vendors: ['view'],
                          accounts: ['view'],
                          payments: ['view']
                        };
                      } else {
                        newPermissions = {
                          orders: ['view'],
                          inventory: ['view'],
                          vendors: ['view'],
                          accounts: [],
                          payments: []
                        };
                      }
                      setInviteForm({ ...inviteForm, role: value, permissions: newPermissions });
                    }}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="member">Member - Basic access</SelectItem>
                        <SelectItem value="manager">Manager - Can edit most areas</SelectItem>
                        <SelectItem value="admin">Admin - Full access</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {/* Access Control Section */}
                  <div className="space-y-3 pt-4 border-t">
                    <Label className="flex items-center gap-2">
                      <Shield className="h-4 w-4" />
                      Access Permissions
                    </Label>
                    <div className="space-y-3">
                      {[
                        { key: 'orders', label: 'Orders', description: 'View and manage eBay orders' },
                        { key: 'inventory', label: 'Inventory', description: 'Manage product inventory' },
                        { key: 'vendors', label: 'Vendors', description: 'Manage vendor relationships' },
                        { key: 'accounts', label: 'Accounts', description: 'Manage eBay accounts' },
                        { key: 'payments', label: 'Payments', description: 'View payment information' }
                      ].map((module) => (
                        <div key={module.key} className="flex items-center justify-between p-3 border rounded-md">
                          <div className="flex-1">
                            <p className="text-sm font-medium">{module.label}</p>
                            <p className="text-xs text-muted-foreground">{module.description}</p>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              variant={inviteForm.permissions[module.key]?.includes('view') ? 'default' : 'outline'}
                              size="sm"
                              onClick={() => {
                                const perms = [...(inviteForm.permissions[module.key] || [])];
                                if (perms.includes('view')) {
                                  // Remove view (and edit if exists)
                                  setInviteForm({
                                    ...inviteForm,
                                    permissions: {
                                      ...inviteForm.permissions,
                                      [module.key]: []
                                    }
                                  });
                                } else {
                                  // Add view
                                  setInviteForm({
                                    ...inviteForm,
                                    permissions: {
                                      ...inviteForm.permissions,
                                      [module.key]: ['view']
                                    }
                                  });
                                }
                              }}
                            >
                              <Eye className="h-3 w-3 mr-1" />
                              View
                            </Button>
                            <Button
                              type="button"
                              variant={inviteForm.permissions[module.key]?.includes('edit') ? 'default' : 'outline'}
                              size="sm"
                              disabled={!inviteForm.permissions[module.key]?.includes('view')}
                              onClick={() => {
                                const perms = [...(inviteForm.permissions[module.key] || [])];
                                if (perms.includes('edit')) {
                                  // Remove edit
                                  setInviteForm({
                                    ...inviteForm,
                                    permissions: {
                                      ...inviteForm.permissions,
                                      [module.key]: ['view']
                                    }
                                  });
                                } else {
                                  // Add edit (ensure view is also included)
                                  setInviteForm({
                                    ...inviteForm,
                                    permissions: {
                                      ...inviteForm.permissions,
                                      [module.key]: ['view', 'edit']
                                    }
                                  });
                                }
                              }}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
                  <Button onClick={handleInviteMember}>Send Invitation</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* Edit Member Dialog */}
            {editingMember && (
              <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Edit Team Member Access</DialogTitle>
                    <DialogDescription>
                      Manage permissions for {editingMember.name}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-role">Role</Label>
                      <Select
                        value={editingMember.role}
                        onValueChange={(value) => {
                          // Auto-set permissions based on role
                          let newPermissions = { ...editingMember.permissions };
                          if (value === 'admin') {
                            newPermissions = {
                              orders: ['view', 'edit'],
                              inventory: ['view', 'edit'],
                              vendors: ['view', 'edit'],
                              accounts: ['view', 'edit'],
                              payments: ['view']
                            };
                          } else if (value === 'manager') {
                            newPermissions = {
                              orders: ['view', 'edit'],
                              inventory: ['view', 'edit'],
                              vendors: ['view'],
                              accounts: ['view'],
                              payments: ['view']
                            };
                          } else {
                            newPermissions = {
                              orders: ['view'],
                              inventory: ['view'],
                              vendors: ['view'],
                              accounts: [],
                              payments: []
                            };
                          }
                          setEditingMember({ ...editingMember, role: value, permissions: newPermissions });
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="member">Member - Basic access</SelectItem>
                          <SelectItem value="manager">Manager - Can edit most areas</SelectItem>
                          <SelectItem value="admin">Admin - Full access</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Access Control Section */}
                    <div className="space-y-3 pt-4 border-t">
                      <Label className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Access Permissions
                      </Label>
                      <div className="space-y-3">
                        {[
                          { key: 'orders', label: 'Orders', description: 'View and manage eBay orders' },
                          { key: 'inventory', label: 'Inventory', description: 'Manage product inventory' },
                          { key: 'vendors', label: 'Vendors', description: 'Manage vendor relationships' },
                          { key: 'accounts', label: 'Accounts', description: 'Manage eBay accounts' },
                          { key: 'payments', label: 'Payments', description: 'View payment information' }
                        ].map((module) => (
                          <div key={module.key} className="flex items-center justify-between p-3 border rounded-md">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{module.label}</p>
                              <p className="text-xs text-muted-foreground">{module.description}</p>
                            </div>
                            <div className="flex gap-2">
                              <Button
                                type="button"
                                variant={editingMember.permissions[module.key]?.includes('view') ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => {
                                  const perms = [...(editingMember.permissions[module.key] || [])];
                                  if (perms.includes('view')) {
                                    // Remove view (and edit if exists)
                                    setEditingMember({
                                      ...editingMember,
                                      permissions: {
                                        ...editingMember.permissions,
                                        [module.key]: []
                                      }
                                    });
                                  } else {
                                    // Add view
                                    setEditingMember({
                                      ...editingMember,
                                      permissions: {
                                        ...editingMember.permissions,
                                        [module.key]: ['view']
                                      }
                                    });
                                  }
                                }}
                              >
                                <Eye className="h-3 w-3 mr-1" />
                                View
                              </Button>
                              <Button
                                type="button"
                                variant={editingMember.permissions[module.key]?.includes('edit') ? 'default' : 'outline'}
                                size="sm"
                                disabled={!editingMember.permissions[module.key]?.includes('view')}
                                onClick={() => {
                                  const perms = [...(editingMember.permissions[module.key] || [])];
                                  if (perms.includes('edit')) {
                                    // Remove edit
                                    setEditingMember({
                                      ...editingMember,
                                      permissions: {
                                        ...editingMember.permissions,
                                        [module.key]: ['view']
                                      }
                                    });
                                  } else {
                                    // Add edit (ensure view is also included)
                                    setEditingMember({
                                      ...editingMember,
                                      permissions: {
                                        ...editingMember.permissions,
                                        [module.key]: ['view', 'edit']
                                      }
                                    });
                                  }
                                }}
                              >
                                <Edit className="h-3 w-3 mr-1" />
                                Edit
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button>
                    <Button onClick={handleUpdateMember}>Save Changes</Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            )}

            {/* Permissions Matrix (for Pro/Enterprise) */}
            {currentPlan !== "personal" && (
              <Card>
                <CardHeader>
                  <CardTitle>Permission Modules</CardTitle>
                  <CardDescription>
                    Control what team members can view and edit
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { name: "Orders", description: "View and manage eBay orders" },
                      { name: "Inventory", description: "Manage product inventory" },
                      { name: "Vendors", description: "Manage vendor relationships" },
                      { name: "Accounts", description: "Manage eBay accounts" },
                      { name: "Payments", description: "View and track payments" },
                    ].map((module) => (
                      <div
                        key={module.name}
                        className="flex items-center justify-between p-4 border rounded-lg"
                      >
                        <div>
                          <p className="font-medium">{module.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {module.description}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">View</Badge>
                          <Badge variant="outline">Edit</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
