"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, Search, Edit, Trash2, Package, Package2, AlertCircle } from "lucide-react";

function InventoryContent() {
  const { data: session } = useSession();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedType, setSelectedType] = useState("all");
  const [selectedVendor, setSelectedVendor] = useState("all");
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    sku: "",
    name: "",
    description: "",
    type: "",
    vendorId: "",
    stock: 0,
    unitCost: 0,
  });

  useEffect(() => {
    fetchProducts();
    fetchVendors();
    
    // Check if vendor filter is in URL
    const vendorParam = searchParams.get('vendor');
    if (vendorParam) {
      setSelectedVendor(vendorParam);
    }
  }, [searchParams]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/products");
      const data = await response.json();
      
      if (response.ok) {
        setProducts(data.products);
      } else {
        toast.error(data.error || "Failed to fetch products");
      }
    } catch (error) {
      toast.error("An error occurred while fetching products");
    } finally {
      setLoading(false);
    }
  };

  const fetchVendors = async () => {
    try {
      const response = await fetch("/api/vendors");
      const data = await response.json();
      
      if (response.ok) {
        setVendors(data.vendors);
      }
    } catch (error) {
      console.error("Failed to fetch vendors");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Product added successfully!");
        setIsAddDialogOpen(false);
        setFormData({
          sku: "",
          name: "",
          description: "",
          type: "",
          vendorId: "",
          stock: 0,
          unitCost: 0,
        });
        fetchProducts();
      } else {
        toast.error(data.error || "Failed to add product");
      }
    } catch (error) {
      toast.error("An error occurred while adding product");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getStockStatus = (stock) => {
    if (stock === 0) return <Badge variant="destructive">Out of Stock</Badge>;
    if (stock < 10) return <Badge variant="warning">Low Stock</Badge>;
    return <Badge variant="success">In Stock</Badge>;
  };

  const filteredProducts = products.filter((product) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      product.sku.toLowerCase().includes(searchLower) ||
      product.name.toLowerCase().includes(searchLower);
    
    const matchesType = selectedType === "all" || product.type === selectedType;
    const matchesVendor = selectedVendor === "all" || product.vendorId._id === selectedVendor;

    return matchesSearch && matchesType && matchesVendor;
  });

  const uniqueTypes = [...new Set(products.map((p) => p.type).filter(Boolean))];

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
                <h1 className="text-3xl font-bold tracking-tight">Inventory</h1>
                <p className="text-muted-foreground">
                  Manage your product inventory and stock levels
                </p>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Add Product
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <form onSubmit={handleSubmit}>
                    <DialogHeader>
                      <DialogTitle>Add New Product</DialogTitle>
                      <DialogDescription>
                        Add a new product to your inventory
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="sku">SKU *</Label>
                          <Input
                            id="sku"
                            name="sku"
                            value={formData.sku}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="name">Product Name *</Label>
                          <Input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          rows={3}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="type">Type</Label>
                          <Input
                            id="type"
                            name="type"
                            value={formData.type}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="vendorId">Vendor *</Label>
                          <Select
                            value={formData.vendorId}
                            onValueChange={(value) =>
                              setFormData({ ...formData, vendorId: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select vendor" />
                            </SelectTrigger>
                            <SelectContent>
                              {vendors.map((vendor) => (
                                <SelectItem key={vendor._id} value={vendor._id}>
                                  {vendor.name} ({vendor.vendorType})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="stock">Stock Quantity</Label>
                          <Input
                            id="stock"
                            name="stock"
                            type="number"
                            value={formData.stock}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="unitCost">Unit Cost (USD)</Label>
                          <Input
                            id="unitCost"
                            name="unitCost"
                            type="number"
                            step="0.01"
                            value={formData.unitCost}
                            onChange={handleChange}
                          />
                        </div>
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Add Product</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Filters */}
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by SKU or name..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Type</label>
                  <Select value={selectedType} onValueChange={setSelectedType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Types</SelectItem>
                      {uniqueTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Vendor</label>
                  <Select value={selectedVendor} onValueChange={setSelectedVendor}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Vendors</SelectItem>
                      {vendors.map((vendor) => (
                        <SelectItem key={vendor._id} value={vendor._id}>
                          {vendor.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </Card>

            {/* Inventory Table */}
            <Card className="border-2 shadow-lg">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-primary/10 to-primary/5 border-b-2">
                      <TableHead className="font-bold border-r">SKU</TableHead>
                      <TableHead className="font-bold border-r">NAME</TableHead>
                      <TableHead className="font-bold border-r">TYPE</TableHead>
                      <TableHead className="font-bold border-r">VENDOR</TableHead>
                      <TableHead className="text-right font-bold border-r">STOCK</TableHead>
                      <TableHead className="text-right font-bold border-r">UNIT COST</TableHead>
                      <TableHead className="text-right font-bold border-r">TOTAL VALUE</TableHead>
                      <TableHead className="font-bold">ACTIONS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                            <span className="text-muted-foreground">Loading inventory...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Package2 className="h-12 w-12 opacity-50" />
                            <p className="text-lg font-medium">No products found</p>
                            <p className="text-sm">Add your first product to get started</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product, index) => (
                        <TableRow 
                          key={product._id}
                          className={`hover:bg-muted/50 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
                        >
                          <TableCell className="font-mono font-semibold text-primary border-r">
                            {product.sku}
                          </TableCell>
                          <TableCell className="font-medium border-r">{product.name}</TableCell>
                          <TableCell className="border-r">
                            {product.type ? (
                              <Badge variant="secondary" className="font-medium">
                                {product.type}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="border-r">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{product.vendorId?.name || '-'}</span>
                              {product.vendorId?.vendorType && (
                                <Badge variant="outline" className="text-xs capitalize">
                                  {product.vendorId.vendorType}
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-right border-r">
                            <div className="flex items-center justify-end gap-2">
                              {getStockStatus(product.stock)}
                              <span className="font-bold text-lg">{product.stock}</span>
                            </div>
                          </TableCell>
                          <TableCell className="text-right font-semibold border-r text-blue-600 dark:text-blue-400">
                            {formatCurrency(product.unitCost)}
                          </TableCell>
                          <TableCell className="text-right font-bold text-lg border-r text-green-600 dark:text-green-400">
                            {formatCurrency(product.stock * product.unitCost)}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-blue-50 dark:hover:bg-blue-950" title="Edit product">
                                <Edit className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button variant="ghost" size="icon" className="h-8 w-8 hover:bg-red-50 dark:hover:bg-red-950" title="Delete product">
                                <Trash2 className="h-4 w-4 text-red-600" />
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

            {/* Summary Card */}
            {filteredProducts.length > 0 && (
              <Card className="p-6 border-2 shadow-lg bg-gradient-to-br from-background to-muted/20">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="h-1 w-8 bg-primary rounded"></span>
                  Inventory Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Products</p>
                    <p className="text-3xl font-bold text-primary">{filteredProducts.length}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Stock</p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {filteredProducts.reduce((sum, p) => sum + p.stock, 0)}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Inventory Value</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(
                        filteredProducts.reduce(
                          (sum, p) => sum + p.stock * p.unitCost,
                          0
                        )
                      )}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Out of Stock
                    </p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                      {filteredProducts.filter((p) => p.stock === 0).length}
                    </p>
                  </div>
                </div>
              </Card>
            )}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    }>
      <InventoryContent />
    </Suspense>
  );
}
