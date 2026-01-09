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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import {
  User,
  Mail,
  CreditCard,
  Bell,
  LogOut,
  Users,
  Store,
} from "lucide-react";

function SettingsContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [vendorNotification, setVendorNotification] = useState(null);
  const defaultTab = searchParams.get("tab") || "account";

  // Vendor Settings State
  const [vendorProfile, setVendorProfile] = useState(null);
  const [vendorRequirements, setVendorRequirements] = useState({
    paymentProof: true,
    shippingLabel: false,
    packingSlip: false,
    instructions: "",
  });
  const [loadingVendor, setLoadingVendor] = useState(false);

  // Security states
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    if (session?.user?.role === "public_vendor") {
      fetchVendorNotifications();
      fetchVendorProfile();
    }
  }, [session]);

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

  const fetchVendorProfile = async () => {
    try {
      const res = await fetch("/api/vendors?own=true");
      const data = await res.json();
      if (data.vendor) {
        setVendorProfile(data.vendor);
        if (data.vendor.requirements) {
          setVendorRequirements({
            paymentProof: data.vendor.requirements.paymentProof ?? true,
            shippingLabel: data.vendor.requirements.shippingLabel ?? false,
            packingSlip: data.vendor.requirements.packingSlip ?? false,
            instructions: data.vendor.requirements.instructions ?? "",
          });
        }
      }
    } catch (error) {
      console.error("Failed to load profile", error);
    }
  };

  const handleSaveVendorSettings = async () => {
    if (!vendorProfile) return;
    setLoadingVendor(true);
    try {
      const res = await fetch("/api/vendors", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: vendorProfile._id,
          requirements: vendorRequirements,
        }),
      });

      if (res.ok) {
        toast.success("Order requirements updated successfully");
      } else {
        toast.error("Failed to update settings");
      }
    } catch (error) {
      toast.error("Error saving settings");
    } finally {
      setLoadingVendor(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }

    if (passwordForm.newPassword.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch("/api/auth/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Password changed successfully");
        setPasswordForm({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      } else {
        // Show specific password validation errors if available
        if (data.details && Array.isArray(data.details) && data.details.length > 0) {
          toast.error(data.error || "Failed to change password");
          data.details.forEach((detail, index) => {
            setTimeout(() => {
              toast.error(detail, { duration: 5000 });
            }, (index + 1) * 100);
          });
        } else {
          toast.error(data.error || "Failed to change password");
        }
      }
    } catch (error) {
      toast.error("Error changing password");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut({ callbackUrl: "/auth/signin" });
    } catch (error) {
      toast.error("Error signing out");
    }
  };

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
          <div className="space-y-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
              <p className="text-muted-foreground">
                Manage your account settings and preferences
              </p>
            </div>

            <Tabs defaultValue={defaultTab} className="space-y-4">
              <TabsList>
                <TabsTrigger value="account">Account</TabsTrigger>
                {session?.user?.role === "public_vendor" && (
                  <TabsTrigger value="vendor">Vendor</TabsTrigger>
                )}
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
                          {session?.user?.membershipPlan || "Personal"}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-red-600">Danger Zone</CardTitle>
                    <CardDescription>Irreversible actions</CardDescription>
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

              {/* Vendor Settings Tab (Only for Public Vendors) */}
              {session?.user?.role === "public_vendor" && (
                <TabsContent value="vendor" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>Order Requirements</CardTitle>
                      <CardDescription>
                        Select what documents customers must provide when
                        placing an order with you.
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="flex items-center justify-between border-b pb-4">
                        <div className="space-y-0.5">
                          <Label className="text-base">Payment Proof</Label>
                          <p className="text-sm text-muted-foreground">
                            Require customers to upload a screenshot of payment.
                          </p>
                        </div>
                        <Checkbox
                          checked={vendorRequirements.paymentProof}
                          disabled={true}
                        />
                      </div>

                      <div className="flex items-center justify-between border-b pb-4">
                        <div className="space-y-0.5">
                          <Label className="text-base">Shipping Label</Label>
                          <p className="text-sm text-muted-foreground">
                            Require customers to provide a shipping label.
                          </p>
                        </div>
                        <Checkbox
                          checked={vendorRequirements.shippingLabel}
                          onCheckedChange={(checked) =>
                            setVendorRequirements((prev) => ({
                              ...prev,
                              shippingLabel: checked,
                            }))
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between border-b pb-4">
                        <div className="space-y-0.5">
                          <Label className="text-base">Packing Slip</Label>
                          <p className="text-sm text-muted-foreground">
                            Require customers to include a packing slip.
                          </p>
                        </div>
                        <Checkbox
                          checked={vendorRequirements.packingSlip}
                          onCheckedChange={(checked) =>
                            setVendorRequirements((prev) => ({
                              ...prev,
                              packingSlip: checked,
                            }))
                          }
                        />
                      </div>

                      <div className="space-y-2">
                        <Label>Additional Instructions</Label>
                        <Textarea
                          placeholder="Enter any specific instructions for your buyers..."
                          value={vendorRequirements.instructions}
                          onChange={(e) =>
                            setVendorRequirements((prev) => ({
                              ...prev,
                              instructions: e.target.value,
                            }))
                          }
                          rows={4}
                        />
                      </div>

                      <Button
                        onClick={handleSaveVendorSettings}
                        disabled={loadingVendor}
                      >
                        {loadingVendor ? "Saving..." : "Save Requirements"}
                      </Button>
                    </CardContent>
                  </Card>
                </TabsContent>
              )}

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
                    {session?.user?.role === "public_vendor" ? (
                      <div className="space-y-4">
                        {vendorNotification ? (
                          <Alert className="bg-primary/10 border-primary/20">
                            <Users className="h-4 w-4" />
                            <AlertDescription>
                              <strong>
                                {vendorNotification.followerCount}
                              </strong>{" "}
                              {vendorNotification.followerCount === 1
                                ? "user has"
                                : "users have"}{" "}
                              added you as a vendor!
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
                        <Label htmlFor="current-password">
                          Current Password
                        </Label>
                        <Input
                          id="current-password"
                          type="password"
                          value={passwordForm.currentPassword}
                          onChange={(e) =>
                            setPasswordForm({
                              ...passwordForm,
                              currentPassword: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="new-password">New Password</Label>
                        <Input
                          id="new-password"
                          type="password"
                          value={passwordForm.newPassword}
                          onChange={(e) =>
                            setPasswordForm({
                              ...passwordForm,
                              newPassword: e.target.value,
                            })
                          }
                          required
                        />
                        <div className="text-xs text-muted-foreground space-y-1 mt-2">
                          <p className="font-medium">Password must contain:</p>
                          <ul className="list-disc list-inside space-y-0.5 ml-1">
                            <li>At least 8 characters</li>
                            <li>At least one special character (!@#$%^&*...)</li>
                            <li>At least one number (recommended)</li>
                            <li>At least one uppercase letter (recommended)</li>
                          </ul>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">
                          Confirm New Password
                        </Label>
                        <Input
                          id="confirm-password"
                          type="password"
                          value={passwordForm.confirmPassword}
                          onChange={(e) =>
                            setPasswordForm({
                              ...passwordForm,
                              confirmPassword: e.target.value,
                            })
                          }
                          required
                        />
                      </div>
                      <Button type="submit" disabled={loading}>
                        {loading ? "Changing Password..." : "Change Password"}
                      </Button>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function SettingsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <p>Loading...</p>
        </div>
      }
    >
      <SettingsContent />
    </Suspense>
  );
}
