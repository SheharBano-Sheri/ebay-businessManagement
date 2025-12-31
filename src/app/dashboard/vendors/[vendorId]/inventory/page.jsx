"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import {
  Search,
  ShoppingCart,
  Package,
  ArrowLeft,
  Link as LinkIcon,
  Info,
  CheckCircle2,
  AlertCircle,
  FileText,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

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
      const response = await fetch(
        `/api/sku-mapping?userSku=${encodeURIComponent(
          sku
        )}&vendorId=${vendorId}`
      );
      const data = await response.json();

      if (response.ok && data.mapping) {
        // Found a mapping, filter by the mapped product
        const mappedProduct = products.find(
          (p) => p._id === data.mapping.productId
        );
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
      const response = await fetch("/api/sku-mapping", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userSku: searchedSku,
          vendorId: vendorId,
          productId: product._id,
          vendorSku: product.sku,
        }),
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

      // Fetch vendor details (Add timestamp to prevent caching)
      const vendorResponse = await fetch(
        `/api/vendors?id=${vendorId}&t=${Date.now()}`
      );
      const vendorData = await vendorResponse.json();

      if (vendorResponse.ok && vendorData.vendor) {
        setVendor(vendorData.vendor);
      } else {
        toast.error("Vendor not found");
        router.push("/dashboard/vendors");
        return;
      }

      // Fetch vendor's products
      const productsResponse = await fetch(
        `/api/products?vendorId=${vendorId}`
      );
      const productsData = await productsResponse.json();

      if (productsResponse.ok) {
        // Only show approved products
        const approvedProducts = productsData.products.filter(
          (p) => p.approvalStatus === "approved"
        );
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

  // --- SAFE REQUIREMENT ACCESSOR ---
  // If vendor.requirements is undefined, default to paymentProof: true
  const finalRequirements = vendor?.requirements || {
    paymentProof: true,
    shippingLabel: false,
    packingSlip: false,
    instructions: "",
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
        <div className="flex flex-1 flex-col p-4 lg:p-6 w-full">
          <div className="space-y-4">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => router.push("/dashboard/vendors")}
                >
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <div>
                  <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                    {vendor?.name || "Vendor"}
                  </h1>
                  <p className="text-sm text-muted-foreground">Inventory</p>
                </div>
              </div>
            </div>

            {/* Vendor Info & Requirements Card */}
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
                <CardContent className="space-y-4">
                  {vendor.description && (
                    <p className="text-sm text-muted-foreground">
                      {vendor.description}
                    </p>
                  )}

                  {/* --- REQUIREMENTS SECTION --- */}
                  <div className="border rounded-xl p-5 bg-card/50 shadow-sm mt-4">
                    <h3 className="text-base font-semibold mb-4 flex items-center gap-2">
                      <div className="h-6 w-6 rounded-md bg-primary/10 flex items-center justify-center">
                        <AlertCircle className="h-4 w-4 text-primary" />
                      </div>
                      Order Requirements
                    </h3>

                    <div className="flex flex-wrap gap-3">
                      {finalRequirements.paymentProof && (
                        <div className="inline-flex items-center gap-2 px-3 py-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-300 border border-green-100 dark:border-green-900 rounded-lg text-sm font-medium shadow-sm">
                          <CheckCircle2 className="h-4 w-4" />
                          Payment Proof
                        </div>
                      )}
                      {finalRequirements.shippingLabel && (
                        <div className="inline-flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 border border-blue-100 dark:border-blue-900 rounded-lg text-sm font-medium shadow-sm">
                          <Package className="h-4 w-4" />
                          Shipping Label
                        </div>
                      )}
                      {finalRequirements.packingSlip && (
                        <div className="inline-flex items-center gap-2 px-3 py-2 bg-purple-50 dark:bg-purple-900/20 text-purple-700 dark:text-purple-300 border border-purple-100 dark:border-purple-900 rounded-lg text-sm font-medium shadow-sm">
                          <FileText className="h-4 w-4" />
                          Packing Slip
                        </div>
                      )}

                      {!finalRequirements.paymentProof &&
                        !finalRequirements.shippingLabel &&
                        !finalRequirements.packingSlip && (
                          <p className="text-sm text-muted-foreground italic">
                            No specific documents required.
                          </p>
                        )}
                    </div>

                    {finalRequirements.instructions && (
                      <div className="mt-4 pt-4 border-t flex gap-3 text-sm text-muted-foreground">
                        <Info className="h-4 w-4 shrink-0 mt-0.5 text-primary" />
                        <div className="space-y-1">
                          <span className="font-medium text-foreground">
                            Vendor Note:
                          </span>
                          <p>{finalRequirements.instructions}</p>
                        </div>
                      </div>
                    )}
                  </div>
                </CardContent>
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

            {/* Products Table - Responsive & Compact */}
            <Card>
              <CardHeader>
                <CardTitle>Products ({filteredProducts.length})</CardTitle>
                <CardDescription>
                  All available products from this vendor
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {loading ? (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground">Loading products...</p>
                  </div>
                ) : filteredProducts.length === 0 ? (
                  <div className="text-center py-8">
                    <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      {searchTerm
                        ? "No products match your search"
                        : "No products available"}
                    </p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[15%] text-xs md:text-sm p-2 md:p-4">
                          SKU
                        </TableHead>
                        <TableHead className="w-[25%] text-xs md:text-sm p-2 md:p-4">
                          Name
                        </TableHead>
                        <TableHead className="w-[25%] text-xs md:text-sm p-2 md:p-4">
                          Desc
                        </TableHead>
                        <TableHead className="w-[10%] text-right text-xs md:text-sm p-2 md:p-4">
                          Stock
                        </TableHead>
                        <TableHead className="w-[15%] text-right text-xs md:text-sm p-2 md:p-4">
                          Cost
                        </TableHead>
                        <TableHead className="w-[10%] text-right text-xs md:text-sm p-2 md:p-4">
                          Action
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredProducts.map((product) => (
                        <TableRow key={product._id}>
                          {/* SKU: break-all ensures it wraps on tiny screens */}
                          <TableCell className="font-medium text-xs md:text-sm p-2 md:p-4 align-top break-all">
                            {product.sku}
                          </TableCell>

                          {/* Name: clamp to 2 lines to prevent vertical explosion */}
                          <TableCell className="text-xs md:text-sm p-2 md:p-4 align-top">
                            <div className="line-clamp-2" title={product.name}>
                              {product.name}
                            </div>
                          </TableCell>

                          {/* Description: Always visible, clamped to 2 lines */}
                          <TableCell className="text-xs md:text-sm p-2 md:p-4 align-top">
                            <div
                              className="line-clamp-2 text-muted-foreground"
                              title={product.description}
                            >
                              {product.description || "-"}
                            </div>
                          </TableCell>

                          {/* Stock: Compact badge */}
                          <TableCell className="text-right p-2 md:p-4 align-top">
                            {product.stock > 0 ? (
                              <Badge
                                variant="success"
                                className="px-1.5 py-0.5 text-[10px] md:text-xs whitespace-nowrap"
                              >
                                {product.stock}
                              </Badge>
                            ) : (
                              <Badge
                                variant="destructive"
                                className="px-1.5 py-0.5 text-[10px] md:text-xs whitespace-nowrap"
                              >
                                0
                              </Badge>
                            )}
                          </TableCell>

                          {/* Cost: Vertical stack on mobile to save width */}
                          <TableCell className="text-right text-xs md:text-sm p-2 md:p-4 align-top">
                            <div className="flex flex-col items-end">
                              <span className="font-semibold">
                                {product.unitCost.toFixed(2)}
                              </span>
                              <span className="text-[10px] text-muted-foreground">
                                {product.currency}
                              </span>
                            </div>
                          </TableCell>

                          {/* Action: Icon button on mobile, Full button on desktop */}
                          <TableCell className="text-right p-2 md:p-4 align-top">
                            <Button
                              size="sm"
                              onClick={() => handleBuy(product)}
                              disabled={product.stock === 0}
                              className="h-8 w-8 p-0 md:h-9 md:w-auto md:px-4"
                            >
                              <ShoppingCart className="h-3.5 w-3.5 md:mr-2" />
                              <span className="hidden md:inline">Buy</span>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            {/* Product Library Dialog for SKU Mapping */}
            <Dialog
              open={showProductLibrary}
              onOpenChange={setShowProductLibrary}
            >
              <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    Select Product for SKU "{searchedSku}"
                  </DialogTitle>
                  <DialogDescription>
                    No product found with SKU "{searchedSku}". Please select the
                    correct product to create a mapping.
                  </DialogDescription>
                </DialogHeader>

                <div className="mt-4">
                  <div className="rounded-md border overflow-hidden">
                    <div className="overflow-x-auto">
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
                              <TableCell className="font-medium whitespace-nowrap">
                                {product.sku}
                              </TableCell>
                              <TableCell>{product.name}</TableCell>
                              <TableCell>
                                <Badge
                                  variant={
                                    product.stock > 0
                                      ? "success"
                                      : "destructive"
                                  }
                                >
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
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
