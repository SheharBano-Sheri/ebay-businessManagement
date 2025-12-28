"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { Search, Plus, Building2, CheckCircle, Mail, UserPlus, Eye, Settings } from "lucide-react";

export default function VendorsPage() {
  const [publicVendors, setPublicVendors] = useState([]);
  const [myVendors, setMyVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteForm, setInviteForm] = useState({
    email: '',
    name: '',
    businessName: '',
    description: ''
  });

  useEffect(() => {
    fetchVendors();
  }, []);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      
      // Fetch public vendors (marketplace)
      const publicResponse = await fetch("/api/vendors?type=public");
      const publicData = await publicResponse.json();
      
      // Fetch all vendors
      const allResponse = await fetch("/api/vendors");
      const allData = await allResponse.json();
      
      if (publicResponse.ok) {
        // Only show public vendors that haven't been added yet
        setPublicVendors(publicData.vendors.filter(v => v.vendorType === 'public'));
      }
      
      if (allResponse.ok) {
        // Show private, virtual vendors AND public vendors that user has added
        setMyVendors(allData.vendors.filter(v => 
          v.vendorType !== 'public' || v.isAddedByCurrentUser === true
        ));
      }
    } catch (error) {
      toast.error("Failed to fetch vendors");
    } finally {
      setLoading(false);
    }
  };

  const handleInviteVendor = async () => {
    if (!inviteForm.email || !inviteForm.name) {
      toast.error('Please fill in name and email');
      return;
    }

    try {
      const response = await fetch('/api/vendors/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(inviteForm)
      });

      const data = await response.json();

      if (response.ok) {
        toast.success('Vendor invited successfully!');
        setIsInviteOpen(false);
        setInviteForm({ email: '', name: '', businessName: '', description: '' });
        fetchVendors();
      } else {
        toast.error(data.error || 'Failed to invite vendor');
      }
    } catch (error) {
      toast.error('Error inviting vendor');
    }
  };

  const addVendorToAccount = async (vendorId) => {
    try {
      // This creates a private copy/link of the public vendor for the admin
      const response = await fetch("/api/vendors", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // Link to existing public vendor
          linkedVendorId: vendorId,
          vendorType: "private",
        }),
      });

      if (response.ok) {
        toast.success("Vendor added to your account!");
        fetchVendors();
      } else {
        toast.error("Failed to add vendor");
      }
    } catch (error) {
      toast.error("An error occurred");
    }
  };

  const handleEditVendor = (vendor) => {
    toast.info(`Edit functionality for ${vendor.name} - Coming soon!`);
    // TODO: Implement edit functionality
  };

  const handleViewProducts = (vendor) => {
    // Navigate to vendor inventory page instead of showing popup
    window.location.href = `/dashboard/vendors/${vendor._id}/inventory`;
  };

  const filteredPublicVendors = publicVendors.filter((vendor) =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredMyVendors = myVendors.filter((vendor) =>
    vendor.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
                <h1 className="text-3xl font-bold tracking-tight">Vendors</h1>
                <p className="text-muted-foreground">
                  Browse marketplace vendors and manage your vendor relationships
                </p>
              </div>
            </div>

            {/* Search */}
            <Card className="p-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search vendors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </Card>

            {/* Tabs */}
            <Tabs defaultValue="marketplace" className="w-full">
              <TabsList>
                <TabsTrigger value="marketplace">Marketplace</TabsTrigger>
                <TabsTrigger value="my-vendors">My Vendors</TabsTrigger>
              </TabsList>

              <TabsContent value="marketplace" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loading ? (
                    <p>Loading vendors...</p>
                  ) : filteredPublicVendors.length === 0 ? (
                    <Card className="col-span-full">
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No public vendors found</p>
                      </CardContent>
                    </Card>
                  ) : (
                    filteredPublicVendors.map((vendor) => (
                      <Card key={vendor._id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle>{vendor.name}</CardTitle>
                              <CardDescription className="mt-1">
                                {vendor.email || "No email provided"}
                              </CardDescription>
                            </div>
                            <Badge variant="secondary">Public</Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {vendor.description || "No description available"}
                          </p>
                          {vendor.website && (
                            <p className="text-sm text-primary mt-2">{vendor.website}</p>
                          )}
                          {vendor.followerCount > 0 && (
                            <p className="text-xs text-muted-foreground mt-3">
                              {vendor.followerCount} {vendor.followerCount === 1 ? 'user has' : 'users have'} added this vendor
                            </p>
                          )}
                        </CardContent>
                        <CardFooter>
                          <Button
                            className="w-full"
                            onClick={() => addVendorToAccount(vendor._id)}
                            disabled={vendor.isAddedByCurrentUser}
                            variant={vendor.isAddedByCurrentUser ? "secondary" : "default"}
                          >
                            {vendor.isAddedByCurrentUser ? (
                              <>
                                <CheckCircle className="mr-2 h-4 w-4" />
                                Already Added
                              </>
                            ) : (
                              <>
                                <Plus className="mr-2 h-4 w-4" />
                                Add to My Vendors
                              </>
                            )}
                          </Button>
                        </CardFooter>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>

              <TabsContent value="my-vendors" className="space-y-4 mt-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {loading ? (
                    <p>Loading your vendors...</p>
                  ) : filteredMyVendors.length === 0 ? (
                    <Card className="col-span-full">
                      <CardContent className="flex flex-col items-center justify-center py-12">
                        <Building2 className="h-12 w-12 text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">
                          You haven't added any vendors yet
                        </p>
                        <p className="text-sm text-muted-foreground mt-2">
                          Browse the marketplace to add vendors
                        </p>
                      </CardContent>
                    </Card>
                  ) : (
                    filteredMyVendors.map((vendor) => (
                      <Card key={vendor._id} className="hover:shadow-lg transition-shadow">
                        <CardHeader>
                          <div className="flex items-start justify-between">
                            <div>
                              <CardTitle>{vendor.name}</CardTitle>
                              <CardDescription className="mt-1">
                                {vendor.email || "No email provided"}
                              </CardDescription>
                            </div>
                            <Badge
                              variant={
                                vendor.vendorType === "virtual"
                                  ? "default"
                                  : "secondary"
                              }
                            >
                              {vendor.vendorType === "virtual" ? "Self" : "Private"}
                            </Badge>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <p className="text-sm text-muted-foreground line-clamp-3">
                            {vendor.description || "No description available"}
                          </p>
                          {vendor.notes && (
                            <div className="mt-2 p-2 bg-muted rounded text-sm">
                              <strong>Notes:</strong> {vendor.notes}
                            </div>
                          )}
                        </CardContent>
                        <CardFooter>
                          <Button 
                            variant="outline" 
                            className="w-full"
                            onClick={() => handleViewProducts(vendor)}
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            View Products
                          </Button>
                        </CardFooter>
                      </Card>
                    ))
                  )}
                </div>
              </TabsContent>
            </Tabs>

            {/* Invite Vendor Dialog */}
            <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Invite Vendor</DialogTitle>
                  <DialogDescription>
                    Send an invitation to a vendor to join the marketplace
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="vendor-name">Contact Name</Label>
                    <Input
                      id="vendor-name"
                      placeholder="John Doe"
                      value={inviteForm.name}
                      onChange={(e) => setInviteForm({ ...inviteForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="vendor-email">Email</Label>
                    <Input
                      id="vendor-email"
                      type="email"
                      placeholder="vendor@example.com"
                      value={inviteForm.email}
                      onChange={(e) => setInviteForm({ ...inviteForm, email: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="business-name">Business Name (Optional)</Label>
                    <Input
                      id="business-name"
                      placeholder="ABC Supplies Co."
                      value={inviteForm.businessName}
                      onChange={(e) => setInviteForm({ ...inviteForm, businessName: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Input
                      id="description"
                      placeholder="Brief description of the vendor"
                      value={inviteForm.description}
                      onChange={(e) => setInviteForm({ ...inviteForm, description: e.target.value })}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsInviteOpen(false)}>Cancel</Button>
                  <Button onClick={handleInviteVendor}>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Invitation
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
