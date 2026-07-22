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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Mail,
  CreditCard,
  Bell,
  LogOut,
  Users,
  Store,
  RefreshCw,
  Link2,
  Unlink,
  CheckCircle2,
  XCircle,
  Loader2,
  ShoppingBag,
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

  // eBay Integration state
  const [accounts, setAccounts] = useState([]);
  const [selectedAccountId, setSelectedAccountId] = useState("");
  const [syncingEbay, setSyncingEbay] = useState(false);
  const [disconnectingEbay, setDisconnectingEbay] = useState(false);
  const [syncResult, setSyncResult] = useState(null);

  useEffect(() => {
    fetchAccounts();
  }, []);

  useEffect(() => {
    if (searchParams.get("ebay_connected") === "1") {
      toast.success("eBay Account connected successfully!");
      const url = new URL(window.location.href);
      url.searchParams.delete("ebay_connected");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
    }
  }, [searchParams]);

  const fetchAccounts = async () => {
    try {
      const res = await fetch("/api/accounts");
      const data = await res.json();
      if (res.ok && data.accounts) {
        setAccounts(data.accounts);
        if (data.accounts.length > 0 && !selectedAccountId) {
          setSelectedAccountId(data.accounts[0]._id);
        }
      }
    } catch (err) {
      console.error("Failed to fetch accounts:", err);
    }
  };

  const selectedAccount = accounts.find((acc) => acc._id === selectedAccountId) || accounts[0];

  const handleConnectEbay = (accId) => {
    const id = accId || selectedAccountId;
    if (!id) {
      toast.error("Please select or create an account first");
      return;
    }
    window.location.href = `/api/ebay/connect?accountId=${id}`;
  };

  const handleDisconnectEbay = async (accId) => {
    const id = accId || selectedAccountId;
    if (!id) return;
    setDisconnectingEbay(true);
    try {
      const res = await fetch("/api/ebay/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: id }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("eBay account disconnected successfully");
        await fetchAccounts();
      } else {
        toast.error(data.error || "Failed to disconnect account");
      }
    } catch (err) {
      toast.error("Error disconnecting eBay account");
    } finally {
      setDisconnectingEbay(false);
    }
  };

  const handleSyncEbay = async (accId) => {
    const id = accId || selectedAccountId;
    if (!id) {
      toast.error("Please select an account first");
      return;
    }
    setSyncingEbay(true);
    setSyncResult(null);
    try {
      const res = await fetch("/api/orders/sync-ebay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId: id, daysBack: 30 }),
      });
      const data = await res.json();
      if (res.ok) {
        const msg = data.message || `Imported ${data.imported || 0} new orders, updated ${data.updated || 0} existing orders`;
        setSyncResult({ type: "success", message: msg, details: data });
        toast.success(msg);
      } else {
        const errMsg = data.error || "Failed to sync orders from eBay";
        setSyncResult({ type: "error", message: errMsg });
        toast.error(errMsg);
      }
    } catch (err) {
      const errMsg = "Error syncing with eBay: " + err.message;
      setSyncResult({ type: "error", message: errMsg });
      toast.error(errMsg);
    } finally {
      setSyncingEbay(false);
    }
  };

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
                <TabsTrigger value="ebay">eBay Integration</TabsTrigger>
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

              {/* eBay Integration Tab */}
              <TabsContent value="ebay" className="space-y-4">
                {/* Account selector */}
                {accounts.length > 1 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <ShoppingBag className="h-5 w-5" />
                        Select Account
                      </CardTitle>
                      <CardDescription>
                        Choose which eBay seller account to manage
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                        <SelectTrigger className="w-full max-w-xs">
                          <SelectValue placeholder="Select an account" />
                        </SelectTrigger>
                        <SelectContent>
                          {accounts.map((acc) => (
                            <SelectItem key={acc._id} value={acc._id}>
                              {acc.accountName} {acc.ebayUsername ? `(${acc.ebayUsername})` : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </CardContent>
                  </Card>
                )}

                {/* Connection Status Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Link2 className="h-5 w-5" />
                      eBay Account Connection
                    </CardTitle>
                    <CardDescription>
                      Connect your eBay seller account to enable live order sync
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {accounts.length === 0 ? (
                      <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                        <XCircle className="h-5 w-5 text-amber-600 shrink-0" />
                        <div>
                          <p className="font-medium text-amber-800 dark:text-amber-300">No accounts found</p>
                          <p className="text-sm text-muted-foreground">
                            Please create an eBay account first in the{" "}
                            <a href="/dashboard/accounts" className="underline text-primary">Accounts</a> page.
                          </p>
                        </div>
                      </div>
                    ) : selectedAccount?.ebayRefreshToken ? (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4">
                          <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0" />
                          <div className="flex-1">
                            <p className="font-medium text-emerald-800 dark:text-emerald-300">eBay account connected</p>
                            {selectedAccount?.ebayUsername && (
                              <p className="text-sm text-muted-foreground">Username: {selectedAccount.ebayUsername}</p>
                            )}
                            {selectedAccount?.ebayConnectedAt && (
                              <p className="text-xs text-muted-foreground">
                                Connected {new Date(selectedAccount.ebayConnectedAt).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="gap-2 text-destructive hover:bg-destructive/10 border-destructive/30"
                            disabled={disconnectingEbay}
                            onClick={() => handleDisconnectEbay(selectedAccount?._id)}
                          >
                            {disconnectingEbay ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Unlink className="h-4 w-4" />
                            )}
                            {disconnectingEbay ? "Disconnecting..." : "Disconnect"}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="flex items-center gap-3 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
                          <XCircle className="h-5 w-5 text-amber-600 shrink-0" />
                          <div>
                            <p className="font-medium text-amber-800 dark:text-amber-300">Not connected</p>
                            <p className="text-sm text-muted-foreground">
                              Authorize GenieBMS to access your eBay seller data
                            </p>
                          </div>
                        </div>
                        <Button
                          className="gap-2"
                          onClick={() => handleConnectEbay(selectedAccount?._id)}
                        >
                          <Link2 className="h-4 w-4" />
                          Connect eBay Account
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Sync Orders Card */}
                {selectedAccount?.ebayRefreshToken && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <RefreshCw className="h-5 w-5" />
                        Sync Orders from eBay
                      </CardTitle>
                      <CardDescription>
                        Pull the latest orders and transaction data from eBay into GenieBMS (last 30 days)
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {syncResult && (
                        <Alert className={syncResult.type === "success"
                          ? "border-emerald-500/30 bg-emerald-500/10"
                          : "border-destructive/30 bg-destructive/10"
                        }>
                          {syncResult.type === "success" ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <XCircle className="h-4 w-4 text-destructive" />
                          )}
                          <AlertDescription className={syncResult.type === "success"
                            ? "text-emerald-800 dark:text-emerald-300"
                            : "text-destructive"
                          }>
                            {syncResult.message}
                            {syncResult.type === "success" && syncResult.details && (
                              <span className="block text-xs text-muted-foreground mt-1">
                                Skipped: {syncResult.details.skipped || 0} · Errors: {syncResult.details.errors || 0}
                              </span>
                            )}
                          </AlertDescription>
                        </Alert>
                      )}
                      <Button
                        onClick={() => handleSyncEbay(selectedAccount?._id)}
                        disabled={syncingEbay}
                        className="gap-2"
                      >
                        {syncingEbay ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                        {syncingEbay ? "Syncing orders from eBay..." : "Sync Now"}
                      </Button>
                    </CardContent>
                  </Card>
                )}
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
