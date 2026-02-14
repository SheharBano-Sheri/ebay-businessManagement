"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
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
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import { SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import {
  Loader2,
  CheckCircle,
  ShieldAlert,
  UserCheck,
  ShieldCheck,
} from "lucide-react";

export default function UserApprovalsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  // 1. Fetch Users on Load
  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    } else if (session?.user?.role !== "master_admin") {
      router.push("/dashboard");
    } else {
      fetchUsers();
    }
  }, [status, session, router]);

  const fetchUsers = async () => {
    try {
      const response = await fetch("/api/admin/users");
      if (response.ok) {
        const data = await response.json();
        setUsers(data);
      } else {
        toast.error("Failed to fetch users");
      }
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("An error occurred while fetching users");
    } finally {
      setLoading(false);
    }
  };

  // 2. Handle Approval Action
  const handleApproveUser = async (userId) => {
    setActionLoading(userId);
    try {
      const response = await fetch(`/api/admin/users/${userId}/approve`, {
        method: "POST",
      });

      if (response.ok) {
        toast.success("User approved successfully");
        // Update local state
        setUsers((prevUsers) =>
          prevUsers.map((user) =>
            user._id === userId
              ? {
                  ...user,
                  planApprovalStatus: "approved",
                  isActive: true,
                  vendorApprovalStatus: "approved",
                }
              : user,
          ),
        );
      } else {
        const error = await response.json();
        toast.error(error.error || "Failed to approve user");
      }
    } catch (error) {
      console.error("Error approving user:", error);
      toast.error("An error occurred");
    } finally {
      setActionLoading(null);
    }
  };

  if (status === "loading" || loading) {
    return (
      <SidebarInset>
        <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </SidebarInset>
    );
  }

  // 3. Filters
  // Pending: Shows anyone waiting for approval (Enterprise or Public Vendor)
  const pendingUsers = users.filter(
    (user) =>
      user.planApprovalStatus === "pending" ||
      (user.role === "public_vendor" &&
        user.vendorApprovalStatus === "pending"),
  );

  // Approved: STRICTLY filters for Enterprise users who are NOT Master Admin
  const approvedUsers = users.filter(
    (user) =>
      user.planApprovalStatus === "approved" && // Must be approved
      user.membershipPlan === "enterprise" && // Must be Enterprise Plan
      user.role !== "master_admin", // Must NOT be Master Admin
  );

  return (
    <SidebarInset>
      <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-[[data-collapsible=icon]]/sidebar-wrapper:h-12">
        <div className="flex items-center gap-2 px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="mr-2 h-4" />
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink href="/dashboard">Dashboard</BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>User Approvals</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        </div>
      </header>

      <div className="flex flex-1 flex-col gap-4 p-4 pt-0">
        <div className="flex items-center justify-between space-y-2">
          <h2 className="text-3xl font-bold tracking-tight">User Approvals</h2>
        </div>

        <Tabs defaultValue="pending" className="space-y-4">
          <TabsList>
            <TabsTrigger value="pending" className="relative">
              Pending
              {pendingUsers.length > 0 && (
                <span className="ml-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-[10px] font-medium text-white">
                  {pendingUsers.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="approved">Approved</TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Pending Account Requests</CardTitle>
                <CardDescription>
                  Approve Enterprise plans and Public Vendor accounts here.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {pendingUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                    <ShieldAlert className="h-10 w-10 mb-2 opacity-20" />
                    <p>No pending approvals found.</p>
                  </div>
                ) : (
                  <UsersTable
                    users={pendingUsers}
                    actionLoading={actionLoading}
                    onApprove={handleApproveUser}
                    isPending={true}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="approved">
            <Card>
              <CardHeader>
                <CardTitle>Approved Enterprise Accounts</CardTitle>
                <CardDescription>View active Enterprise users.</CardDescription>
              </CardHeader>
              <CardContent>
                {approvedUsers.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-10 text-center text-muted-foreground">
                    <ShieldCheck className="h-10 w-10 mb-2 opacity-20" />
                    <p>No approved Enterprise users found.</p>
                  </div>
                ) : (
                  <UsersTable
                    users={approvedUsers}
                    actionLoading={actionLoading}
                    onApprove={handleApproveUser}
                    isPending={false}
                  />
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </SidebarInset>
  );
}

function UsersTable({ users, actionLoading, onApprove, isPending }) {
  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Plan</TableHead>
            <TableHead>Status</TableHead>
            {isPending && <TableHead className="text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {users.map((user) => (
            <TableRow key={user._id}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell className="capitalize">
                {user.role?.replace("_", " ")}
              </TableCell>
              <TableCell className="capitalize">
                {user.membershipPlan}
              </TableCell>
              <TableCell>
                <Badge
                  variant={isPending ? "outline" : "secondary"}
                  className={
                    isPending
                      ? "text-yellow-600 border-yellow-200 bg-yellow-50"
                      : "bg-green-100 text-green-800 hover:bg-green-200"
                  }
                >
                  {isPending ? "Pending Approval" : "Approved"}
                </Badge>
              </TableCell>
              {isPending && (
                <TableCell className="text-right">
                  <Button
                    size="sm"
                    onClick={() => onApprove(user._id)}
                    disabled={actionLoading === user._id}
                    className="bg-green-600 hover:bg-green-700 text-white"
                  >
                    {actionLoading === user._id ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="mr-2 h-4 w-4" />
                    )}
                    Approve
                  </Button>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
