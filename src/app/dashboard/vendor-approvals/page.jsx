"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, UserCheck, Eye, EyeOff } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function VendorApprovalsContent() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [vendors, setVendors] = useState([]);
  const [approvedVendors, setApprovedVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [autoApproveInventory, setAutoApproveInventory] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated" && session?.user?.role !== "master_admin") {
      toast.error("Access denied - Master Admin only");
      router.push("/dashboard");
      return;
    }

    if (status === "authenticated") {
      fetchPendingVendors();
    }
  }, [status, session, router]);

  const fetchPendingVendors = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/vendor-approvals");
      const data = await response.json();

      if (response.ok) {
        setVendors(data.vendors || []);
      } else {
        toast.error(data.error || "Failed to fetch pending vendors");
      }

      // Fetch approved vendors for the management tab
      const approvedResponse = await fetch("/api/vendors?type=public");
      const approvedData = await approvedResponse.json();
      
      if (approvedResponse.ok) {
        setApprovedVendors(approvedData.vendors.filter(v => v.approvalStatus === 'approved') || []);
      }
    } catch (error) {
      toast.error("An error occurred while fetching vendors");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAction = (vendor, action) => {
    setSelectedVendor(vendor);
    setActionType(action);
    setAutoApproveInventory(false);
    setActionDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!selectedVendor || !actionType) return;

    try {
      setProcessing(true);
      const response = await fetch("/api/admin/vendor-approvals", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vendorId: selectedVendor._id,
          action: actionType,
          autoApproveInventory: actionType === "approve" ? autoApproveInventory : undefined,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        fetchPendingVendors();
        setActionDialogOpen(false);
        setSelectedVendor(null);
        setActionType(null);
      } else {
        toast.error(data.error || "Failed to process request");
      }
    } catch (error) {
      toast.error("An error occurred while processing request");
      console.error(error);
    } finally {
      setProcessing(false);
    }
  };

  const handleHideVendor = async (vendor) => {
    const action = vendor.isHidden ? 'unhide' : 'hide';
    const actionText = vendor.isHidden ? 'unhide' : 'hide';
    
    if (!window.confirm(`Are you sure you want to ${actionText} "${vendor.name}"? ${!vendor.isHidden ? 'This will prevent all users from seeing this vendor.' : 'This will make the vendor visible to users again.'}`)) {
      return;
    }

    try {
      const response = await fetch(`/api/vendors/${vendor._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || `Vendor ${actionText}d successfully`);
        fetchPendingVendors();
      } else {
        toast.error(data.error || `Failed to ${actionText} vendor`);
      }
    } catch (error) {
      toast.error(`An error occurred while ${actionText}ing vendor`);
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  if (status === "loading" || loading) {
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
          <div className="flex flex-1 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
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
            <div>
              <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                <UserCheck className="h-8 w-8 text-primary" />
                Vendor Management
              </h1>
              <p className="text-muted-foreground">
                Review and manage public vendor registrations
              </p>
            </div>

            {/* Tabs for Pending and Approved Vendors */}
            <Tabs defaultValue="pending" className="w-full">
              <TabsList>
                <TabsTrigger value="pending">
                  <Clock className="h-4 w-4 mr-2" />
                  Pending Approvals ({vendors.length})
                </TabsTrigger>
                <TabsTrigger value="approved">
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Approved Vendors ({approvedVendors.length})
                </TabsTrigger>
              </TabsList>

              {/* Pending Vendors Tab */}
              <TabsContent value="pending" className="mt-4">
                <Card className="border-2 shadow-lg">
                  <div className="overflow-x-auto">
                    <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-primary/10 to-primary/5 border-b-2">
                      <TableHead className="font-bold border-r">VENDOR NAME</TableHead>
                      <TableHead className="font-bold border-r">EMAIL</TableHead>
                      <TableHead className="font-bold border-r">TYPE</TableHead>
                      <TableHead className="font-bold border-r">STATUS</TableHead>
                      <TableHead className="font-bold border-r">REQUESTED ON</TableHead>
                      <TableHead className="font-bold">ACTIONS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                            <span className="text-muted-foreground">Loading pending vendors...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : vendors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <CheckCircle className="h-12 w-12 opacity-50 text-green-500" />
                            <p className="text-lg font-medium">No pending vendor requests</p>
                            <p className="text-sm">All vendor applications have been processed</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      vendors.map((vendor, index) => (
                        <TableRow
                          key={vendor._id}
                          className={`hover:bg-muted/50 transition-colors ${
                            index % 2 === 0 ? "bg-background" : "bg-muted/20"
                          }`}
                        >
                          <TableCell className="font-semibold border-r">
                            {vendor.name}
                          </TableCell>
                          <TableCell className="border-r">
                            {vendor.email || vendor.publicVendorUserId?.email || "-"}
                          </TableCell>
                          <TableCell className="border-r">
                            <Badge variant="secondary" className="capitalize">
                              {vendor.vendorType}
                            </Badge>
                          </TableCell>
                          <TableCell className="border-r">
                            <Badge variant="warning" className="capitalize">
                              <Clock className="h-3 w-3 mr-1" />
                              {vendor.approvalStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="border-r text-muted-foreground">
                            {formatDate(vendor.createdAt || vendor.publicVendorUserId?.createdAt)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                size="sm"
                                variant="default"
                                className="bg-green-600 hover:bg-green-700"
                                onClick={() => handleAction(vendor, "approve")}
                              >
                                <CheckCircle className="h-4 w-4 mr-1" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                onClick={() => handleAction(vendor, "reject")}
                              >
                                <XCircle className="h-4 w-4 mr-1" />
                                Reject
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
          </TabsContent>

          {/* Approved Vendors Tab */}
          <TabsContent value="approved" className="mt-4">
            <Card className="border-2 shadow-lg">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50">
                      <TableHead className="font-bold border-r">Name</TableHead>
                      <TableHead className="font-bold border-r">Email</TableHead>
                      <TableHead className="font-bold border-r">Type</TableHead>
                      <TableHead className="font-bold border-r">Status</TableHead>
                      <TableHead className="font-bold border-r">Followers</TableHead>
                      <TableHead className="font-bold">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                            <span className="text-muted-foreground">Loading...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : approvedVendors.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <CheckCircle className="h-12 w-12 opacity-50 text-green-500" />
                            <p className="text-lg font-medium">No approved vendors</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      approvedVendors.map((vendor, index) => (
                        <TableRow
                          key={vendor._id}
                          className={`hover:bg-muted/50 transition-colors ${
                            vendor.isHidden ? "bg-red-50 dark:bg-red-950/20" : 
                            index % 2 === 0 ? "bg-background" : "bg-muted/20"
                          }`}
                        >
                          <TableCell className="font-semibold border-r">
                            {vendor.name}
                            {vendor.isHidden && (
                              <Badge variant="destructive" className="ml-2">
                                <EyeOff className="h-3 w-3 mr-1" />
                                Hidden
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="border-r">
                            {vendor.email || "-"}
                          </TableCell>
                          <TableCell className="border-r">
                            <Badge variant="secondary" className="capitalize">
                              {vendor.vendorType}
                            </Badge>
                          </TableCell>
                          <TableCell className="border-r">
                            <Badge variant="default" className="capitalize bg-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              {vendor.approvalStatus}
                            </Badge>
                          </TableCell>
                          <TableCell className="border-r text-muted-foreground">
                            {vendor.followerCount || 0} users
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant={vendor.isHidden ? "default" : "outline"}
                              onClick={() => handleHideVendor(vendor)}
                            >
                              {vendor.isHidden ? (
                                <>
                                  <Eye className="h-4 w-4 mr-1" />
                                  Unhide
                                </>
                              ) : (
                                <>
                                  <EyeOff className="h-4 w-4 mr-1" />
                                  Hide
                                </>
                              )}
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
          </div>
        </div>
      </SidebarInset>

      {/* Confirmation Dialog */}
      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve Vendor" : "Reject Vendor"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? `Are you sure you want to approve "${selectedVendor?.name}"? This will allow them to sign in and access the system.`
                : `Are you sure you want to reject "${selectedVendor?.name}"? Their account and all associated data will be permanently deleted.`}
            </DialogDescription>
          </DialogHeader>
          
          {actionType === "approve" && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoApproveInventory}
                  onChange={(e) => setAutoApproveInventory(e.target.checked)}
                  className="w-4 h-4 rounded"
                />
                <div>
                  <p className="font-semibold text-gray-900">Auto-Approve Inventory</p>
                  <p className="text-sm text-gray-600">
                    Automatically approve products added by this vendor, saving review time
                  </p>
                </div>
              </label>
            </div>
          )}
          
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setActionDialogOpen(false)}
              disabled={processing}
            >
              Cancel
            </Button>
            <Button
              variant={actionType === "approve" ? "default" : "destructive"}
              onClick={confirmAction}
              disabled={processing}
            >
              {processing ? (
                <>
                  <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent mr-2"></div>
                  Processing...
                </>
              ) : (
                <>
                  {actionType === "approve" ? (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Approve
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4 mr-2" />
                      Reject
                    </>
                  )}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}

export default function VendorApprovalsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      }
    >
      <VendorApprovalsContent />
    </Suspense>
  );
}
