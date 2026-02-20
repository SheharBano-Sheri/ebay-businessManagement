"use client";

import { useState, useEffect, Suspense, Fragment } from "react";
import { useSession } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useRef } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Plus,
  Search,
  Edit,
  Trash2,
  Package,
  Package2,
  AlertCircle,
  Download,
  Upload,
  FileDown,
  MoreVertical,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
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
  const [expandedProducts, setExpandedProducts] = useState(new Set());

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
    hasVariations: false,
    variations: [],
  });

  // Country to currency mapping
  const countryCurrencyMap = {
    USA: "USD",
    US: "USD",
    "United States": "USD",
    UK: "GBP",
    "United Kingdom": "GBP",
    Canada: "CAD",
    Australia: "AUD",
    India: "INR",
    Japan: "JPY",
    China: "CNY",
    Germany: "EUR",
    France: "EUR",
    Italy: "EUR",
    Spain: "EUR",
    Netherlands: "EUR",
    Belgium: "EUR",
    Austria: "EUR",
    Switzerland: "CHF",
    Sweden: "SEK",
    Norway: "NOK",
    Denmark: "DKK",
    Poland: "PLN",
    Mexico: "MXN",
    Brazil: "BRL",
    Argentina: "ARS",
    "South Korea": "KRW",
    Singapore: "SGD",
    "Hong Kong": "HKD",
    "New Zealand": "NZD",
    UAE: "AED",
    "Saudi Arabia": "SAR",
    "South Africa": "ZAR",
    Turkey: "TRY",
    Russia: "RUB",
  };

  useEffect(() => {
    fetchProducts();
    fetchVendors();

    const vendorParam = searchParams.get("vendor");
    if (vendorParam) {
      setSelectedVendor(vendorParam);
    }
  }, [searchParams]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/products");
      const data = await response.json();
      if (response.ok) setProducts(data.products);
      else toast.error(data.error || "Failed to fetch products");
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
      if (response.ok) setVendors(data.vendors);
    } catch (error) {
      console.error("Failed to fetch vendors");
    }
  };

  const toggleExpand = (productId) => {
    setExpandedProducts((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) newSet.delete(productId);
      else newSet.add(productId);
      return newSet;
    });
  };

  const addVariation = () => {
    setFormData({
      ...formData,
      variations: [
        ...formData.variations,
        {
          name: "",
          value: "",
          sku: "",
          stock: 0,
          unitCost: formData.unitCost || 0,
        },
      ],
    });
  };

  const updateVariation = (index, field, value) => {
    const newVariations = [...formData.variations];
    newVariations[index][field] = value;
    setFormData({ ...formData, variations: newVariations });
  };

  const removeVariation = (index) => {
    const newVariations = formData.variations.filter((_, i) => i !== index);
    setFormData({ ...formData, variations: newVariations });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
          hasVariations: false,
          variations: [],
        });
        await fetchProducts();
      } else {
        toast.error(data.error || "Failed to add product");
      }
    } catch (error) {
      toast.error("An error occurred while adding product");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name === "country") {
      const detectedCurrency =
        countryCurrencyMap[value] || countryCurrencyMap[value.trim()] || "USD";
      setCurrency(detectedCurrency);
      setFormData({ ...formData, [name]: value, currency: detectedCurrency });
    } else {
      setFormData({ ...formData, [name]: value });
    }
  };

  // --- UPDATED WOOCOMMERCE STYLE CSV EXPORT ---
  const generateCSVFromProducts = (productsToExport) => {
    let csv =
      "Country,SKU,Name,Description,Type,Vendor,Stock,Unit Cost,Listing URL,Parent SKU\n";

    productsToExport.forEach((product) => {
      const isVariable =
        product.hasVariations && product.variations?.length > 0;

      // Calculate parent stock (sum of variations if variable)
      const parentStock = isVariable
        ? product.variations.reduce((sum, v) => sum + (v.stock || 0), 0)
        : product.stock || 0;

      // 1. Export Parent Row
      const row = [
        product.country || "",
        product.sku || "",
        `"${(product.name || "").replace(/"/g, '""')}"`,
        `"${(product.description || "").replace(/"/g, '""')}"`,
        isVariable ? "variable" : product.type || "simple",
        `"${(product.vendorId?.name || "").replace(/"/g, '""')}"`,
        parentStock,
        product.unitCost || 0,
        product.listingUrl || "",
        "", // Parent SKU column is empty for the parent itself
      ].join(",");
      csv += row + "\n";

      // 2. Export Variation Rows
      if (isVariable) {
        product.variations.forEach((v) => {
          const varRow = [
            product.country || "",
            v.sku || "", // Specific Variation SKU
            `"${product.name} - ${v.name}: ${v.value}"`, // E.g., "T-Shirt - Color: Red"
            `"Variation of ${product.sku}"`,
            "variation",
            `"${(product.vendorId?.name || "").replace(/"/g, '""')}"`,
            v.stock || 0,
            v.unitCost || 0,
            product.listingUrl || "",
            product.sku, // Maps back to parent SKU
          ].join(",");
          csv += varRow + "\n";
        });
      }
    });
    return csv;
  };

  const handleDownloadCSV = async () => {
    try {
      let url;
      if (selectedProducts.length > 0) {
        const selectedData = products.filter((p) =>
          selectedProducts.includes(p._id),
        );
        const csv = generateCSVFromProducts(selectedData);
        const blob = new Blob([csv], { type: "text/csv" });
        url = window.URL.createObjectURL(blob);
      } else {
        // If they click download all, we generate it locally to ensure variations are exported properly
        // using the new WordPress logic rather than the generic backend route.
        const csv = generateCSVFromProducts(products);
        const blob = new Blob([csv], { type: "text/csv" });
        url = window.URL.createObjectURL(blob);
      }
      const a = document.createElement("a");
      a.href = url;
      a.download = `inventory-export-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      const count = selectedProducts.length || products.length;
      toast.success(`${count} product(s) exported with variations!`);
    } catch (error) {
      toast.error("An error occurred while downloading CSV");
    }
  };

  const toggleProductSelection = (productId) => {
    setSelectedProducts((prev) =>
      prev.includes(productId)
        ? prev.filter((id) => id !== productId)
        : [...prev, productId],
    );
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map((p) => p._id));
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    const detectedCurrency =
      product.currency || countryCurrencyMap[product.country] || "USD";
    setCurrency(detectedCurrency);
    setFormData({
      country: product.country || "",
      sku: product.sku || "",
      name: product.name || "",
      description: product.description || "",
      type: product.type || "",
      vendorId: product.vendorId?._id || "",
      stock: product.stock || 0,
      unitCost: product.unitCost || 0,
      listingUrl: product.listingUrl || "",
      currency: detectedCurrency,
      hasVariations: product.hasVariations || false,
      variations: product.variations || [],
    });
    setIsEditDialogOpen(true);
  };

  const handleUpdate = async (e) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/products/${editingProduct._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
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
          hasVariations: false,
          variations: [],
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

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) {
      toast.error("No products selected");
      return;
    }

    const confirmMessage = `Are you sure you want to delete ${selectedProducts.length} product(s)? This action cannot be undone.`;
    if (!window.confirm(confirmMessage)) return;

    try {
      const response = await fetch("/api/products/bulk-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productIds: selectedProducts }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message || "Products deleted successfully!");
        setSelectedProducts([]);
        fetchProducts();
      } else {
        toast.error(data.error || "Failed to delete products");
      }
    } catch (error) {
      toast.error("An error occurred while deleting products");
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const response = await fetch("/api/products/export?type=template");
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "inventory-template.csv";
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
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      toast.error("Please upload a CSV file");
      return;
    }
    const loadingToast = toast.loading("Uploading CSV file...");
    try {
      setUploadingCSV(true);
      const formData = new FormData();
      formData.append("file", file);
      const response = await fetch("/api/products/upload", {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        const errorText = await response.text();
        toast.dismiss(loadingToast);
        toast.error(`Upload failed: ${response.status} - ${errorText}`);
        return;
      }
      const data = await response.json();
      toast.dismiss(loadingToast);
      if (response.ok) {
        if (data.results && data.results.summary) {
          const summary = data.results.summary;
          toast.success(
            `Upload complete! ${summary.created} created, ${summary.updated} updated${summary.failed > 0 ? `, ${summary.failed} failed` : ""}`,
            { duration: 6000 },
          );
        } else {
          toast.success(data.message || "CSV uploaded successfully!");
        }

        if (
          data.results &&
          data.results.errors &&
          data.results.errors.length > 0
        ) {
          const errorPreview = data.results.errors.slice(0, 3).join("; ");
          toast.warning(
            `Some rows had errors: ${errorPreview}${data.results.errors.length > 3 ? "..." : ""}`,
            { duration: 8000 },
          );
        }
        await fetchProducts();
        await fetchVendors();
      } else {
        toast.error(data.error || "Failed to upload CSV");
      }
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error("An error occurred while uploading CSV: " + error.message);
    } finally {
      setUploadingCSV(false);
      e.target.value = "";
    }
  };

  const formatCurrency = (amount, curr = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: curr,
    }).format(amount);
  };

  const getStockStatus = (stock) => {
    if (stock === 0) return <Badge variant="destructive">Out</Badge>;
    if (stock < 10) return <Badge variant="warning">Low</Badge>;
    return <Badge variant="success">In</Badge>;
  };

  // Helper to format Cost display for variations (shows a range if prices differ)
  const getProductCostDisplay = (product) => {
    if (product.hasVariations && product.variations?.length > 0) {
      const costs = product.variations.map((v) => v.unitCost || 0);
      const minCost = Math.min(...costs);
      const maxCost = Math.max(...costs);
      if (minCost === maxCost) {
        return minCost.toFixed(2);
      }
      return `${minCost.toFixed(2)} - ${maxCost.toFixed(2)}`;
    }
    return (product.unitCost || 0).toFixed(2);
  };

  const filteredProducts = products.filter((product) => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      product.sku.toLowerCase().includes(searchLower) ||
      product.name.toLowerCase().includes(searchLower);
    const matchesType = selectedType === "all" || product.type === selectedType;
    const matchesVendor =
      selectedVendor === "all" || product.vendorId?._id === selectedVendor;
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
      <SidebarInset className="flex flex-col w-full">
        <SiteHeader />
        <div className="flex-1 overflow-auto p-4 lg:p-6 w-full">
          <div className="space-y-4 pb-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
                  Inventory
                </h1>
                <p className="text-sm text-muted-foreground">
                  Manage your product inventory and stock levels
                  {selectedProducts.length > 0 && (
                    <span className="ml-2 text-primary font-semibold">
                      • {selectedProducts.length} selected
                    </span>
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                {selectedProducts.length > 0 && (
                  <>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedProducts([])}
                    >
                      Clear
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={handleBulkDelete}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete Selected ({selectedProducts.length})
                    </Button>
                  </>
                )}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                      <MoreVertical className="mr-2 h-4 w-4" />
                      Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={handleDownloadCSV}>
                      <Download className="mr-2 h-4 w-4" />
                      {selectedProducts.length > 0
                        ? `Download Selected (${selectedProducts.length})`
                        : "Download All CSV"}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={handleDownloadTemplate}>
                      <FileDown className="mr-2 h-4 w-4" />
                      Export Template
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      {uploadingCSV ? "Uploading..." : "Upload CSV"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>

                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv"
                  onChange={handleUploadCSV}
                  className="hidden"
                  disabled={uploadingCSV}
                />

                <Dialog
                  open={isAddDialogOpen}
                  onOpenChange={setIsAddDialogOpen}
                >
                  <DialogTrigger asChild>
                    <Button size="sm">
                      <Plus className="mr-2 h-4 w-4" />
                      Add Product
                    </Button>
                  </DialogTrigger>
                  {/* WIDER DIALOG FOR BETTER VISIBILITY */}
                  <DialogContent className="max-w-[95vw] md:max-w-5xl max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleSubmit}>
                      <DialogHeader>
                        <DialogTitle>Add New Product</DialogTitle>
                        <DialogDescription>
                          Add a new product to your inventory
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-2 col-span-2">
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
                          <div className="space-y-2 col-span-1">
                            <Label htmlFor="sku">Base SKU *</Label>
                            <Input
                              id="sku"
                              name="sku"
                              value={formData.sku}
                              onChange={handleChange}
                              required
                              placeholder="PROD-001"
                            />
                          </div>
                          <div className="space-y-2 col-span-1">
                            <Label htmlFor="country">Country</Label>
                            <Select
                              value={formData.country}
                              onValueChange={(value) => {
                                const detectedCurrency =
                                  countryCurrencyMap[value] || "USD";
                                setCurrency(detectedCurrency);
                                setFormData({
                                  ...formData,
                                  country: value,
                                  currency: detectedCurrency,
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                              <SelectContent className="max-h-[300px]">
                                {Object.keys(countryCurrencyMap)
                                  .sort()
                                  .map((country) => (
                                    <SelectItem key={country} value={country}>
                                      {country} ({countryCurrencyMap[country]})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="description">Description</Label>
                          <Textarea
                            id="description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={2}
                            placeholder="Enter product description"
                          />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="type">Type</Label>
                            <Input
                              id="type"
                              name="type"
                              value={formData.type}
                              onChange={handleChange}
                              placeholder="Electronics"
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
                                  <SelectItem
                                    key={vendor._id}
                                    value={vendor._id}
                                  >
                                    {vendor.name} ({vendor.vendorType})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="stock">Base Stock</Label>
                            <Input
                              id="stock"
                              name="stock"
                              type="number"
                              value={formData.stock}
                              onChange={handleChange}
                              disabled={formData.hasVariations}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="unitCost">
                              Base Cost ({currency})
                            </Label>
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

                        {/* --- VARIATIONS UI ADD PRODUCT --- */}
                        <div className="flex items-center space-x-2 py-4 border-t mt-4">
                          <Checkbox
                            id="hasVariations"
                            checked={formData.hasVariations}
                            onCheckedChange={(checked) =>
                              setFormData({
                                ...formData,
                                hasVariations: checked,
                                stock: checked ? 0 : formData.stock,
                              })
                            }
                          />
                          <Label
                            htmlFor="hasVariations"
                            className="font-semibold cursor-pointer"
                          >
                            Product has variations (This will override base
                            stock)
                          </Label>
                        </div>

                        {formData.hasVariations && (
                          <div className="space-y-4 border p-4 rounded-md bg-muted/10">
                            <div className="flex justify-between items-center">
                              <Label className="text-md font-semibold text-primary">
                                Manage Variations
                              </Label>
                              <Button
                                type="button"
                                size="sm"
                                onClick={addVariation}
                              >
                                <Plus className="h-4 w-4 mr-1" /> Add Variation
                                Option
                              </Button>
                            </div>

                            {formData.variations.length === 0 ? (
                              <p className="text-sm text-muted-foreground italic text-center py-4 border-2 border-dashed rounded">
                                No variations added yet. Click 'Add Variation
                                Option' to start mapping out your sizes, colors,
                                etc.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                {/* Header Row for wide screens */}
                                <div className="hidden md:grid grid-cols-12 gap-2 px-2 text-xs font-semibold text-muted-foreground">
                                  <div className="col-span-2">
                                    Type (e.g. Size)
                                  </div>
                                  <div className="col-span-2">
                                    Value (e.g. XL)
                                  </div>
                                  <div className="col-span-3">
                                    Variation SKU
                                  </div>
                                  <div className="col-span-2">Stock</div>
                                  <div className="col-span-2">
                                    Cost ({currency})
                                  </div>
                                  <div className="col-span-1 text-center">
                                    Action
                                  </div>
                                </div>

                                {formData.variations.map((varItem, idx) => (
                                  <div
                                    key={idx}
                                    className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end bg-background p-3 md:p-2 rounded border shadow-sm"
                                  >
                                    <div className="space-y-1 col-span-1 md:col-span-2">
                                      <Label className="text-xs md:hidden">
                                        Type
                                      </Label>
                                      <Input
                                        value={varItem.name || ""}
                                        onChange={(e) =>
                                          updateVariation(
                                            idx,
                                            "name",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="Color"
                                      />
                                    </div>
                                    <div className="space-y-1 col-span-1 md:col-span-2">
                                      <Label className="text-xs md:hidden">
                                        Value
                                      </Label>
                                      <Input
                                        value={varItem.value || ""}
                                        onChange={(e) =>
                                          updateVariation(
                                            idx,
                                            "value",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="Red"
                                      />
                                    </div>
                                    <div className="space-y-1 col-span-1 md:col-span-3">
                                      <Label className="text-xs md:hidden">
                                        Variation SKU
                                      </Label>
                                      <Input
                                        value={varItem.sku || ""}
                                        onChange={(e) =>
                                          updateVariation(
                                            idx,
                                            "sku",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="PROD-RED"
                                      />
                                    </div>
                                    <div className="space-y-1 col-span-1 md:col-span-2">
                                      <Label className="text-xs md:hidden">
                                        Stock
                                      </Label>
                                      <Input
                                        type="number"
                                        value={varItem.stock || 0}
                                        onChange={(e) =>
                                          updateVariation(
                                            idx,
                                            "stock",
                                            Number(e.target.value),
                                          )
                                        }
                                      />
                                    </div>
                                    <div className="space-y-1 col-span-1 md:col-span-2">
                                      <Label className="text-xs md:hidden">
                                        Cost
                                      </Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={
                                          varItem.unitCost === undefined
                                            ? formData.unitCost
                                            : varItem.unitCost
                                        }
                                        onChange={(e) =>
                                          updateVariation(
                                            idx,
                                            "unitCost",
                                            Number(e.target.value),
                                          )
                                        }
                                      />
                                    </div>
                                    <div className="col-span-1 flex justify-end md:justify-center">
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        onClick={() => removeVariation(idx)}
                                        className="h-10 w-10"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button type="submit">Add Product</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Edit Product Dialog */}
                <Dialog
                  open={isEditDialogOpen}
                  onOpenChange={setIsEditDialogOpen}
                >
                  <DialogContent className="max-w-[95vw] md:max-w-5xl max-h-[90vh] overflow-y-auto">
                    <form onSubmit={handleUpdate}>
                      <DialogHeader>
                        <DialogTitle>Edit Product</DialogTitle>
                        <DialogDescription>
                          Update product information
                        </DialogDescription>
                      </DialogHeader>
                      <div className="grid gap-4 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-2 col-span-2">
                            <Label htmlFor="edit-name">Product Name *</Label>
                            <Input
                              id="edit-name"
                              name="name"
                              value={formData.name}
                              onChange={handleChange}
                              required
                            />
                          </div>
                          <div className="space-y-2 col-span-1">
                            <Label htmlFor="edit-sku">Base SKU *</Label>
                            <Input
                              id="edit-sku"
                              name="sku"
                              value={formData.sku}
                              onChange={handleChange}
                              required
                            />
                          </div>
                          <div className="space-y-2 col-span-1">
                            <Label htmlFor="edit-country">Country</Label>
                            <Select
                              value={formData.country}
                              onValueChange={(value) => {
                                const detectedCurrency =
                                  countryCurrencyMap[value] || "USD";
                                setCurrency(detectedCurrency);
                                setFormData({
                                  ...formData,
                                  country: value,
                                  currency: detectedCurrency,
                                });
                              }}
                            >
                              <SelectTrigger>
                                <SelectValue placeholder="Select country" />
                              </SelectTrigger>
                              <SelectContent className="max-h-[300px]">
                                {Object.keys(countryCurrencyMap)
                                  .sort()
                                  .map((country) => (
                                    <SelectItem key={country} value={country}>
                                      {country} ({countryCurrencyMap[country]})
                                    </SelectItem>
                                  ))}
                              </SelectContent>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="edit-description">Description</Label>
                          <Textarea
                            id="edit-description"
                            name="description"
                            value={formData.description}
                            onChange={handleChange}
                            rows={2}
                          />
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="space-y-2">
                            <Label htmlFor="edit-type">Type</Label>
                            <Input
                              id="edit-type"
                              name="type"
                              value={formData.type}
                              onChange={handleChange}
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
                                  <SelectItem
                                    key={vendor._id}
                                    value={vendor._id}
                                  >
                                    {vendor.name} ({vendor.vendorType})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-stock">Base Stock</Label>
                            <Input
                              id="edit-stock"
                              name="stock"
                              type="number"
                              value={formData.stock}
                              onChange={handleChange}
                              disabled={formData.hasVariations}
                            />
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="edit-unitCost">Base Cost</Label>
                            <Input
                              id="edit-unitCost"
                              name="unitCost"
                              type="number"
                              step="0.01"
                              value={formData.unitCost}
                              onChange={handleChange}
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="edit-listingUrl">Listing Link</Label>
                          <Input
                            id="edit-listingUrl"
                            name="listingUrl"
                            type="url"
                            value={formData.listingUrl}
                            onChange={handleChange}
                          />
                        </div>

                        {/* --- VARIATIONS UI EDIT PRODUCT --- */}
                        <div className="flex items-center space-x-2 py-4 border-t mt-4">
                          <Checkbox
                            id="edit-hasVariations"
                            checked={formData.hasVariations}
                            onCheckedChange={(checked) =>
                              setFormData({
                                ...formData,
                                hasVariations: checked,
                                stock: checked ? 0 : formData.stock,
                              })
                            }
                          />
                          <Label
                            htmlFor="edit-hasVariations"
                            className="font-semibold cursor-pointer"
                          >
                            Product has variations (This will override base
                            stock)
                          </Label>
                        </div>

                        {formData.hasVariations && (
                          <div className="space-y-4 border p-4 rounded-md bg-muted/10">
                            <div className="flex justify-between items-center">
                              <Label className="text-md font-semibold text-primary">
                                Manage Variations
                              </Label>
                              <Button
                                type="button"
                                size="sm"
                                onClick={addVariation}
                              >
                                <Plus className="h-4 w-4 mr-1" /> Add Variation
                                Option
                              </Button>
                            </div>

                            {formData.variations.length === 0 ? (
                              <p className="text-sm text-muted-foreground italic text-center py-4 border-2 border-dashed rounded">
                                No variations added yet. Click 'Add Variation
                                Option' to start mapping out your sizes, colors,
                                etc.
                              </p>
                            ) : (
                              <div className="space-y-2">
                                <div className="hidden md:grid grid-cols-12 gap-2 px-2 text-xs font-semibold text-muted-foreground">
                                  <div className="col-span-2">
                                    Type (e.g. Size)
                                  </div>
                                  <div className="col-span-2">
                                    Value (e.g. XL)
                                  </div>
                                  <div className="col-span-3">
                                    Variation SKU
                                  </div>
                                  <div className="col-span-2">Stock</div>
                                  <div className="col-span-2">
                                    Cost ({currency})
                                  </div>
                                  <div className="col-span-1 text-center">
                                    Action
                                  </div>
                                </div>

                                {formData.variations.map((varItem, idx) => (
                                  <div
                                    key={idx}
                                    className="grid grid-cols-1 md:grid-cols-12 gap-2 items-end bg-background p-3 md:p-2 rounded border shadow-sm"
                                  >
                                    <div className="space-y-1 col-span-1 md:col-span-2">
                                      <Label className="text-xs md:hidden">
                                        Type
                                      </Label>
                                      <Input
                                        value={varItem.name || ""}
                                        onChange={(e) =>
                                          updateVariation(
                                            idx,
                                            "name",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="Color"
                                      />
                                    </div>
                                    <div className="space-y-1 col-span-1 md:col-span-2">
                                      <Label className="text-xs md:hidden">
                                        Value
                                      </Label>
                                      <Input
                                        value={varItem.value || ""}
                                        onChange={(e) =>
                                          updateVariation(
                                            idx,
                                            "value",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="Red"
                                      />
                                    </div>
                                    <div className="space-y-1 col-span-1 md:col-span-3">
                                      <Label className="text-xs md:hidden">
                                        Variation SKU
                                      </Label>
                                      <Input
                                        value={varItem.sku || ""}
                                        onChange={(e) =>
                                          updateVariation(
                                            idx,
                                            "sku",
                                            e.target.value,
                                          )
                                        }
                                        placeholder="PROD-RED"
                                      />
                                    </div>
                                    <div className="space-y-1 col-span-1 md:col-span-2">
                                      <Label className="text-xs md:hidden">
                                        Stock
                                      </Label>
                                      <Input
                                        type="number"
                                        value={varItem.stock || 0}
                                        onChange={(e) =>
                                          updateVariation(
                                            idx,
                                            "stock",
                                            Number(e.target.value),
                                          )
                                        }
                                      />
                                    </div>
                                    <div className="space-y-1 col-span-1 md:col-span-2">
                                      <Label className="text-xs md:hidden">
                                        Cost
                                      </Label>
                                      <Input
                                        type="number"
                                        step="0.01"
                                        value={
                                          varItem.unitCost === undefined
                                            ? formData.unitCost
                                            : varItem.unitCost
                                        }
                                        onChange={(e) =>
                                          updateVariation(
                                            idx,
                                            "unitCost",
                                            Number(e.target.value),
                                          )
                                        }
                                      />
                                    </div>
                                    <div className="col-span-1 flex justify-end md:justify-center">
                                      <Button
                                        type="button"
                                        variant="destructive"
                                        size="icon"
                                        onClick={() => removeVariation(idx)}
                                        className="h-10 w-10"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setIsEditDialogOpen(false)}
                        >
                          Cancel
                        </Button>
                        <Button type="submit">Update</Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>

                {/* Delete Dialog */}
                <Dialog
                  open={deleteConfirmOpen}
                  onOpenChange={setDeleteConfirmOpen}
                >
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Delete Product</DialogTitle>
                      <DialogDescription>
                        Are you sure you want to delete "{productToDelete?.name}
                        "? This cannot be undone.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button
                        variant="outline"
                        onClick={() => setDeleteConfirmOpen(false)}
                      >
                        Cancel
                      </Button>
                      <Button
                        variant="destructive"
                        onClick={handleDeleteConfirm}
                      >
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
                      placeholder="Search SKU/name..."
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
                  <Select
                    value={selectedVendor}
                    onValueChange={setSelectedVendor}
                  >
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

            {/* --- RESPONSIVE TABLE --- */}
            <Card className="border-2 shadow-lg w-full">
              <div className="overflow-x-auto w-full">
                <Table className="min-w-full">
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-primary/10 to-primary/5 border-b-2">
                      <TableHead className="w-8 border-r p-2">
                        <input
                          type="checkbox"
                          checked={
                            selectedProducts.length ===
                              filteredProducts.length &&
                            filteredProducts.length > 0
                          }
                          onChange={toggleSelectAll}
                          className="h-4 w-4 cursor-pointer"
                        />
                      </TableHead>
                      <TableHead className="font-bold border-r text-xs md:text-sm p-2">
                        CNTRY
                      </TableHead>
                      <TableHead className="font-bold border-r text-xs md:text-sm p-2">
                        SKU
                      </TableHead>
                      <TableHead className="font-bold border-r text-xs md:text-sm p-2 min-w-[120px]">
                        PRODUCT INFO
                      </TableHead>
                      <TableHead className="font-bold border-r text-xs md:text-sm p-2 hidden sm:table-cell">
                        DESC
                      </TableHead>
                      <TableHead className="font-bold border-r text-xs md:text-sm p-2 hidden md:table-cell">
                        TYPE
                      </TableHead>
                      <TableHead className="font-bold border-r text-xs md:text-sm p-2">
                        VENDOR
                      </TableHead>
                      <TableHead className="text-right font-bold border-r text-xs md:text-sm p-2">
                        STOCK
                      </TableHead>
                      <TableHead className="text-right font-bold border-r text-xs md:text-sm p-2">
                        COST
                      </TableHead>
                      <TableHead className="text-right font-bold border-r text-xs md:text-sm p-2 hidden lg:table-cell">
                        VALUE
                      </TableHead>
                      <TableHead className="font-bold border-r text-xs md:text-sm p-2 hidden xl:table-cell">
                        LINK
                      </TableHead>
                      <TableHead className="font-bold text-xs md:text-sm p-2">
                        ACT
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                            <span className="text-muted-foreground">
                              Loading...
                            </span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredProducts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={12} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Package2 className="h-12 w-12 opacity-50" />
                            <p className="text-lg font-medium">
                              No products found
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredProducts.map((product, index) => {
                        const isVariable =
                          product.hasVariations &&
                          product.variations?.length > 0;
                        const totalStock = isVariable
                          ? product.variations.reduce(
                              (sum, v) => sum + (v.stock || 0),
                              0,
                            )
                          : product.stock || 0;
                        const totalValue = isVariable
                          ? product.variations.reduce(
                              (sum, v) =>
                                sum + (v.stock || 0) * (v.unitCost || 0),
                              0,
                            )
                          : (product.stock || 0) * (product.unitCost || 0);

                        return (
                          <Fragment key={product._id}>
                            <TableRow
                              className={`hover:bg-muted/50 transition-colors ${
                                product.vendorId?.vendorType === "public"
                                  ? product.isApproved
                                    ? "bg-green-50 dark:bg-green-950/20"
                                    : "bg-red-50 dark:bg-red-950/20"
                                  : index % 2 === 0
                                    ? "bg-background"
                                    : "bg-muted/20"
                              }`}
                            >
                              <TableCell className="border-r p-2 align-top">
                                <input
                                  type="checkbox"
                                  checked={selectedProducts.includes(
                                    product._id,
                                  )}
                                  onChange={() =>
                                    toggleProductSelection(product._id)
                                  }
                                  className="h-4 w-4 cursor-pointer"
                                />
                              </TableCell>

                              <TableCell className="font-medium border-r p-2 align-top">
                                {product.country ? (
                                  <Badge
                                    variant="outline"
                                    className="text-[10px] px-1"
                                  >
                                    {product.country.slice(0, 3).toUpperCase()}
                                  </Badge>
                                ) : (
                                  "-"
                                )}
                              </TableCell>

                              <TableCell className="font-mono text-xs font-semibold text-primary border-r p-2 align-top break-all">
                                {product.sku}
                              </TableCell>

                              <TableCell className="font-medium border-r p-2 align-top text-xs md:text-sm">
                                <div className="line-clamp-3 md:line-clamp-2 min-w-[100px] flex flex-col gap-2 items-start">
                                  <span>{product.name}</span>
                                  {isVariable && (
                                    <Button
                                      variant="secondary"
                                      size="sm"
                                      className="h-6 text-[10px] px-2 py-0 border shadow-sm"
                                      onClick={() => toggleExpand(product._id)}
                                    >
                                      {expandedProducts.has(product._id) ? (
                                        <ChevronUp className="h-3 w-3 mr-1" />
                                      ) : (
                                        <ChevronDown className="h-3 w-3 mr-1" />
                                      )}
                                      {product.variations.length} Options
                                    </Button>
                                  )}
                                </div>
                              </TableCell>

                              <TableCell className="border-r p-2 align-top hidden sm:table-cell">
                                <div className="line-clamp-2 text-xs text-muted-foreground max-w-[150px]">
                                  {product.description || "-"}
                                </div>
                              </TableCell>

                              <TableCell className="border-r p-2 align-top hidden md:table-cell">
                                {product.type ? (
                                  <Badge
                                    variant="secondary"
                                    className="text-[10px]"
                                  >
                                    {product.type}
                                  </Badge>
                                ) : (
                                  "-"
                                )}
                              </TableCell>

                              <TableCell className="border-r p-2 align-top text-xs">
                                <div className="flex flex-col gap-1">
                                  <span className="font-semibold truncate max-w-[80px]">
                                    {product.vendorId?.name || "-"}
                                  </span>
                                  {product.vendorId?.vendorType === "public" &&
                                    (product.isApproved ? (
                                      <span className="text-green-600 text-[10px]">
                                        ✓ Appr.
                                      </span>
                                    ) : (
                                      <span className="text-red-500 text-[10px]">
                                        ⏳ Pend.
                                      </span>
                                    ))}
                                </div>
                              </TableCell>

                              <TableCell className="text-right border-r p-2 align-top">
                                <div className="flex flex-col items-end gap-1">
                                  <span className="font-bold text-sm">
                                    {totalStock}
                                  </span>
                                  <span className="scale-75 origin-right">
                                    {getStockStatus(totalStock)}
                                  </span>
                                </div>
                              </TableCell>

                              <TableCell className="text-right font-semibold border-r p-2 align-top text-xs">
                                <div className="flex flex-col">
                                  <span>{getProductCostDisplay(product)}</span>
                                  <span className="text-muted-foreground text-[10px]">
                                    {product.currency || "USD"}
                                  </span>
                                </div>
                              </TableCell>

                              <TableCell className="text-right border-r p-2 align-top hidden lg:table-cell text-xs font-bold text-green-600">
                                {formatCurrency(
                                  totalValue,
                                  product.currency || "USD",
                                )}
                              </TableCell>

                              <TableCell className="border-r p-2 align-top hidden xl:table-cell">
                                {product.listingUrl && (
                                  <a
                                    href={product.listingUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:underline text-xs"
                                  >
                                    Link
                                  </a>
                                )}
                              </TableCell>

                              <TableCell className="p-2 align-top">
                                <div className="flex flex-col sm:flex-row gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleEdit(product)}
                                  >
                                    <Edit className="h-3 w-3 text-blue-600" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7"
                                    onClick={() => handleDeleteClick(product)}
                                  >
                                    <Trash2 className="h-3 w-3 text-red-600" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>

                            {/* --- EXPANDABLE ROW FOR VARIATIONS --- */}
                            {expandedProducts.has(product._id) &&
                              isVariable && (
                                <TableRow className="bg-muted/10 border-b-2 border-primary/20">
                                  <TableCell colSpan={12} className="p-0">
                                    <div className="p-4 pl-12 sm:pl-24 pr-4 w-full animate-in fade-in slide-in-from-top-2">
                                      <div className="flex items-center gap-2 mb-3">
                                        <div className="h-4 w-1 bg-primary rounded-full"></div>
                                        <h4 className="font-semibold text-sm">
                                          Variation Details
                                        </h4>
                                      </div>
                                      <div className="rounded-md border bg-background overflow-hidden shadow-inner">
                                        <Table className="w-full text-xs">
                                          <TableHeader className="bg-muted/50">
                                            <TableRow>
                                              <TableHead className="font-semibold py-2">
                                                Option Type
                                              </TableHead>
                                              <TableHead className="font-semibold py-2">
                                                Value
                                              </TableHead>
                                              <TableHead className="font-semibold py-2">
                                                Variation SKU
                                              </TableHead>
                                              <TableHead className="text-right font-semibold py-2">
                                                Stock
                                              </TableHead>
                                              <TableHead className="text-right font-semibold py-2">
                                                Cost
                                              </TableHead>
                                              <TableHead className="text-right font-semibold py-2">
                                                Total Value
                                              </TableHead>
                                            </TableRow>
                                          </TableHeader>
                                          <TableBody>
                                            {product.variations.map((v, i) => (
                                              <TableRow
                                                key={i}
                                                className="hover:bg-muted/30"
                                              >
                                                <TableCell className="py-2 font-medium">
                                                  {v.name || "-"}
                                                </TableCell>
                                                <TableCell className="py-2">
                                                  {v.value || "-"}
                                                </TableCell>
                                                <TableCell className="py-2 font-mono text-primary">
                                                  {v.sku || "-"}
                                                </TableCell>
                                                <TableCell className="text-right py-2">
                                                  <span
                                                    className={
                                                      v.stock > 0
                                                        ? "text-green-600 dark:text-green-400"
                                                        : "text-red-600 dark:text-red-400 font-semibold"
                                                    }
                                                  >
                                                    {v.stock || 0}
                                                  </span>
                                                </TableCell>
                                                <TableCell className="text-right py-2">
                                                  {v.unitCost?.toFixed(2) ||
                                                    "0.00"}
                                                </TableCell>
                                                <TableCell className="text-right py-2 font-semibold">
                                                  {formatCurrency(
                                                    (v.stock || 0) *
                                                      (v.unitCost || 0),
                                                    product.currency || "USD",
                                                  )}
                                                </TableCell>
                                              </TableRow>
                                            ))}
                                          </TableBody>
                                        </Table>
                                      </div>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              )}
                          </Fragment>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Summary Card */}
            {products.length > 0 && (
              <Card className="p-4 sm:p-6 border-2 shadow-lg bg-gradient-to-br from-background to-muted/20">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="h-1 w-8 bg-primary rounded"></span>
                  Inventory Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Total Products
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-primary">
                      {filteredProducts.length}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Total Stock
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {filteredProducts.reduce(
                        (sum, p) =>
                          sum +
                          (p.hasVariations && p.variations
                            ? p.variations.reduce(
                                (vSum, v) => vSum + (v.stock || 0),
                                0,
                              )
                            : p.stock || 0),
                        0,
                      )}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Total Value
                    </p>
                    <p className="text-xl sm:text-3xl font-bold text-green-600 dark:text-green-400 truncate">
                      {formatCurrency(
                        filteredProducts.reduce(
                          (sum, p) =>
                            sum +
                            (p.hasVariations && p.variations
                              ? p.variations.reduce(
                                  (vSum, v) =>
                                    vSum + (v.stock || 0) * (v.unitCost || 0),
                                  0,
                                )
                              : (p.stock || 0) * (p.unitCost || 0)),
                          0,
                        ),
                      )}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] sm:text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                      <AlertCircle className="h-3 w-3" />
                      Out of Stock
                    </p>
                    <p className="text-2xl sm:text-3xl font-bold text-red-600 dark:text-red-400">
                      {
                        filteredProducts.filter((p) => {
                          const totalStock =
                            p.hasVariations && p.variations
                              ? p.variations.reduce(
                                  (sum, v) => sum + (v.stock || 0),
                                  0,
                                )
                              : p.stock;
                          return totalStock === 0;
                        }).length
                      }
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
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      }
    >
      <InventoryContent />
    </Suspense>
  );
}
