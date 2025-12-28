"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, ShoppingCart, Package, ArrowLeft, Link as LinkIcon } from "lucide-react";
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
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function VendorInventoryPage() {
  const params = useParams();
  const router = useRouter();
  const vendorId = params.vendorId;
  
  const [vendor, setVendor] = useState(null);
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [showProductLibrary, setShowProductLibrary] = useState(false);
  const [searchedSku, setSearchedSku] = useState("");
  const [mappingProduct, setMappingProduct] = useState(null);

  useEffect(() => {
    fetchVendorAndProducts();
  }, [vendorId]);

  useEffect(() => {
    // Filter products by SKU when search term changes
    if (searchTerm.trim() === "") {
      setFilteredProducts(products);
    } else {
      handleSkuSearch(searchTerm);
    }
  }, [searchTerm, products]);

  const handleSkuSearch = async (sku) => {
    const searchLower = sku.toLowerCase();
    
    // First, try to match vendor SKU directly
    const directMatch = products.filter((product) =>
      product.sku.toLowerCase().includes(searchLower)
    );
    
    if (directMatch.length > 0) {
      setFilteredProducts(directMatch);
      return;
    }
    
    // If no direct match, check for SKU mapping
    try {
      const response = await fetch(`/api/sku-mapping?userSku=${encodeURIComponent(sku)}&vendorId=${vendorId}`);
      const data = await response.json();
      
      if (response.ok && data.mapping) {
        // Found a mapping, filter by the mapped product
        const mappedProduct = products.find(p => p._id === data.mapping.productId);
        if (mappedProduct) {
          setFilteredProducts([mappedProduct]);
          toast.success(`Found mapped product: ${mappedProduct.name}`);
          return;
        }
      }
    } catch (error) {
      console.error("Error checking SKU mapping:", error);
    }
    
    // No match found - show product library for manual selection
    setSearchedSku(sku);
    setShowProductLibrary(true);
    setFilteredProducts([]);
  };

  const handleMapProduct = async (product) => {
    try {
      const response = await fetch('/api/sku-mapping', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userSku: searchedSku,
          vendorId: vendorId,
          productId: product._id,
          vendorSku: product.sku
        })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        toast.success(`SKU "${searchedSku}" mapped to "${product.name}"`);
        setShowProductLibrary(false);
        setFilteredProducts([product]);
      } else {
        toast.error(data.error || "Failed to create SKU mapping");
      }
    } catch (error) {
      console.error("Error creating SKU mapping:", error);
      toast.error("Error creating SKU mapping");
    }
  };

  const fetchVendorAndProducts = async () => {
    try {
      setLoading(true);
      
      // Fetch vendor details
      const vendorResponse = await fetch(`/api/vendors?id=${vendorId}`);
      const vendorData = await vendorResponse.json();
      
      if (vendorResponse.ok && vendorData.vendor) {
        setVendor(vendorData.vendor);
      } else {
        toast.error("Vendor not found");
        router.push("/dashboard/vendors");
        return;
      }
      
      // Fetch vendor's products
      const productsResponse = await fetch(`/api/products?vendorId=${vendorId}`);
      const productsData = await productsResponse.json();
      
      if (productsResponse.ok) {
        // Only show approved products
        const approvedProducts = productsData.products.filter(p => p.approvalStatus === 'approved');
        setProducts(approvedProducts);
        setFilteredProducts(approvedProducts);
      } else {
        toast.error("Failed to load products");
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load vendor inventory");
    } finally {
      setLoading(false);
    }
  };

  const handleBuy = (product) => {
    // Navigate to purchase page
    router.push(`/dashboard/vendors/${vendorId}/purchase/${product._id}`);
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
          <div className="space-y-4">
            {/* Page Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => router.push("/dashboard/vendors")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    {vendor?.name || "Vendor"} - Inventory Products
                  </h1>
                  <p className="text-muted-foreground">
                    Browse and purchase products from this vendor
                  </p>
                </div>
              </div>
            </div>

            {/* Vendor Info Card */}
            {vendor && (
              <Card>
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div>
                      <CardTitle>{vendor.name}</CardTitle>
                      <CardDescription>{vendor.email}</CardDescription>
                    </div>
                    <Badge variant="secondary">
                      {vendor.vendorType === "public" ? "Public" : "Private"}
                    </Badge>
                  </div>
                </CardHeader>
                {vendor.description && (
                  <CardContent>
                    <p className="text-sm text-muted-foreground">{vendor.description}</p>
                  </CardContent>
                )}
              </Card>
            )}

            {/* Search */}
            <Card className="p-4">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </Card>

            {/* Products Table */}
            <Card>
              <CardHeader>
                <CardTitle>Products ({filteredProducts.length})</CardTitle>
                <CardDescription>
                  All available products from this vendor
                </CardDescription>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading products...</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm ? "No products match your search" : "No products available"}
                    </p>
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>SKU</TableHead>
                          <TableHead>Product Name</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead className="text-right">Stock</TableHead>
                          <TableHead className="text-right">Unit Cost</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.map((product) => (
                          <TableRow key={product._id}>
                            <TableCell className="font-medium">{product.sku}</TableCell>
                            <TableCell>{product.name}</TableCell>
                            <TableCell className="max-w-xs truncate">
                              {product.description || "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              {product.stock > 0 ? (
                                <Badge variant="success">{product.stock}</Badge>
                              ) : (
                                <Badge variant="destructive">Out of Stock</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              {product.currency} {product.unitCost.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                onClick={() => handleBuy(product)}
                                disabled={product.stock === 0}
                              >
                                <ShoppingCart className="mr-2 h-4 w-4" />
                                Buy
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Product Library Dialog for SKU Mapping */}
            <Dialog open={showProductLibrary} onOpenChange={setShowProductLibrary}>
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Select Product for SKU "{searchedSku}"</DialogTitle>
                  <DialogDescription>
                    No product found with SKU "{searchedSku}". Please select the correct product to create a mapping.
                  </DialogDescription>
                </DialogHeader>
                
                <div className="mt-4">
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Vendor SKU</TableHead>
                          <TableHead>Product Name</TableHead>
                          <TableHead>Stock</TableHead>
                          <TableHead>Unit Cost</TableHead>
                          <TableHead className="text-right">Action</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((product) => (
                          <TableRow key={product._id}>
                            <TableCell className="font-medium">{product.sku}</TableCell>
                            <TableCell>{product.name}</TableCell>
                            <TableCell>
                              <Badge variant={product.stock > 0 ? "success" : "destructive"}>
                                {product.stock}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {product.currency} {product.unitCost.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleMapProduct(product)}
                              >
                                <LinkIcon className="mr-2 h-4 w-4" />
                                Map to "{searchedSku}"
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
