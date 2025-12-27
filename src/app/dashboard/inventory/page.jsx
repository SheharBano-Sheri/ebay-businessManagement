"use client";

import { useState, useEffect, Suspense } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useRef } from "react";
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
import { Plus, Search, Edit, Trash2, Package, Package2, AlertCircle, Download, Upload, FileDown, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
  const [uploadingCSV, setUploadingCSV] = useState(false);
  const [currency, setCurrency] = useState("USD");
  const fileInputRef = useRef(null);
  const [selectedProducts, setSelectedProducts] = useState([]);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);

  const [formData, setFormData] = useState({
    country: "",
    sku: "",
    name: "",
    description: "",
    type: "",
    vendorId: "",
    stock: 0,
    unitCost: 0,
    listingUrl: "",
    currency: "USD",
  });

  // Country to currency mapping
  const countryCurrencyMap = {
    'USA': 'USD',
    'US': 'USD',
    'United States': 'USD',
    'UK': 'GBP',
    'United Kingdom': 'GBP',
    'Canada': 'CAD',
    'Australia': 'AUD',
    'India': 'INR',
    'Japan': 'JPY',
    'China': 'CNY',
    'Germany': 'EUR',
    'France': 'EUR',
    'Italy': 'EUR',
    'Spain': 'EUR',
    'Netherlands': 'EUR',
    'Belgium': 'EUR',
    'Austria': 'EUR',
    'Switzerland': 'CHF',
    'Sweden': 'SEK',
    'Norway': 'NOK',
    'Denmark': 'DKK',
    'Poland': 'PLN',
    'Mexico': 'MXN',
    'Brazil': 'BRL',
    'Argentina': 'ARS',
    'South Korea': 'KRW',
    'Singapore': 'SGD',
    'Hong Kong': 'HKD',
    'New Zealand': 'NZD',
    'UAE': 'AED',
    'Saudi Arabia': 'SAR',
    'South Africa': 'ZAR',
    'Turkey': 'TRY',
    'Russia': 'RUB',
  };

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
        // Show all vendors (API already filters to user's vendors)
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
        setCurrency("USD");
        setFormData({
          country: "",
          sku: "",
          name: "",
          description: "",
          type: "",
          vendorId: "",
          stock: 0,
          unitCost: 0,
          listingUrl: "",
          currency: "USD",
        });
        // Refresh products list
        await fetchProducts();
      } else {
        toast.error(data.error || "Failed to add product");
      }
    } catch (error) {
      console.error("Add product error:", error);
      toast.error("An error occurred while adding product");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    if (name === 'country') {
      // Auto-detect currency based on country
      const detectedCurrency = countryCurrencyMap[value] || countryCurrencyMap[value.trim()] || 'USD';
      setCurrency(detectedCurrency);
      setFormData({
        ...formData,
        [name]: value,
        currency: detectedCurrency,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const handleDownloadCSV = async () => {
    try {
      let url;
      
      if (selectedProducts.length > 0) {
        // Export only selected products
        const selectedData = products.filter(p => selectedProducts.includes(p._id));
        const csv = generateCSVFromProducts(selectedData);
        const blob = new Blob([csv], { type: 'text/csv' });
        url = window.URL.createObjectURL(blob);
      } else {
        // Export all products
        const response = await fetch("/api/products/export");
        if (!response.ok) {
          toast.error("Failed to download CSV");
          return;
        }
        const blob = await response.blob();
        url = window.URL.createObjectURL(blob);
      }
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `inventory-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      const count = selectedProducts.length || products.length;
      toast.success(`${count} product(s) downloaded successfully!`);
    } catch (error) {
      toast.error("An error occurred while downloading CSV");
    }
  };

  const generateCSVFromProducts = (productsToExport) => {
    let csv = 'Country,SKU,Name,Description,Type,Vendor,Stock,Unit Cost,Listing URL\n';
    
    productsToExport.forEach(product => {
      const row = [
        product.country || '',
        product.sku || '',
        product.name || '',
        `"${(product.description || '').replace(/"/g, '""')}"`,
        product.type || '',
        product.vendorId?.name || '',
        product.stock || 0,
        product.unitCost || 0,
        product.listingUrl || ''
      ].join(',');
      csv += row + '\n';
    });
    
    return csv;
  };

  const toggleProductSelection = (productId) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(p => p._id));
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    const detectedCurrency = product.currency || countryCurrencyMap[product.country] || 'USD';
    setCurrency(detectedCurrency);
    setFormData({
      country: product.country || '',
      sku: product.sku || '',
      name: product.name || '',
      description: product.description || '',
      type: product.type || '',
      vendorId: product.vendorId?._id || '',
      stock: product.stock || 0,
      unitCost: product.unitCost || 0,
      listingUrl: product.listingUrl || '',
      currency: detectedCurrency,
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`/api/products/${editingProduct._id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Product updated successfully!");
        setIsEditDialogOpen(false);
        setEditingProduct(null);
        setCurrency("USD");
        setFormData({
          country: "",
          sku: "",
          name: "",
          description: "",
          type: "",
          vendorId: "",
          stock: 0,
          unitCost: 0,
          listingUrl: "",
          currency: "USD",
        });
        fetchProducts();
      } else {
        toast.error(data.error || "Failed to update product");
      }
    } catch (error) {
      toast.error("An error occurred while updating product");
    }
  };

  const handleDeleteClick = (product) => {
    setProductToDelete(product);
    setDeleteConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!productToDelete) return;

    try {
      const response = await fetch(`/api/products/${productToDelete._id}`, {
        method: "DELETE",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Product deleted successfully!");
        setDeleteConfirmOpen(false);
        setProductToDelete(null);
        fetchProducts();
      } else {
        toast.error(data.error || "Failed to delete product");
      }
    } catch (error) {
      toast.error("An error occurred while deleting product");
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch("/api/products/export?type=template");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'inventory-template.csv';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success("Template downloaded successfully!");
      } else {
        toast.error("Failed to download template");
      }
    } catch (error) {
      toast.error("An error occurred while downloading template");
    }
  };

  const handleUploadCSV = async (e) => {
    const file = e.target.files?.[0];
    if (!file) {
      console.log('No file selected');
      return;
    }

    console.log('File selected:', file.name, file.type, file.size);

    if (!file.name.endsWith('.csv')) {
      toast.error("Please upload a CSV file");
      return;
    }

    const loadingToast = toast.loading("Uploading CSV file...");

    try {
      setUploadingCSV(true);
      const formData = new FormData();
      formData.append('file', file);

      console.log('Sending request to /api/products/upload');

      const response = await fetch("/api/products/upload", {
        method: "POST",
        body: formData,
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Error response:', errorText);
        toast.dismiss(loadingToast);
        toast.error(`Upload failed: ${response.status} - ${errorText}`);
        return;
      }

      const data = await response.json();
      console.log('Upload response:', data);

      toast.dismiss(loadingToast);

      if (response.ok) {
        toast.success(data.message || 'CSV uploaded successfully!');
        
        if (data.results && data.results.errors && data.results.errors.length > 0) {
          console.warn("Upload errors:", data.results.errors);
          // Show first few errors as toast
          const errorPreview = data.results.errors.slice(0, 3).join('; ');
          toast.warning(`Some rows had errors: ${errorPreview}${data.results.errors.length > 3 ? '...' : ''}`, {
            duration: 8000
          });
        }
        
        // Refresh products and vendors after successful upload
        console.log('Refreshing products and vendors...');
        await fetchProducts();
        await fetchVendors();
        console.log('Products refreshed');
      } else {
        toast.error(data.error || "Failed to upload CSV");
        console.error("Upload error:", data);
      }
    } catch (error) {
      console.error("Upload exception:", error);
      toast.dismiss(loadingToast);
      toast.error("An error occurred while uploading CSV: " + error.message);
    } finally {
      setUploadingCSV(false);
      e.target.value = ''; // Reset file input
    }
  };

  const formatCurrency = (amount, curr = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: curr,
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
                  {selectedProducts.length > 0 && (
                    <span className="ml-2 text-primary font-semibold">
                      • {selectedProducts.length} selected
                    </span>
                  )}
                </p>
              </div>
              <div className="flex gap-2">
                {selectedProducts.length > 0 && (
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedProducts([])}
                  >
                    Clear Selection
                  </Button>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <MoreVertical className="mr-2 h-4 w-4" />
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleDownloadCSV}>
                      <Download className="mr-2 h-4 w-4" />
                      {selectedProducts.length > 0 
                        ? `Download Selected (${selectedProducts.length})` 
                        : 'Download All CSV'}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadTemplate}>
                      <FileDown className="mr-2 h-4 w-4" />
                      Export Template
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
                      <Upload className="mr-2 h-4 w-4" />
                      {uploadingCSV ? 'Uploading...' : 'Upload CSV'}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                
                {/* Hidden file input */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleUploadCSV}
                  className="hidden"
                  disabled={uploadingCSV}
                />
                
                <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="mr-2 h-4 w-4" />
                      Add Product
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
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
                            <Label htmlFor="country">Country</Label>
                            <Select
                              value={formData.country}
                              onValueChange={(value) => {
                                const detectedCurrency = countryCurrencyMap[value] || 'USD';
                                setCurrency(detectedCurrency);
                                setFormData({ ...formData, country: value, currency: detectedCurrency });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                              <SelectContent className="max-h-[300px]">
                                {Object.keys(countryCurrencyMap).sort().map((country) => (
                                  <SelectItem key={country} value={country}>
                                    {country} ({countryCurrencyMap[country]})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="sku">SKU *</Label>
                            <Input
                              id="sku"
                              name="sku"
                              value={formData.sku}
                              onChange={handleChange}
                              required
                              placeholder="e.g., PROD-001"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="name">Product Name *</Label>
                          <Input
                            id="name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            placeholder="Enter product name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Enter product description"
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
                              placeholder="e.g., Electronics, Clothing"
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
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="unitCost">Unit Cost ({currency})</Label>
                            <Input
                              id="unitCost"
                              name="unitCost"
                              type="number"
                              step="0.01"
                              value={formData.unitCost}
                              onChange={handleChange}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="listingUrl">Listing Data Link</Label>
                          <Input
                            id="listingUrl"
                            name="listingUrl"
                            type="url"
                            value={formData.listingUrl}
                            onChange={handleChange}
                            placeholder="https://example.com/product"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="submit">Add Product</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Edit Product Dialog */}
                <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
                  <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleUpdate}>
                      <DialogHeader>
                        <DialogTitle>Edit Product</DialogTitle>
                        <DialogDescription>
                          Update product information
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-country">Country</Label>
                            <Select
                              value={formData.country}
                              onValueChange={(value) => {
                                const detectedCurrency = countryCurrencyMap[value] || 'USD';
                                setCurrency(detectedCurrency);
                                setFormData({ ...formData, country: value, currency: detectedCurrency });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                              <SelectContent className="max-h-[300px]">
                                {Object.keys(countryCurrencyMap).sort().map((country) => (
                                  <SelectItem key={country} value={country}>
                                    {country} ({countryCurrencyMap[country]})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-sku">SKU *</Label>
                            <Input
                              id="edit-sku"
                              name="sku"
                              value={formData.sku}
                              onChange={handleChange}
                              required
                              placeholder="e.g., PROD-001"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-name">Product Name *</Label>
                          <Input
                            id="edit-name"
                            name="name"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            placeholder="Enter product name"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-description">Description</Label>
                          <Textarea
                            id="edit-description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={3}
                            placeholder="Enter product description"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-type">Type</Label>
                            <Input
                              id="edit-type"
                              name="type"
                              value={formData.type}
                              onChange={handleChange}
                              placeholder="e.g., Electronics, Clothing"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-vendorId">Vendor *</Label>
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
                            <Label htmlFor="edit-stock">Stock Quantity</Label>
                            <Input
                              id="edit-stock"
                              name="stock"
                              type="number"
                              value={formData.stock}
                              onChange={handleChange}
                              placeholder="0"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-unitCost">Unit Cost ({currency})</Label>
                            <Input
                              id="edit-unitCost"
                              name="unitCost"
                              type="number"
                              step="0.01"
                              value={formData.unitCost}
                              onChange={handleChange}
                              placeholder="0.00"
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="edit-listingUrl">Listing Data Link</Label>
                          <Input
                            id="edit-listingUrl"
                            name="listingUrl"
                            type="url"
                            value={formData.listingUrl}
                            onChange={handleChange}
                            placeholder="https://example.com/product"
                          />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button type="button" variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit">Update Product</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Delete Confirmation Dialog */}
                <Dialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Product</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to delete "{productToDelete?.name}"? This action cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setDeleteConfirmOpen(false)}>
                        Cancel
                      </Button>
                      <Button variant="destructive" onClick={handleDeleteConfirm}>
                        Delete
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
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
                      <TableHead className="w-12 border-r">
                        <input
                          type="checkbox"
                          checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                          onChange={toggleSelectAll}
                          className="h-4 w-4 cursor-pointer"
                        />
                      </TableHead>
                      <TableHead className="font-bold border-r">COUNTRY</TableHead>
                      <TableHead className="font-bold border-r">SKU</TableHead>
                      <TableHead className="font-bold border-r">NAME</TableHead>
                      <TableHead className="font-bold border-r">DESCRIPTION</TableHead>
                      <TableHead className="font-bold border-r">TYPE</TableHead>
                      <TableHead className="font-bold border-r">VENDOR</TableHead>
                      <TableHead className="text-right font-bold border-r">STOCK</TableHead>
                      <TableHead className="text-right font-bold border-r">UNIT COST</TableHead>
                      <TableHead className="text-right font-bold border-r">TOTAL VALUE</TableHead>
                      <TableHead className="font-bold border-r">LISTING URL</TableHead>
                      <TableHead className="font-bold">ACTIONS</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                            <span className="text-muted-foreground">Loading inventory...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-12">
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
                          className={`hover:bg-muted/50 transition-colors ${
                            product.vendorId?.vendorType === 'public' 
                              ? product.isApproved 
                                ? 'bg-green-50 dark:bg-green-950/20 hover:bg-green-100 dark:hover:bg-green-900/30' 
                                : 'bg-red-50 dark:bg-red-950/20 hover:bg-red-100 dark:hover:bg-red-900/30'
                              : index % 2 === 0 ? 'bg-background' : 'bg-muted/20'
                          }`}
                        >
                          <TableCell className="border-r">
                            <input
                              type="checkbox"
                              checked={selectedProducts.includes(product._id)}
                              onChange={() => toggleProductSelection(product._id)}
                              className="h-4 w-4 cursor-pointer"
                            />
                          </TableCell>
                          <TableCell className="font-medium border-r">
                            {product.country ? (
                              <Badge variant="outline" className="font-medium">
                                {product.country}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell className="font-mono font-semibold text-primary border-r">
                            {product.sku}
                          </TableCell>
                          <TableCell className="font-medium border-r">{product.name}</TableCell>
                          <TableCell className="border-r max-w-xs truncate" title={product.description}>
                            {product.description ? (
                              <span className="text-sm text-muted-foreground">{product.description}</span>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
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
                              {/* Show approval status for public vendor products */}
                              {product.vendorId?.vendorType === 'public' && (
                                product.isApproved ? (
                                  <Badge variant="success" className="text-xs">
                                    ✓ Approved
                                  </Badge>
                                ) : (
                                  <Badge variant="warning" className="text-xs">
                                    ⏳ Pending Approval
                                  </Badge>
                                )
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
                            {formatCurrency(product.unitCost, product.currency || 'USD')}
                          </TableCell>
                          <TableCell className="text-right font-bold text-lg border-r text-green-600 dark:text-green-400">
                            {formatCurrency(product.stock * product.unitCost, product.currency || 'USD')}
                          </TableCell>
                          <TableCell className="border-r">
                            {product.listingUrl ? (
                              <a 
                                href={product.listingUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline text-sm flex items-center gap-1"
                              >
                                View Link
                                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            ) : (
                              <span className="text-muted-foreground">-</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 hover:bg-blue-50 dark:hover:bg-blue-950" 
                                title="Edit product"
                                onClick={() => handleEdit(product)}
                              >
                                <Edit className="h-4 w-4 text-blue-600" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 hover:bg-red-50 dark:hover:bg-red-950" 
                                title="Delete product"
                                onClick={() => handleDeleteClick(product)}
                              >
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
