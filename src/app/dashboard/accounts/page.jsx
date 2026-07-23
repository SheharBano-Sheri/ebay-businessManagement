"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Plus, Edit, Trash2, CreditCard, Link2, Unlink, RefreshCw, CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Returns a human-readable relative label for an ebayLastSyncedAt timestamp.
 * e.g. "just now", "5 minutes ago", "3 hours ago", "2 days ago".
 * Returns "Never" when the value is null/undefined.
 */
function formatLastSynced(date) {
  if (!date) return 'Never';
  const diffMs      = Date.now() - new Date(date).getTime();
  const diffMinutes = Math.floor(diffMs / 60_000);
  const diffHours   = Math.floor(diffMs / 3_600_000);
  const diffDays    = Math.floor(diffMs / 86_400_000);
  if (diffMinutes < 1)   return 'just now';
  if (diffMinutes < 60)  return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  if (diffHours   < 24)  return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
}

function AccountsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [syncingAccountId, setSyncingAccountId] = useState(null);
  const [disconnectingAccountId, setDisconnectingAccountId] = useState(null);

  const [formData, setFormData] = useState({
    accountName: "",
    defaultCurrency: "USD",
    ebayUsername: "",
    apiKey: "",
  });

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchAccounts();
    }
  }, [status]);

  useEffect(() => {
    if (searchParams?.get("ebay_connected") === "1") {
      toast.success("eBay Account connected successfully!");
      const url = new URL(window.location.href);
      url.searchParams.delete("ebay_connected");
      window.history.replaceState({}, "", url.pathname + (url.search ? url.search : ""));
    }
  }, [searchParams]);

  const fetchAccounts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/accounts");
      const data = await response.json();
      
      if (response.ok) {
        setAccounts(data.accounts || []);
      } else {
        toast.error(data.error || "Failed to fetch accounts");
      }
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
      toast.error("Failed to fetch accounts");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch("/api/accounts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Account added successfully!");
        setIsAddDialogOpen(false);
        setFormData({
          accountName: "",
          defaultCurrency: "USD",
          ebayUsername: "",
          apiKey: "",
        });
        fetchAccounts(); // Refresh the list
      } else {
        toast.error(data.error || "Failed to add account");
      }
    } catch (error) {
      console.error("Error adding account:", error);
      toast.error("Failed to add account");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const handleEdit = (account) => {
    setEditingAccount(account);
    setFormData({
      accountName: account.accountName,
      defaultCurrency: account.defaultCurrency,
      ebayUsername: account.ebayUsername || "",
      apiKey: account.apiKey || "",
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    
    try {
      const response = await fetch("/api/accounts", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          _id: editingAccount._id,
          ...formData,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Account updated successfully!");
        setIsEditDialogOpen(false);
        setEditingAccount(null);
        setFormData({
          accountName: "",
          defaultCurrency: "USD",
          ebayUsername: "",
          apiKey: "",
        });
        fetchAccounts(); // Refresh the list
      } else {
        toast.error(data.error || "Failed to update account");
      }
    } catch (error) {
      console.error("Error updating account:", error);
      toast.error("Failed to update account");
    }
  };

  const handleDelete = async (accountId) => {
    try {
      const response = await fetch(`/api/accounts?id=${accountId}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Account deleted successfully!");
        fetchAccounts(); // Refresh the list
      } else {
        toast.error(data.error || "Failed to delete account");
      }
    } catch (error) {
      console.error("Error deleting account:", error);
      toast.error("Failed to delete account");
    }
  };

  const handleConnect = (accountId) => {
    window.location.href = `/api/ebay/connect?accountId=${accountId}`;
  };

  const handleDisconnect = async (accountId) => {
    setDisconnectingAccountId(accountId);
    try {
      const res = await fetch("/api/ebay/disconnect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId }),
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
      setDisconnectingAccountId(null);
    }
  };

  const handleSyncNow = async (accountId) => {
    setSyncingAccountId(accountId);
    try {
      const res = await fetch("/api/orders/sync-ebay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accountId, daysBack: 30 }),
      });
      const data = await res.json();
      if (res.ok) {
        const msg = data.message || `Imported ${data.imported || 0} new orders, updated ${data.updated || 0} existing orders`;
        toast.success(msg);
      } else {
        toast.error(data.error || "Failed to sync orders from eBay");
      }
    } catch (err) {
      toast.error("Error syncing with eBay: " + err.message);
    } finally {
      setSyncingAccountId(null);
    }
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
  }

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
                <h1 className="text-3xl font-bold tracking-tight">eBay Accounts</h1>
                <p className="text-muted-foreground">
                  Manage your eBay seller accounts and their settings
                </p>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Account
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <form onSubmit={handleSubmit}>
                    <DialogHeader>
                      <DialogTitle>Add New eBay Account</DialogTitle>
                      <DialogDescription>
                        Connect a new eBay seller account to your dashboard
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="accountName">Account Name *</Label>
                        <Input
                          id="accountName"
                          name="accountName"
                          placeholder="e.g., Main Store"
                          value={formData.accountName}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="ebayUsername">eBay Username</Label>
                        <Input
                          id="ebayUsername"
                          name="ebayUsername"
                          placeholder="your-ebay-username"
                          value={formData.ebayUsername}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="defaultCurrency">Default Currency *</Label>
                        <Select
                          value={formData.defaultCurrency}
                          onValueChange={(value) =>
                            setFormData({ ...formData, defaultCurrency: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="USD">USD - US Dollar</SelectItem>
                            <SelectItem value="EUR">EUR - Euro</SelectItem>
                            <SelectItem value="GBP">GBP - British Pound</SelectItem>
                            <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                            <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="apiKey">API Key (Optional)</Label>
                        <Input
                          id="apiKey"
                          name="apiKey"
                          type="password"
                          placeholder="Enter eBay API key"
                          value={formData.apiKey}
                          onChange={handleChange}
                        />
                        <p className="text-xs text-muted-foreground">
                          For advanced integrations only
                        </p>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Add Account</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Edit Account Dialog */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent>
                <form onSubmit={handleUpdate}>
                  <DialogHeader>
                    <DialogTitle>Edit eBay Account</DialogTitle>
                    <DialogDescription>
                      Update your eBay seller account information
                    </DialogDescription>
                  </DialogHeader>
                  <div className="grid gap-4 py-4">
                    <div className="space-y-2">
                      <Label htmlFor="edit-accountName">Account Name *</Label>
                      <Input
                        id="edit-accountName"
                        name="accountName"
                        placeholder="e.g., Main Store"
                        value={formData.accountName}
                        onChange={handleChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-ebayUsername">eBay Username</Label>
                      <Input
                        id="edit-ebayUsername"
                        name="ebayUsername"
                        placeholder="your-ebay-username"
                        value={formData.ebayUsername}
                        onChange={handleChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-defaultCurrency">Default Currency *</Label>
                      <Select
                        value={formData.defaultCurrency}
                        onValueChange={(value) =>
                          setFormData({ ...formData, defaultCurrency: value })
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="USD">USD - US Dollar</SelectItem>
                          <SelectItem value="EUR">EUR - Euro</SelectItem>
                          <SelectItem value="GBP">GBP - British Pound</SelectItem>
                          <SelectItem value="CAD">CAD - Canadian Dollar</SelectItem>
                          <SelectItem value="AUD">AUD - Australian Dollar</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="edit-apiKey">API Key (Optional)</Label>
                      <Input
                        id="edit-apiKey"
                        name="apiKey"
                        type="password"
                        placeholder="Enter eBay API key"
                        value={formData.apiKey}
                        onChange={handleChange}
                      />
                      <p className="text-xs text-muted-foreground">
                        For advanced integrations only
                      </p>
                    </div>
                  </div>
                  <DialogFooter>
                    <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">Update Account</Button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {/* Accounts Table */}
            <Card className="border-2 shadow-lg">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-primary/10 to-primary/5 border-b-2">
                      <TableHead className="font-bold border-r">ACCOUNT NAME</TableHead>
                      <TableHead className="font-bold border-r">EBAY USERNAME</TableHead>
                      <TableHead className="font-bold border-r">DEFAULT CURRENCY</TableHead>
                      <TableHead className="font-bold border-r">EBAY INTEGRATION</TableHead>
                      <TableHead className="font-bold">ACTIONS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                            <span className="text-muted-foreground">Loading accounts...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : accounts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <CreditCard className="h-12 w-12 opacity-50" />
                            <p className="text-lg font-medium">No accounts added yet</p>
                            <p className="text-sm">
                              Add your first eBay account to get started
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      accounts.map((account, index) => (
                        <TableRow 
                          key={account._id}
                          className={`hover:bg-muted/50 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
                        >
                          <TableCell className="font-semibold border-r text-primary">
                            {account.accountName}
                          </TableCell>
                          <TableCell className="border-r font-medium">{account.ebayUsername || "-"}</TableCell>
                          <TableCell className="border-r">
                            <span className="font-mono font-semibold text-blue-600 dark:text-blue-400">{account.defaultCurrency}</span>
                          </TableCell>
                          <TableCell className="border-r">
                            {account.ebayRefreshToken ? (
                              account.needsReconnect ? (
                                /* ── Reconnect Required state ── */
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center gap-2">
                                    <Badge className="bg-amber-500/15 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 text-xs">
                                      <AlertTriangle className="h-3 w-3" />
                                      Reconnect Required
                                    </Badge>
                                    <Button
                                      size="sm"
                                      className="h-8 gap-1 text-xs bg-amber-600 hover:bg-amber-700 text-white"
                                      onClick={() => handleConnect(account._id)}
                                    >
                                      <Link2 className="h-3 w-3" />
                                      Reconnect
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 text-xs text-destructive hover:bg-destructive/10"
                                      disabled={disconnectingAccountId === account._id}
                                      onClick={() => handleDisconnect(account._id)}
                                    >
                                      {disconnectingAccountId === account._id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Unlink className="h-3 w-3" />
                                      )}
                                      Disconnect
                                    </Button>
                                  </div>
                                  <p className="text-xs text-amber-700 dark:text-amber-400">
                                    eBay token expired — re-authorise to resume auto-sync.
                                  </p>
                                </div>
                              ) : (
                                /* ── Connected state ── */
                                <div className="flex flex-col gap-1.5">
                                  <div className="flex items-center gap-2">
                                    <Badge className="bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 border-emerald-500/30 gap-1 text-xs">
                                      <CheckCircle2 className="h-3 w-3" />
                                      Connected
                                    </Badge>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="h-8 gap-1 text-xs"
                                      disabled={syncingAccountId === account._id}
                                      onClick={() => handleSyncNow(account._id)}
                                    >
                                      {syncingAccountId === account._id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <RefreshCw className="h-3 w-3" />
                                      )}
                                      Sync Now
                                    </Button>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 text-xs text-destructive hover:bg-destructive/10"
                                      disabled={disconnectingAccountId === account._id}
                                      onClick={() => handleDisconnect(account._id)}
                                    >
                                      {disconnectingAccountId === account._id ? (
                                        <Loader2 className="h-3 w-3 animate-spin" />
                                      ) : (
                                        <Unlink className="h-3 w-3" />
                                      )}
                                      Disconnect
                                    </Button>
                                  </div>
                                  <p className="text-xs text-muted-foreground">
                                    Last synced: {formatLastSynced(account.ebayLastSyncedAt)}
                                  </p>
                                </div>
                              )
                            ) : (
                              /* ── Not Connected state ── */
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30 gap-1 text-xs">
                                  <XCircle className="h-3 w-3" />
                                  Not Connected
                                </Badge>
                                <Button
                                  size="sm"
                                  className="h-8 gap-1 text-xs bg-blue-600 hover:bg-blue-700 text-white"
                                  onClick={() => handleConnect(account._id)}
                                >
                                  <Link2 className="h-3 w-3" />
                                  Connect eBay
                                </Button>
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="hover:bg-primary/10 hover:text-primary"
                                onClick={() => handleEdit(account)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="hover:bg-destructive/10 hover:text-destructive"
                                onClick={() => handleDelete(account._id)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Info Card */}
            <Card className="p-4 bg-muted">
              <div className="flex gap-4">
                <div className="text-muted-foreground">💡</div>
                <div>
                  <h3 className="font-semibold mb-2">About eBay Integration</h3>
                  <p className="text-sm text-muted-foreground">
                    Connect multiple eBay seller accounts to manage all your stores from one dashboard.
                    Click <strong>Connect eBay</strong> on any account to authorize OAuth access.
                    Once connected, use <strong>Sync Now</strong> to pull live orders and financial data directly from eBay.
                  </p>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function AccountsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    }>
      <AccountsContent />
    </Suspense>
  );
}
