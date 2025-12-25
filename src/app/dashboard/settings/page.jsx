"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession, signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { User, Mail, Building2, CreditCard, Bell, Shield, LogOut, Users } from "lucide-react";

function SettingsContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [vendorNotification, setVendorNotification] = useState(null);
  const defaultTab = searchParams.get('tab') || 'account';
  
  // Security states
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  useEffect(() => {
    if (session?.user?.role === 'public_vendor') {
      fetchVendorNotifications();
    }
  }, [session, defaultTab]);

  const fetchVendorNotifications = async () => {
    try {
      const response = await fetch("/api/vendors/notifications");
      const data = await response.json();
      if (response.ok && data.followerCount > 0) {
        setVendorNotification(data);
      }
    } catch (error) {
      console.error("Failed to fetch vendor notifications");
    }
  };

  const fetchActiveSessions = async () => {
    try {
      setLoadingSessions(true);
      const response = await fetch('/api/auth/sessions');
      const data = await response.json();
      if (response.ok) {
        

    if (passwordForm.newPassword.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Password changed successfully');
        setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        toast.error(data.error || 'Failed to change password');
      }
    } catch (error) {
      toast.error('Error changing password');
    } finally {
      setLoading(false);
    }
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      const response = await fetch(`/api/auth/sessions?sessionId=${sessionId}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('Session revoked successfully');
        fetchActiveSessions();
      } else {
        toast.error('Failed to revoke session');
      }
    } catch (error) {
      toast.error('Error revoking session');
    }
  };

  const handleRevokeAllSessions = async () => {
    try {
      const response = await fetch('/api/auth/sessions?action=all', {
        method: 'DELETE'
      });

      if (response.ok) {
        toast.success('All other sessions revoked');
        fetchActiveSessions();
      } else {
        toast.error('Failed to revoke sessions');
      }
    } catch (error) {
      toast.er  <TabsTrigger value="account">Account</TabsTrigger>
                <TabsTrigger value="billing">Billing</TabsTrigger>
                <TabsTrigger value="notifications">Notifications</TabsTrigger>
                <TabsTrigger value="security">Security</TabsTrigger>
              </TabsList>

              {/* Account Tab */}
              <TabsContent value="account" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Profile Information</CardTitle>
                    <CardDescription>
                      Update your account details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name</Label>
                      <Input
                        id="name"
                        defaultValue={session?.user?.name}
                        disabled
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        defaultValue={session?.user?.email}
                        disabled
                      />
                      <p className="text-xs text-muted-foreground">
                        Email cannot be changed at this time
                      </p>
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Label>Membership Plan</Label>
                      <div className="flex items-center gap-2">
                        <Badge variant="default" className="capitalize">
                          {session?.user?.membershipPlan || 'Personal'}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600">Danger Zone</CardTitle>
                    <CardDescription>
                      Irreversible actions
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">Sign Out</p>
                        <p className="text-sm text-muted-foreground">
                          Sign out of your account
                        </p>
                      </div>
                      <Button 
                        variant="outline" 
                        onClick={handleLogout}
                        className="gap-2"
                      >
                        <LogOut className="h-4 w-4" />
                        Sign Out
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Billing Tab */}
              <TabsContent value="billing" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Billing Information</CardTitle>
                    <CardDescription>
                      Manage your subscription and billing details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center py-8 text-muted-foreground">
                      <CreditCard className="h-12 w-12 mx-auto mb-2 opacity-50" />
                      <p>Billing settings coming soon</p>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle>Notifications</CardTitle>
                    <CardDescription>
                      View your recent notifications and activity
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {session?.user?.role === 'public_vendor' ? (
                      <div className="space-y-4">
                        {vendorNotification ? (
                          <Alert className="bg-primary/10 border-primary/20">
                            <Users className="h-4 w-4" />
                            <AlertDescription>
                              <strong>{vendorNotification.followerCount}</strong> {vendorNotification.followerCount === 1 ? 'user has' : 'users have'} added you as a vendor!
                            </AlertDescription>
                          </Alert>
                        ) : (
                          <div className="text-center py-8 text-muted-foreground">
                            <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                            <p>No notifications yet</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-center py-8 text-muted-foreground">
                        <Bell className="h-12 w-12 mx-auto mb-2 opacity-50" />
                        <p>No notifications yet</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Security Tab */}
              <TabsContent value="security" className="space-y-4">
                {/* Change Password */}
                <Card>
                  <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                    <CardDescription>
                      Update your password to keep your account secure
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleChangePassword} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="current-password">Current Password</Label>
                        <Input
                          id="current-password"
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, currentPassword: e.target.value })}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
                          required
                        />
                        <p className="text-xs text-muted-foreground">
                          Must be at least 6 characters
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Confirm New Password</Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
                          required
                        />
                      </div>
                      <Button type="submit" disabled={loading}>
                        {loading ? 'Changing Password...' : 'Change Password'}
                      </Button>
                    </form>
                  </CardContent>
                </Card>

                {/* Active Sessions */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Active Sessions</CardTitle>
                        <CardDescription>
                          Manage your active login sessions
                        </CardDescription>
                      </div>
                      {activeSessions.length > 1 && (
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={handleRevokeAllSessions}
                        >
                          Revoke All Others
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {loadingSessions ? (
                      <p className="text-sm text-muted-foreground">Loading sessions...</p>
                    ) : activeSessions.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No active sessions found</p>
                    ) : (
                      <div className="space-y-4">
                        {activeSessions.map((sess) => (
                          <div key={sess._id} className="flex items-start justify-between p-4 border rounded-lg">
                            <div className="flex items-start gap-3">
                              <div className="mt-1">
                                {sess.device === 'Mobile' ? (
