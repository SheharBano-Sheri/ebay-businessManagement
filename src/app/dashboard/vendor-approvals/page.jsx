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
import { toast } from "sonner";
import { CheckCircle, XCircle, Clock, UserCheck } from "lucide-react";
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
  const [loading, setLoading] = useState(true);
  const [selectedVendor, setSelectedVendor] = useState(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState(null);
  const [processing, setProcessing] = useState(false);

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
      const response = await fetch("/api/admin/pending-vendors");
      const data = await response.json();

      if (response.ok) {
        setVendors(data.vendors || []);
      } else {
        toast.error(data.error || "Failed to fetch pending vendors");
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
    setActionDialogOpen(true);
  };

  const confirmAction = async () => {
    if (!selectedVendor || !actionType) return;

    try {
      setProcessing(true);
      const response = await fetch("/api/admin/approve-vendor", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          vendorId: selectedVendor._id,
          action: actionType,
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
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                  <UserCheck className="h-8 w-8 text-primary" />
                  Vendor Approvals
                </h1>
                <p className="text-muted-foreground">
                  Review and approve pending public vendor registrations
                </p>
              </div>
              <Badge variant="outline" className="text-lg px-4 py-2">
                <Clock className="h-4 w-4 mr-2" />
                {vendors.length} Pending
              </Badge>
            </div>

            {/* Pending Vendors Table */}
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
                : `Are you sure you want to reject "${selectedVendor?.name}"? They will not be able to sign in.`}
            </DialogDescription>
          </DialogHeader>
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
