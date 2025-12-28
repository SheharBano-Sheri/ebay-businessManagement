"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { toast } from "sonner";
import { Upload, Plus, Download, Search, Calendar, Package } from "lucide-react";
import { format } from "date-fns";

export default function OrdersPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState([]);
  const [vendorPurchases, setVendorPurchases] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [currency, setCurrency] = useState("USD");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [editingCell, setEditingCell] = useState(null);
  const [abortController, setAbortController] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({
    isOpen: false,
    status: 'uploading',
    imported: 0,
    errors: 0,
    total: 0,
    errorDetails: [],
    currentRow: 0,
    percentage: 0
  });
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportDateRange, setExportDateRange] = useState({ start: '', end: '' });
  const [replaceMode, setReplaceMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  // Define functions before useEffect hooks
  const recalculateGrossProfit = useCallback(async () => {
    try {
      const response = await fetch("/api/orders/recalculate", {
        method: "POST"
      });
      const data = await response.json();
      
      if (response.ok && data.updated > 0) {
        console.log(`Recalculated gross profit for ${data.updated} orders`);
        localStorage.setItem('grossProfitRecalculated', 'true');
      }
    } catch (error) {
      console.error("Failed to recalculate gross profit:", error);
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await fetch("/api/accounts");
      const data = await response.json();
      
      if (response.ok) {
        console.log("Accounts fetched:", data.accounts);
        setAccounts(data.accounts || []);
      } else {
        console.error("Failed to fetch accounts:", data.error);
        toast.error(data.error || "Failed to fetch accounts");
      }
    } catch (error) {
      console.error("Failed to fetch accounts:", error);
      toast.error("Error fetching accounts");
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      let url = "/api/orders?";
      if (startDate) url += `startDate=${startDate}&`;
      if (endDate) url += `endDate=${endDate}&`;
      if (selectedAccount !== "all") url += `account=${selectedAccount}`;

      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        setOrders(data.orders);
      } else {
        toast.error(data.error || "Failed to fetch orders");
      }

      // If user is a public vendor, also fetch vendor purchases
      if (session?.user?.role === 'public_vendor') {
        const purchasesResponse = await fetch('/api/vendor-purchases?forVendor=true');
        const purchasesData = await purchasesResponse.json();
        
        if (purchasesResponse.ok) {
          setVendorPurchases(purchasesData.purchases || []);
        }
      }
    } catch (error) {
      toast.error("An error occurred while fetching orders");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedAccount, session]);

  // useEffect hooks after function definitions
  useEffect(() => {
    if (session) {
      fetchAccounts();
      // Recalculate gross profit for existing orders (one-time fix)
      const hasRecalculated = localStorage.getItem('grossProfitRecalculated');
      if (!hasRecalculated) {
        recalculateGrossProfit();
      }
    }
  }, [session, fetchAccounts, recalculateGrossProfit]);

  useEffect(() => {
    if (session) {
      fetchOrders();
    }
  }, [session, fetchOrders]);

  const handleFileUpload = useCallback(async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check if an account is selected
    if (selectedAccount === "all") {
      toast.error("Please select a specific account before uploading CSV");
      e.target.value = ""; // Reset file input
      return;
    }

    if (accounts.length === 0) {
      toast.error("Please create an account first in the Accounts page");
      e.target.value = ""; // Reset file input
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("accountId", selectedAccount);
    
    // Add replace mode parameters
    if (replaceMode) {
      formData.append("replaceMode", "true");
      if (startDate) formData.append("startDate", startDate);
      if (endDate) formData.append("endDate", endDate);
      
      // Inform user about replace mode
      if (startDate && endDate) {
        toast.info(`Replace mode: Will delete existing orders from ${startDate} to ${endDate}`);
      } else {
        toast.warning("Replace mode: Will delete ALL existing orders for this account!");
      }
    }

    // Create abort controller for cancellation
    const controller = new AbortController();
    setAbortController(controller);

    // Show progress dialog with simulated progress
    setUploadProgress({
      isOpen: true,
      status: 'uploading',
      imported: 0,
      errors: 0,
      total: 0,
      errorDetails: [],
      currentRow: 0,
      percentage: 0
    });

    // Simulate progress updates with smoother increments
    let progressInterval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev.percentage >= 95) {
          clearInterval(progressInterval);
          return prev;
        }
        // Update status messages based on progress
        let newStatus = 'uploading';
        if (prev.percentage >= 80) {
          newStatus = 'validating';
        } else if (prev.percentage >= 50) {
          newStatus = 'processing';
        }
        
        return {
          ...prev,
          percentage: Math.min(prev.percentage + 2, 95),
          status: newStatus
        };
      });
    }, 150);

    try {
      const response = await fetch("/api/orders/upload", {
        method: "POST",
        body: formData,
        signal: controller.signal
      });

      const data = await response.json();
      clearInterval(progressInterval);

      if (response.ok) {
        setUploadProgress({
          isOpen: true,
          status: 'complete',
          imported: data.imported || 0,
          errors: data.errors || 0,
          total: (data.imported || 0) + (data.errors || 0),
          errorDetails: data.errorDetails || [],
          currentRow: (data.imported || 0) + (data.errors || 0),
          percentage: 100
        });
        
        toast.success(`Imported ${data.imported} orders successfully!`);
        if (data.errors > 0) {
          toast.warning(`${data.errors} rows had errors. Check the upload dialog for details.`);
        }
        fetchOrders();
      } else {
        setUploadProgress({
          isOpen: true,
          status: 'error',
          imported: 0,
          errors: 0,
          total: 0,
          errorDetails: [{ error: data.error || "Upload failed" }],
          currentRow: 0,
          percentage: 0
        });
        toast.error(data.error || "Upload failed");
        if (data.details) {
          console.error("Upload error details:", data.details);
        }
      }
    } catch (error) {
      clearInterval(progressInterval);
      if (error.name === 'AbortError') {
        setUploadProgress({
          isOpen: true,
          status: 'error',
          imported: 0,
          errors: 0,
          total: 0,
          errorDetails: [{ error: "Upload cancelled by user" }],
          currentRow: 0,
          percentage: 0
        });
        toast.info("Upload cancelled");
      } else {
        setUploadProgress({
          isOpen: true,
          status: 'error',
          imported: 0,
          errors: 0,
          total: 0,
          errorDetails: [{ error: "An error occurred during upload" }],
          currentRow: 0,
          percentage: 0
        });
        toast.error("An error occurred during upload");
        console.error(error);
      }
    } finally {
      e.target.value = ""; // Reset file input
      setAbortController(null);
    }
  }, [selectedAccount, accounts, replaceMode, startDate, endDate, fetchOrders]);

  const handleCancelUpload = useCallback(() => {
    if (abortController) {
      abortController.abort();
    }
    setUploadProgress(prev => ({ ...prev, isOpen: false }));
  }, [abortController]);

  const formatCurrency = useCallback((amount) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  }, [currency]);

  const handleCellEdit = useCallback(async (orderId, field, value) => {
    try {
      const parsedValue = parseFloat(value) || 0;
      const response = await fetch(`/api/orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: parsedValue })
      });

      if (response.ok) {
        setOrders(prevOrders => 
          prevOrders.map(order => 
            order._id === orderId ? { ...order, [field]: parsedValue } : order
          )
        );
        toast.success('Order updated successfully');
      } else {
        toast.error('Failed to update order');
      }
    } catch (error) {
      toast.error('Error updating order');
    }
    setEditingCell(null);
  }, []);

  // Define filteredOrders before functions that use it
  const filteredOrders = useMemo(() => {
    if (!searchTerm) return orders;
    const searchLower = searchTerm.toLowerCase();
    return orders.filter((order) => (
      order.orderNumber.toLowerCase().includes(searchLower) ||
      order.sku.toLowerCase().includes(searchLower) ||
      order.itemName.toLowerCase().includes(searchLower)
    ));
  }, [orders, searchTerm]);

  const handleExportCurrentView = useCallback((e) => {
    e?.preventDefault();
    if (filteredOrders.length === 0) {
      toast.error('No orders to export');
      return;
    }
    if (isExporting) return;
    
    setIsExporting(true);
    try {
      exportOrdersToCSV(filteredOrders, 'current-view');
    } finally {
      setTimeout(() => setIsExporting(false), 1000);
    }
  }, [filteredOrders, isExporting]);

  const handleExportDateRange = useCallback((e) => {
    e?.preventDefault();
    if (!exportDateRange.start || !exportDateRange.end) {
      toast.error('Please select both start and end dates');
      return;
    }
    if (isExporting) return;

    setIsExporting(true);
    try {
      const rangeOrders = orders.filter(order => {
        const orderDate = new Date(order.orderDate);
        const start = new Date(exportDateRange.start);
        const end = new Date(exportDateRange.end);
        end.setHours(23, 59, 59, 999);
        return orderDate >= start && orderDate <= end;
      });

      if (rangeOrders.length === 0) {
        toast.error('No orders found in selected date range');
        return;
      }

      exportOrdersToCSV(rangeOrders, `${exportDateRange.start}_to_${exportDateRange.end}`);
      setIsExportDialogOpen(false);
      toast.success(`Exported ${rangeOrders.length} orders`);
    } finally {
      setTimeout(() => setIsExporting(false), 1000);
    }
  }, [exportDateRange, isExporting, orders]);

  const exportOrdersToCSV = (ordersToExport, filename) => {

    const headers = [
      'Order Number', 'Date', 'SKU', 'Item Name', 'Quantity', 
      'Gross Amount', 'Fees', 'Sourcing Cost', 'Shipping Cost', 
      'Gross Profit', 'Currency', 'Transaction Type'
    ];

    const csvData = ordersToExport.map(order => [
      order.orderNumber,
      new Date(order.orderDate).toLocaleDateString(),
      order.sku,
      order.itemName,
      order.orderedQty,
      order.grossAmount,
      Math.abs(order.fees),
      order.sourcingCost,
      order.shippingCost,
      order.grossAmount - Math.abs(order.fees) - order.sourcingCost - order.shippingCost,
      order.currency,
      order.transactionType
    ]);

    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${filename}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
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
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
                <p className="text-muted-foreground">
                  Manage and track your eBay orders
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExportCurrentView} disabled={filteredOrders.length === 0 || isExporting}>
                  <Download className="mr-2 h-4 w-4" />
                  {isExporting ? 'Exporting...' : 'Export Current View'}
                </Button>
                <Button variant="outline" onClick={() => setIsExportDialogOpen(true)} disabled={isExporting}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Date Range
                </Button>
                <div className="flex items-center gap-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={replaceMode}
                      onChange={(e) => setReplaceMode(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    <span>Replace existing orders</span>
                  </label>
                  <Button variant="outline" onClick={() => document.getElementById('csv-upload').click()}>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload CSV
                  </Button>
                  <input
                    id="csv-upload"
                    type="file"
                    accept=".csv"
                    className="hidden"
                    onChange={handleFileUpload}
                  />
                </div>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Order
                </Button>
              </div>
            </div>

            {/* Filters */}
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Start Date</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">End Date</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Account</label>
                  <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select account" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Accounts</SelectItem>
                      {accounts.map((account) => (
                        <SelectItem key={account._id} value={account._id}>
                          {account.accountName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Currency</label>
                  <Select value={currency} onValueChange={setCurrency}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="USD">USD</SelectItem>
                      <SelectItem value="EUR">EUR</SelectItem>
                      <SelectItem value="GBP">GBP</SelectItem>
                      <SelectItem value="CAD">CAD</SelectItem>
                      <SelectItem value="AUD">AUD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Search</label>
                  <div className="relative">
                    <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search orders..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-8"
                    />
                  </div>
                </div>
              </div>
              {selectedAccount !== "all" && accounts.length > 0 && (
                <div className="mt-3 text-sm text-muted-foreground">
                  Selected account: <strong>{accounts.find(a => a._id === selectedAccount)?.accountName}</strong>
                </div>
              )}
              {accounts.length === 0 && (
                <div className="mt-3 text-sm text-amber-600">
                  No accounts found. Please create an account in the Accounts page before uploading orders.
                </div>
              )}
            </Card>

            {/* Orders Table */}
            <Card className="border-2 shadow-lg">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-primary/10 to-primary/5 border-b-2">
                      <TableHead className="font-bold border-r">DATE</TableHead>
                      <TableHead className="font-bold border-r">ORDER #</TableHead>
                      <TableHead className="font-bold border-r">SKU</TableHead>
                      <TableHead className="font-bold border-r">ITEM</TableHead>
                      <TableHead className="text-right font-bold border-r">QTY</TableHead>
                      <TableHead className="font-bold border-r">TYPE</TableHead>
                      <TableHead className="text-right font-bold border-r">GROSS AMOUNT</TableHead>
                      <TableHead className="text-right font-bold border-r">FEES</TableHead>
                      <TableHead className="text-right font-bold border-r">SOURCING COST</TableHead>
                      <TableHead className="text-right font-bold border-r">SHIPPING COST</TableHead>
                      <TableHead className="text-right font-bold">GROSS PROFIT</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                            <span className="text-muted-foreground">Loading orders...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredOrders.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <Package className="h-12 w-12 opacity-50" />
                            <p className="text-lg font-medium">No orders found</p>
                            <p className="text-sm">Upload a CSV file to get started</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredOrders.map((order, index) => (
                        <TableRow 
                          key={order._id}
                          className={`hover:bg-muted/50 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
                        >
                          <TableCell className="whitespace-nowrap border-r font-medium">
                            {format(new Date(order.orderDate), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell className="font-semibold border-r text-primary">{order.orderNumber}</TableCell>
                          <TableCell className="border-r font-mono text-sm">{order.sku}</TableCell>
                          <TableCell className="max-w-xs truncate border-r" title={order.itemName}>{order.itemName}</TableCell>
                          <TableCell className="text-right border-r font-medium">{order.orderedQty}</TableCell>
                          <TableCell className="border-r">
                            <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                              order.transactionType === 'Order' || order.transactionType === 'Sale' 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                                : 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                            }`}>
                              {order.transactionType}
                            </span>
                          </TableCell>
                          <TableCell className="text-right font-semibold border-r text-blue-600 dark:text-blue-400">
                            {formatCurrency(order.grossAmount)}
                          </TableCell>
                          <TableCell className="text-right border-r">
                            <span className="font-medium text-red-600 dark:text-red-400">
                              {formatCurrency(Math.abs(order.fees))}
                            </span>
                          </TableCell>
                          <TableCell className="text-right border-r">
                            {editingCell === `${order._id}-sourcingCost` ? (
                              <Input
                                type="number"
                                step="0.01"
                                defaultValue={order.sourcingCost}
                                onBlur={(e) => handleCellEdit(order._id, 'sourcingCost', e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleCellEdit(order._id, 'sourcingCost', e.target.value);
                                  }
                                }}
                                autoFocus
                                className="w-28 h-8 text-right"
                              />
                            ) : (
                              <div 
                                onClick={() => setEditingCell(`${order._id}-sourcingCost`)}
                                className="cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-950 px-2 py-1 rounded transition-colors font-medium text-orange-600 dark:text-orange-400"
                                title="Click to edit"
                              >
                                {formatCurrency(order.sourcingCost)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right border-r">
                            {editingCell === `${order._id}-shippingCost` ? (
                              <Input
                                type="number"
                                step="0.01"
                                defaultValue={order.shippingCost}
                                onBlur={(e) => handleCellEdit(order._id, 'shippingCost', e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    handleCellEdit(order._id, 'shippingCost', e.target.value);
                                  }
                                }}
                                autoFocus
                                className="w-28 h-8 text-right"
                              />
                            ) : (
                              <div 
                                onClick={() => setEditingCell(`${order._id}-shippingCost`)}
                                className="cursor-pointer hover:bg-orange-50 dark:hover:bg-orange-950 px-2 py-1 rounded transition-colors font-medium text-orange-600 dark:text-orange-400"
                                title="Click to edit"
                              >
                                {formatCurrency(order.shippingCost)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <span className="font-bold text-lg text-green-600 dark:text-green-400">
                              {formatCurrency(order.grossAmount - Math.abs(order.fees) - order.sourcingCost - order.shippingCost)}
                            </span>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Summary Card */}
            {filteredOrders.length > 0 && (
              <Card className="p-6 border-2 shadow-lg bg-gradient-to-br from-background to-muted/20">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="h-1 w-8 bg-primary rounded"></span>
                  Order Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Orders</p>
                    <p className="text-3xl font-bold text-primary">{filteredOrders.length}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Gross Revenue</p>
                    <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">
                      {formatCurrency(
                        filteredOrders.reduce((sum, o) => sum + o.grossAmount, 0)
                      )}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Fees</p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(
                        filteredOrders.reduce((sum, o) => sum + Math.abs(o.fees), 0)
                      )}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Costs</p>
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                      {formatCurrency(
                        filteredOrders.reduce(
                          (sum, o) => sum + o.sourcingCost + o.shippingCost,
                          0
                        )
                      )}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Net Profit</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(
                        filteredOrders.reduce((sum, o) => sum + o.grossProfit, 0)
                      )}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {/* Vendor Purchases Section - Only for Public Vendors */}
            {session?.user?.role === 'public_vendor' && vendorPurchases.length > 0 && (
              <Card>
                <div className="p-6 border-b">
                  <h2 className="text-xl font-semibold">Customer Purchase Orders</h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Orders placed by customers for your products
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Product</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
                        <TableHead className="text-right">Total Cost</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Documents</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vendorPurchases.map((purchase) => (
                        <TableRow key={purchase._id}>
                          <TableCell className="whitespace-nowrap">
                            {format(new Date(purchase.createdAt), "dd/MM/yyyy HH:mm")}
                          </TableCell>
                          <TableCell>
                            {purchase.adminId?.name || 'Unknown'}
                            <br />
                            <span className="text-xs text-muted-foreground">{purchase.adminId?.email}</span>
                          </TableCell>
                          <TableCell>{purchase.productSnapshot?.name || 'N/A'}</TableCell>
                          <TableCell className="font-mono text-sm">{purchase.productSnapshot?.sku || 'N/A'}</TableCell>
                          <TableCell className="text-right font-medium">{purchase.quantity}</TableCell>
                          <TableCell className="text-right font-semibold">
                            {purchase.productSnapshot?.currency || 'USD'} {purchase.totalCost.toFixed(2)}
                          </TableCell>
                          <TableCell>
                            <Badge variant={
                              purchase.status === 'completed' ? 'success' :
                              purchase.status === 'processing' ? 'default' :
                              purchase.status === 'cancelled' ? 'destructive' :
                              'secondary'
                            }>
                              {purchase.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1 text-xs">
                              {purchase.paymentProofs?.length > 0 && (
                                <span className="text-green-600">✓ Payment Proof ({purchase.paymentProofs.length})</span>
                              )}
                              {purchase.shippingLabels?.length > 0 && (
                                <span className="text-blue-600">✓ Shipping Label ({purchase.shippingLabels.length})</span>
                              )}
                              {purchase.packingSlips?.length > 0 && (
                                <span className="text-purple-600">✓ Packing Slip ({purchase.packingSlips.length})</span>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            )}
          </div>
        </div>
      </SidebarInset>

      {/* Upload Progress Dialog */}
      <Dialog open={uploadProgress.isOpen} onOpenChange={(open) => setUploadProgress(prev => ({ ...prev, isOpen: open }))}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {(uploadProgress.status === 'uploading' || uploadProgress.status === 'processing' || uploadProgress.status === 'validating') && 'Uploading CSV...'}
              {uploadProgress.status === 'complete' && 'Upload Complete'}
              {uploadProgress.status === 'error' && 'Upload Failed'}
            </DialogTitle>
            <DialogDescription>
              {(uploadProgress.status === 'uploading' || uploadProgress.status === 'processing' || uploadProgress.status === 'validating') && 'Please wait while we process your file...'}
              {uploadProgress.status === 'complete' && 'Your orders have been imported.'}
              {uploadProgress.status === 'error' && 'An error occurred during upload.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {(uploadProgress.status === 'uploading' || uploadProgress.status === 'processing' || uploadProgress.status === 'validating') && (
              <div className="flex flex-col items-center justify-center space-y-4">
                <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                
                {/* Progress Bar */}
                <div className="w-full space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      {uploadProgress.status === 'uploading' && 'Reading CSV file...'}
                      {uploadProgress.status === 'processing' && 'Processing order data...'}
                      {uploadProgress.status === 'validating' && 'Validating and importing...'}
                    </span>
                    <span className="font-semibold text-primary">{uploadProgress.percentage}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
                    <div 
                      className="h-full bg-primary transition-all duration-300 ease-out"
                      style={{ width: `${uploadProgress.percentage}%` }}
                    ></div>
                  </div>
                </div>

                <div className="text-center space-y-1">
                  <p className="text-sm font-medium animate-pulse">
                    {uploadProgress.status === 'uploading' && 'Starting upload...'}
                    {uploadProgress.status === 'processing' && 'Processing order records...'}
                    {uploadProgress.status === 'validating' && 'Finalizing import...'}
                  </p>
                  <p className="text-xs text-muted-foreground">This may take a few moments for large files</p>
                </div>
              </div>
            )}

            {uploadProgress.status === 'complete' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-lg border p-3">
                    <p className="text-sm text-muted-foreground">Total Rows</p>
                    <p className="text-2xl font-bold">{uploadProgress.total}</p>
                  </div>
                  <div className="rounded-lg border bg-green-50 p-3">
                    <p className="text-sm text-green-700">Imported</p>
                    <p className="text-2xl font-bold text-green-600">{uploadProgress.imported}</p>
                  </div>
                </div>
                
                {uploadProgress.errors > 0 && (
                  <div className="rounded-lg border bg-red-50 p-3">
                    <p className="text-sm font-medium text-red-700">Errors: {uploadProgress.errors}</p>
                    <div className="mt-2 max-h-40 overflow-y-auto text-xs text-red-600">
                      {uploadProgress.errorDetails.slice(0, 10).map((err, idx) => (
                        <div key={idx} className="py-1">
                          Row {err.row}: {err.error}
                        </div>
                      ))}
                      {uploadProgress.errorDetails.length > 10 && (
                        <div className="py-1 font-medium">
                          ...and {uploadProgress.errorDetails.length - 10} more errors
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {uploadProgress.status === 'error' && (
              <div className="rounded-lg border bg-red-50 p-4">
                <p className="text-sm text-red-700">
                  {uploadProgress.errorDetails[0]?.error || 'Unknown error occurred'}
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2">
            {uploadProgress.status === 'uploading' && (
              <Button variant="destructive" onClick={handleCancelUpload}>
                Cancel Upload
              </Button>
            )}
            {uploadProgress.status !== 'uploading' && (
              <Button onClick={() => setUploadProgress(prev => ({ ...prev, isOpen: false }))}>
                Close
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Export Date Range Dialog */}
      <Dialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Export Custom Date Range</DialogTitle>
            <DialogDescription>
              Select a date range to export orders
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Start Date</label>
              <Input
                type="date"
                value={exportDateRange.start}
                onChange={(e) => setExportDateRange(prev => ({ ...prev, start: e.target.value }))}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">End Date</label>
              <Input
                type="date"
                value={exportDateRange.end}
                onChange={(e) => setExportDateRange(prev => ({ ...prev, end: e.target.value }))}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setIsExportDialogOpen(false)} disabled={isExporting}>
              Cancel
            </Button>
            <Button onClick={handleExportDateRange} disabled={isExporting}>
              {isExporting ? 'Exporting...' : 'Export'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </SidebarProvider>
  );
}
