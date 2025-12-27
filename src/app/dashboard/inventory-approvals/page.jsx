"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Package, CheckCircle, XCircle, AlertCircle } from "lucide-react";

export default function InventoryApprovalsPage() {
  const { data: session } = useSession();
  const [pendingProducts, setPendingProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (session?.user?.role === 'master_admin') {
      fetchPendingProducts();
    }
  }, [session]);

  const fetchPendingProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/admin/inventory-approvals');
      const data = await response.json();
      
      if (response.ok) {
        setPendingProducts(data.products || []);
      } else {
        toast.error('Failed to load pending products');
      }
    } catch (error) {
      toast.error('Error loading pending products');
    } finally {
      setLoading(false);
    }
  };

  const handleSelectProduct = (productId) => {
    setSelectedProducts(prev => {
      if (prev.includes(productId)) {
        return prev.filter(id => id !== productId);
      } else {
        return [...prev, productId];
      }
    });
  };

  const handleSelectAll = () => {
    if (selectedProducts.length === pendingProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(pendingProducts.map(p => p._id));
    }
  };

  const handleApprove = async () => {
    if (selectedProducts.length === 0) {
      toast.error('Please select at least one product');
      return;
    }

    try {
      setProcessing(true);
      const response = await fetch('/api/admin/inventory-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: selectedProducts,
          action: 'approve'
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setSelectedProducts([]);
        fetchPendingProducts();
      } else {
        toast.error(data.error || 'Failed to approve products');
      }
    } catch (error) {
      toast.error('Error approving products');
    } finally {
      setProcessing(false);
    }
  };

  const handleReject = async () => {
    if (selectedProducts.length === 0) {
      toast.error('Please select at least one product');
      return;
    }

    try {
      setProcessing(true);
      const response = await fetch('/api/admin/inventory-approvals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productIds: selectedProducts,
          action: 'reject'
        })
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setSelectedProducts([]);
        fetchPendingProducts();
      } else {
        toast.error(data.error || 'Failed to reject products');
      }
    } catch (error) {
      toast.error('Error rejecting products');
    } finally {
      setProcessing(false);
    }
  };

  if (session?.user?.role !== 'master_admin') {
    return (
      <SidebarProvider>
        <AppSidebar variant="inset" />
        <SidebarInset>
          <SiteHeader />
          <div className="flex flex-1 items-center justify-center p-4">
            <Card className="max-w-md">
              <CardHeader>
                <CardTitle>Access Denied</CardTitle>
                <CardDescription>
                  Only master administrators can access this page
                </CardDescription>
              </CardHeader>
            </Card>
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
          <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Inventory Approvals</h1>
                <p className="text-muted-foreground">
                  Review and approve inventory items from public vendors
                </p>
              </div>
              {selectedProducts.length > 0 && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={handleReject}
                    disabled={processing}
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject ({selectedProducts.length})
                  </Button>
                  <Button
                    onClick={handleApprove}
                    disabled={processing}
                  >
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Approve ({selectedProducts.length})
                  </Button>
                </div>
              )}
            </div>

            {/* Stats Card */}
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-orange-500" />
                    <div>
                      <p className="text-2xl font-bold">{pendingProducts.length}</p>
                      <p className="text-sm text-muted-foreground">Pending Approval</p>
                    </div>
                  </div>
                  {pendingProducts.length > 0 && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleSelectAll}
                    >
                      {selectedProducts.length === pendingProducts.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Products List */}
            {loading ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <p className="text-muted-foreground">Loading pending products...</p>
                </CardContent>
              </Card>
            ) : pendingProducts.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No pending products to review</p>
                  <p className="text-sm text-muted-foreground mt-2">
                    All inventory items have been approved or there are no new submissions
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                {pendingProducts.map((product) => (
                  <Card key={product._id} className="hover:shadow-md transition-shadow">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <Checkbox
                          checked={selectedProducts.includes(product._id)}
                          onCheckedChange={() => handleSelectProduct(product._id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-lg">{product.name}</h3>
                                <Badge variant="secondary">Pending</Badge>
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                SKU: {product.sku}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-medium">{product.currency} {product.unitCost}</p>
                              <p className="text-sm text-muted-foreground">Stock: {product.stock}</p>
                            </div>
                          </div>
                          
                          {product.description && (
                            <p className="text-sm mt-3 text-muted-foreground">
                              {product.description}
                            </p>
                          )}

                          <div className="flex items-center gap-4 mt-4 pt-4 border-t">
                            <div>
                              <p className="text-sm font-medium">Vendor</p>
                              <p className="text-sm text-muted-foreground">
                                {product.vendorId?.name || 'Unknown'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Added By</p>
                              <p className="text-sm text-muted-foreground">
                                {product.addedBy?.name || product.addedBy?.email || 'Unknown'}
                              </p>
                            </div>
                            <div>
                              <p className="text-sm font-medium">Added On</p>
                              <p className="text-sm text-muted-foreground">
                                {new Date(product.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
