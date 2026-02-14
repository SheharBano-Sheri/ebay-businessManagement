"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Users,
  Store,
  CheckCircle,
  XCircle,
  Clock,
  Ban,
  CheckCheck,
  Shield,
} from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function MasterAdminDashboard() {
  const router = useRouter();
  const { data: session, status } = useSession();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [selectedAction, setSelectedAction] = useState(null);

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
      return;
    }

    if (status === "authenticated" && session?.user?.role !== "master_admin") {
      router.push("/dashboard");
      toast.error("Access denied. Master admin privileges required.");
      return;
    }

    if (status === "authenticated") {
      fetchData();
    }
  }, [status, session, router]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [usersRes, vendorsRes] = await Promise.all([
        fetch("/api/admin/users"),
        fetch("/api/admin/vendors"),
      ]);

      if (usersRes.ok) {
        const usersData = await usersRes.json();
        // FIX: Handle API returning direct array or object wrapper
        const usersList = Array.isArray(usersData)
          ? usersData
          : usersData.users || [];
        setUsers(usersList);
      }

      if (vendorsRes.ok) {
        const vendorsData = await vendorsRes.json();
        // FIX: Handle API returning direct array or object wrapper
        const vendorsList = Array.isArray(vendorsData)
          ? vendorsData
          : vendorsData.vendors || [];
        setVendors(vendorsList);
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load data");
    } finally {
      setLoading(false);
    }
  };

  const handleApproveUser = async (userId) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/approve`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success("User plan approved successfully");
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to approve user");
      }
    } catch (error) {
      console.error("Error approving user:", error);
      toast.error("Failed to approve user");
    }
    setSelectedAction(null);
  };

  const handleRejectUser = async (userId) => {
    try {
      const response = await fetch(`/api/admin/users/${userId}/reject`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success("User plan rejected");
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to reject user");
      }
    } catch (error) {
      console.error("Error rejecting user:", error);
      toast.error("Failed to reject user");
    }
    setSelectedAction(null);
  };

  const handleBlockUser = async (userId, block) => {
    try {
      console.log("Blocking/Unblocking user:", { userId, block });
      const response = await fetch(`/api/admin/users/${userId}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ block }),
      });

      const data = await response.json();
      console.log("Block response:", data);

      if (response.ok) {
        toast.success(
          block ? "User blocked successfully" : "User unblocked successfully",
        );
        fetchData();
      } else {
        toast.error(data.error || "Failed to update user status");
      }
    } catch (error) {
      console.error("Error updating user:", error);
      toast.error("Failed to update user status");
    }
    setSelectedAction(null);
  };

  const handleApproveVendor = async (vendorId) => {
    try {
      const response = await fetch(`/api/admin/vendors/${vendorId}/approve`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Vendor approved successfully");
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to approve vendor");
      }
    } catch (error) {
      console.error("Error approving vendor:", error);
      toast.error("Failed to approve vendor");
    }
    setSelectedAction(null);
  };

  const handleRejectVendor = async (vendorId) => {
    try {
      const response = await fetch(`/api/admin/vendors/${vendorId}/reject`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success("Vendor rejected");
        fetchData();
      } else {
        const data = await response.json();
        toast.error(data.error || "Failed to reject vendor");
      }
    } catch (error) {
      console.error("Error rejecting vendor:", error);
      toast.error("Failed to reject vendor");
    }
    setSelectedAction(null);
  };

  const getPlanBadge = (plan, approvalStatus) => {
    const safePlan = plan || "personal";
    const planColors = {
      personal: "bg-green-500",
      enterprise: "bg-blue-500",
      premium: "bg-purple-500",
      invited: "bg-gray-500",
      team_member: "bg-gray-500",
    };

    return (
      <div className="flex items-center gap-2">
        <Badge className={planColors[safePlan] || "bg-gray-500"}>
          {safePlan.toUpperCase()}
        </Badge>
        {approvalStatus === "pending" && (
          <Badge
            variant="outline"
            className="text-orange-500 border-orange-500"
          >
            <Clock className="h-3 w-3 mr-1" />
            PENDING
          </Badge>
        )}
      </div>
    );
  };

  const getStatusBadge = (isActive) => {
    return isActive ? (
      <Badge className="bg-green-500">Active</Badge>
    ) : (
      <Badge className="bg-red-500">Inactive</Badge>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    );
  }

  // Filter logic
  const pendingUsers = users.filter((u) => u.planApprovalStatus === "pending");
  const activeUsers = users.filter((u) => {
    const isApproved =
      u.planApprovalStatus === "approved" ||
      u.membershipPlan === "personal" ||
      !u.planApprovalStatus;
    return isApproved && u.isActive;
  });
  const blockedUsers = users.filter(
    (u) => !u.isActive && u.planApprovalStatus !== "pending",
  );

  const pendingVendors = vendors.filter((v) => v.approvalStatus === "pending");

  return (
    <SidebarProvider>
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold flex items-center gap-2">
                    <Shield className="h-8 w-8" />
                    Master Admin Panel
                  </h1>
                  <p className="text-muted-foreground mt-1">
                    Manage users, plans, and vendor approvals
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">
                      Pending Approvals
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {pendingUsers.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Enterprise plans waiting
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">
                      Active Users
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {activeUsers.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Approved and active
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">
                      Pending Vendors
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {pendingVendors.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Awaiting approval
                    </p>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm font-medium">
                      Blocked Users
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {blockedUsers.length}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Inactive accounts
                    </p>
                  </CardContent>
                </Card>
              </div>

              <Tabs defaultValue="users" className="space-y-4">
                <TabsList>
                  <TabsTrigger
                    value="users"
                    className="flex items-center gap-2"
                  >
                    <Users className="h-4 w-4" />
                    Users Management
                  </TabsTrigger>
                  <TabsTrigger
                    value="vendors"
                    className="flex items-center gap-2"
                  >
                    <Store className="h-4 w-4" />
                    Vendors Management
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="users" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>All Users</CardTitle>
                      <CardDescription>
                        Manage user accounts, approve Enterprise plans, and
                        control access
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Plan</TableHead>
                            <TableHead>Role</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {users.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={6}
                                className="text-center text-muted-foreground"
                              >
                                No users found
                              </TableCell>
                            </TableRow>
                          ) : (
                            users.map((user) => (
                              <TableRow key={user._id}>
                                <TableCell className="font-medium">
                                  {user.name}
                                </TableCell>
                                <TableCell>{user.email}</TableCell>
                                <TableCell>
                                  {getPlanBadge(
                                    user.membershipPlan,
                                    user.planApprovalStatus,
                                  )}
                                </TableCell>
                                <TableCell>
                                  <Badge variant="outline">{user.role}</Badge>
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(user.isActive)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    {user.planApprovalStatus === "pending" && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="default"
                                          onClick={() =>
                                            setSelectedAction({
                                              type: "approve",
                                              userId: user._id,
                                              userName: user.name,
                                            })
                                          }
                                        >
                                          <CheckCircle className="h-4 w-4 mr-1" />
                                          Approve
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() =>
                                            setSelectedAction({
                                              type: "reject",
                                              userId: user._id,
                                              userName: user.name,
                                            })
                                          }
                                        >
                                          <XCircle className="h-4 w-4 mr-1" />
                                          Reject
                                        </Button>
                                      </>
                                    )}
                                    {user.role !== "master_admin" &&
                                      user.planApprovalStatus !== "pending" && (
                                        <Button
                                          size="sm"
                                          variant={
                                            user.isActive
                                              ? "outline"
                                              : "default"
                                          }
                                          onClick={() =>
                                            setSelectedAction({
                                              type: user.isActive
                                                ? "block"
                                                : "unblock",
                                              userId: user._id,
                                              userName: user.name,
                                            })
                                          }
                                        >
                                          {user.isActive ? (
                                            <>
                                              <Ban className="h-4 w-4 mr-1" />
                                              Block
                                            </>
                                          ) : (
                                            <>
                                              <CheckCheck className="h-4 w-4 mr-1" />
                                              Unblock
                                            </>
                                          )}
                                        </Button>
                                      )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="vendors" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle>All Vendors</CardTitle>
                      <CardDescription>
                        Manage vendor accounts and approvals
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Vendor Name</TableHead>
                            <TableHead>Email</TableHead>
                            <TableHead>Type</TableHead>
                            <TableHead>Approval Status</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Actions</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {vendors.length === 0 ? (
                            <TableRow>
                              <TableCell
                                colSpan={6}
                                className="text-center text-muted-foreground"
                              >
                                No vendors found
                              </TableCell>
                            </TableRow>
                          ) : (
                            vendors.map((vendor) => (
                              <TableRow key={vendor._id}>
                                <TableCell className="font-medium">
                                  {vendor.name}
                                </TableCell>
                                <TableCell>{vendor.email || "N/A"}</TableCell>
                                <TableCell>
                                  <Badge variant="outline">
                                    {vendor.vendorType === "public"
                                      ? "Public"
                                      : "Private"}
                                  </Badge>
                                </TableCell>
                                <TableCell>
                                  {vendor.approvalStatus === "pending" && (
                                    <Badge
                                      variant="outline"
                                      className="text-orange-500 border-orange-500"
                                    >
                                      <Clock className="h-3 w-3 mr-1" />
                                      Pending
                                    </Badge>
                                  )}
                                  {vendor.approvalStatus === "approved" && (
                                    <Badge className="bg-green-500">
                                      <CheckCircle className="h-3 w-3 mr-1" />
                                      Approved
                                    </Badge>
                                  )}
                                  {vendor.approvalStatus === "rejected" && (
                                    <Badge className="bg-red-500">
                                      <XCircle className="h-3 w-3 mr-1" />
                                      Rejected
                                    </Badge>
                                  )}
                                </TableCell>
                                <TableCell>
                                  {getStatusBadge(vendor.isActive)}
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    {vendor.approvalStatus === "pending" && (
                                      <>
                                        <Button
                                          size="sm"
                                          variant="default"
                                          onClick={() =>
                                            setSelectedAction({
                                              type: "approve-vendor",
                                              vendorId: vendor._id,
                                              vendorName: vendor.name,
                                            })
                                          }
                                        >
                                          <CheckCircle className="h-4 w-4 mr-1" />
                                          Approve
                                        </Button>
                                        <Button
                                          size="sm"
                                          variant="destructive"
                                          onClick={() =>
                                            setSelectedAction({
                                              type: "reject-vendor",
                                              vendorId: vendor._id,
                                              vendorName: vendor.name,
                                            })
                                          }
                                        >
                                          <XCircle className="h-4 w-4 mr-1" />
                                          Reject
                                        </Button>
                                      </>
                                    )}
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))
                          )}
                        </TableBody>
                      </Table>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>

              {/* Confirmation Dialog */}
              <AlertDialog
                open={!!selectedAction}
                onOpenChange={() => setSelectedAction(null)}
              >
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>
                      {selectedAction?.type === "approve" &&
                        "Approve User Plan"}
                      {selectedAction?.type === "reject" && "Reject User Plan"}
                      {selectedAction?.type === "block" && "Block User"}
                      {selectedAction?.type === "unblock" && "Unblock User"}
                      {selectedAction?.type === "approve-vendor" &&
                        "Approve Vendor"}
                      {selectedAction?.type === "reject-vendor" &&
                        "Reject Vendor"}
                    </AlertDialogTitle>
                    <AlertDialogDescription>
                      {selectedAction?.type === "approve" &&
                        `Are you sure you want to approve the Enterprise plan for ${selectedAction.userName}? The user will gain access to their account.`}
                      {selectedAction?.type === "reject" &&
                        `Are you sure you want to reject the plan request from ${selectedAction.userName}? They will not be able to access the system.`}
                      {selectedAction?.type === "block" &&
                        `Are you sure you want to block ${selectedAction.userName}? They will lose access to their account.`}
                      {selectedAction?.type === "unblock" &&
                        `Are you sure you want to unblock ${selectedAction.userName}? They will regain access to their account.`}
                      {selectedAction?.type === "approve-vendor" &&
                        `Are you sure you want to approve ${selectedAction.vendorName}? They will gain access to the vendor portal.`}
                      {selectedAction?.type === "reject-vendor" &&
                        `Are you sure you want to reject ${selectedAction.vendorName}? They will not be able to access the vendor portal.`}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={() => {
                        if (selectedAction?.type === "approve") {
                          handleApproveUser(selectedAction.userId);
                        } else if (selectedAction?.type === "reject") {
                          handleRejectUser(selectedAction.userId);
                        } else if (selectedAction?.type === "block") {
                          handleBlockUser(selectedAction.userId, true);
                        } else if (selectedAction?.type === "unblock") {
                          handleBlockUser(selectedAction.userId, false);
                        } else if (selectedAction?.type === "approve-vendor") {
                          handleApproveVendor(selectedAction.vendorId);
                        } else if (selectedAction?.type === "reject-vendor") {
                          handleRejectVendor(selectedAction.vendorId);
                        }
                      }}
                    >
                      Confirm
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
