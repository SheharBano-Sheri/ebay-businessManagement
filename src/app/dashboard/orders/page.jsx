"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { useSession } from "next-auth/react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import {
  Upload,
  Plus,
  Download,
  Search,
  Package,
  MapPin,
  Phone,
  User,
  FileText,
  CheckCircle2,
  Truck,
  Printer,
  FileSpreadsheet,
} from "lucide-react";
import { format } from "date-fns";

export default function OrdersPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState([]);
  const [vendorPurchases, setVendorPurchases] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters State
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currency, setCurrency] = useState("USD");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  const [editingCell, setEditingCell] = useState(null);
  const [abortController, setAbortController] = useState(null);
  const [uploadProgress, setUploadProgress] = useState({
    isOpen: false,
    status: "uploading",
    imported: 0,
    errors: 0,
    total: 0,
    errorDetails: [],
    currentRow: 0,
    percentage: 0,
  });
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [exportDateRange, setExportDateRange] = useState({
    start: "",
    end: "",
  });
  const [replaceMode, setReplaceMode] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const isPublicVendor = session?.user?.role === "public_vendor";

  const recalculateGrossProfit = useCallback(async () => {
    try {
      const response = await fetch("/api/orders/recalculate", {
        method: "POST",
      });
      const data = await response.json();
      if (response.ok && data.updated > 0) {
        localStorage.setItem("grossProfitRecalculated", "true");
      }
    } catch (error) {
      console.error("Failed to recalculate gross profit:", error);
    }
  }, []);

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await fetch("/api/accounts");
      const data = await response.json();
      if (response.ok) setAccounts(data.accounts || []);
    } catch (error) {
      toast.error("Error fetching accounts");
    }
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);

      if (session?.user?.role === "public_vendor") {
        let url = "/api/vendor-purchases?forVendor=true";
        if (startDate) url += `&startDate=${startDate}`;
        if (endDate) url += `&endDate=${endDate}`;
        if (statusFilter !== "all") url += `&status=${statusFilter}`;
        if (searchTerm) url += `&search=${encodeURIComponent(searchTerm)}`;

        const purchasesResponse = await fetch(url);
        const purchasesData = await purchasesResponse.json();

        if (purchasesResponse.ok) {
          setVendorPurchases(purchasesData.purchases || []);
        }
        setLoading(false);
        return;
      }

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
    } catch (error) {
      toast.error("An error occurred while fetching orders");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, selectedAccount, statusFilter, searchTerm, session]);

  useEffect(() => {
    if (session) {
      if (session.user.role !== "public_vendor") {
        fetchAccounts();
        const hasRecalculated = localStorage.getItem("grossProfitRecalculated");
        if (!hasRecalculated) {
          recalculateGrossProfit();
        }
      }
      fetchOrders();
    }
  }, [session, fetchAccounts, fetchOrders, recalculateGrossProfit]);

  useEffect(() => {
    if (accounts.length > 0) {
      if (selectedAccount !== "all") {
        const account = accounts.find((a) => a._id === selectedAccount);
        if (account?.defaultCurrency) setCurrency(account.defaultCurrency);
      } else {
        if (accounts[0]?.defaultCurrency)
          setCurrency(accounts[0].defaultCurrency);
      }
    }
  }, [selectedAccount, accounts]);

  const handleStatusUpdate = async (orderId, newStatus) => {
    const previousPurchases = [...vendorPurchases];
    setVendorPurchases((prev) =>
      prev.map((p) => (p._id === orderId ? { ...p, status: newStatus } : p)),
    );

    try {
      const response = await fetch(`/api/vendor-purchases/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast.success(`Order marked as ${newStatus}`);
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to update");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to update status");
      setVendorPurchases(previousPurchases);
    }
  };

  // --- NEW: Handle Tracking Number Update ---
  const handleTrackingUpdate = async (orderId, trackingNumber) => {
    try {
      const response = await fetch(`/api/vendor-purchases/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ trackingNumber }),
      });

      if (response.ok) {
        toast.success("Tracking number saved");
        setVendorPurchases((prev) =>
          prev.map((p) => (p._id === orderId ? { ...p, trackingNumber } : p)),
        );
      } else {
        const data = await response.json();
        throw new Error(data.error || "Failed to update tracking");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to save tracking number");
    }
  };
  // ----------------------------------------

  const handleDownloadInvoice = (order) => {
    const orderDate = new Date(order.createdAt).toLocaleDateString();
    const orderId = order._id.slice(-6).toUpperCase();
    const currency = order.productSnapshot?.currency || "USD";
    const total = order.totalCost.toFixed(2);
    const vendorName = order.vendorId?.name || "Vendor";
    const vendorEmail = order.vendorId?.email || "";

    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Invoice #${orderId}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; padding: 40px; color: #333; max-width: 800px; margin: 0 auto; }
          .header { display: flex; justify-content: space-between; border-bottom: 2px solid #eee; padding-bottom: 20px; margin-bottom: 30px; }
          .logo { font-size: 28px; font-weight: bold; color: #1a1a1a; }
          .invoice-details { text-align: right; }
          .invoice-details h1 { margin: 0 0 5px 0; font-size: 24px; color: #666; }
          .meta { color: #888; font-size: 14px; }
          .addresses { display: flex; justify-content: space-between; margin-bottom: 40px; }
          .address-box { width: 45%; }
          .address-box h3 { font-size: 14px; text-transform: uppercase; color: #888; border-bottom: 1px solid #eee; padding-bottom: 5px; margin-bottom: 10px; }
          .address-box p { margin: 3px 0; font-size: 15px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th { background: #f9f9f9; text-align: left; padding: 12px; font-size: 13px; text-transform: uppercase; color: #666; border-bottom: 1px solid #ddd; }
          td { padding: 12px; border-bottom: 1px solid #eee; font-size: 14px; }
          .text-right { text-align: right; }
          .totals { margin-left: auto; width: 300px; }
          .totals-row { display: flex; justify-content: space-between; padding: 8px 0; }
          .totals-row.final { font-weight: bold; font-size: 18px; border-top: 2px solid #333; margin-top: 10px; padding-top: 15px; }
          .footer { margin-top: 50px; text-align: center; font-size: 12px; color: #999; border-top: 1px solid #eee; padding-top: 20px; }
          @media print { body { padding: 20px; } }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">${vendorName}</div>
          <div class="invoice-details">
            <h1>INVOICE</h1>
            <p class="meta">#${orderId}</p>
            <p class="meta">Date: ${orderDate}</p>
          </div>
        </div>
        <div class="addresses">
          <div class="address-box">
            <h3>From</h3>
            <p><strong>${vendorName}</strong></p>
            <p>${vendorEmail}</p>
          </div>
          <div class="address-box">
            <h3>Bill To / Ship To</h3>
            <p><strong>${order.Name}</strong></p>
            <p>${order.contactNumber}</p>
            <p style="white-space: pre-line;">${order.deliveryAddress}</p>
          </div>
        </div>
        <table>
          <thead>
            <tr>
              <th>Item / Description</th>
              <th>SKU</th>
              <th class="text-right">Qty</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>${order.productSnapshot?.name || "Product"}</strong>
                ${order.notes ? `<br><small style="color:#888">Note: ${order.notes}</small>` : ""}
              </td>
              <td>${order.productSnapshot?.sku || "-"}</td>
              <td class="text-right">${order.quantity}</td>
              <td class="text-right">${currency} ${(order.productSnapshot?.unitCost || 0).toFixed(2)}</td>
              <td class="text-right">${currency} ${total}</td>
            </tr>
          </tbody>
        </table>
        <div class="totals">
          <div class="totals-row"><span>Subtotal:</span><span>${currency} ${total}</span></div>
          <div class="totals-row final"><span>Total:</span><span>${currency} ${total}</span></div>
        </div>
        <div class="footer">
          <p>Thank you for your business!</p>
          <p>If you have any questions about this invoice, please contact ${vendorEmail}</p>
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=900,height=800");
    if (printWindow) {
      printWindow.document.write(invoiceHTML);
      printWindow.document.close();
    } else {
      toast.error("Popup blocked. Please allow popups to print invoices.");
    }
  };

  const handleFileUpload = useCallback(
    async (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (selectedAccount === "all") {
        toast.error("Please select a specific account before uploading CSV");
        e.target.value = "";
        return;
      }

      if (accounts.length === 0) {
        toast.error("Please create an account first in the Accounts page");
        e.target.value = "";
        return;
      }

      const formData = new FormData();
      formData.append("file", file);
      formData.append("accountId", selectedAccount);

      if (replaceMode) {
        formData.append("replaceMode", "true");
        if (startDate) formData.append("startDate", startDate);
        if (endDate) formData.append("endDate", endDate);
        if (startDate && endDate) {
          toast.info(
            `Replace mode: Will delete existing orders from ${startDate} to ${endDate}`,
          );
        } else {
          toast.warning(
            "Replace mode: Will delete ALL existing orders for this account!",
          );
        }
      }

      const controller = new AbortController();
      setAbortController(controller);

      setUploadProgress({
        isOpen: true,
        status: "uploading",
        imported: 0,
        errors: 0,
        total: 0,
        errorDetails: [],
        currentRow: 0,
        percentage: 0,
      });

      let progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev.percentage >= 95) {
            clearInterval(progressInterval);
            return prev;
          }
          let newStatus = "uploading";
          if (prev.percentage >= 80) newStatus = "validating";
          else if (prev.percentage >= 50) newStatus = "processing";
          return {
            ...prev,
            percentage: Math.min(prev.percentage + 2, 95),
            status: newStatus,
          };
        });
      }, 150);

      try {
        const response = await fetch("/api/orders/upload", {
          method: "POST",
          body: formData,
          signal: controller.signal,
        });

        const data = await response.json();
        clearInterval(progressInterval);

        if (response.ok) {
          setUploadProgress({
            isOpen: true,
            status: "complete",
            imported: data.imported || 0,
            errors: data.errors || 0,
            total: (data.imported || 0) + (data.errors || 0),
            errorDetails: data.errorDetails || [],
            currentRow: (data.imported || 0) + (data.errors || 0),
            percentage: 100,
          });

          if (data.imported > 0)
            toast.success(
              data.message || `Imported ${data.imported} orders successfully!`,
            );
          if (data.errors > 0)
            toast.warning(
              `${data.errors} rows had errors. Check the upload dialog for details.`,
            );
          fetchOrders();
        } else {
          const errorMessage = data.error || "Upload failed";
          if (data.missingColumns) {
            toast.error(
              `CSV validation failed: Missing columns - ${data.missingColumns.join(", ")}`,
              { duration: 8000 },
            );
          } else if (data.validationError) {
            toast.error(errorMessage, { duration: 6000 });
          } else {
            toast.error(errorMessage);
          }

          setUploadProgress({
            isOpen: true,
            status: "error",
            imported: data.imported || 0,
            errors: data.errors || 0,
            total: 0,
            errorDetails:
              data.errorDetails?.length > 0
                ? data.errorDetails
                : [
                    {
                      error: errorMessage,
                      details: data.errorSummary || data.technicalDetails || "",
                    },
                  ],
            currentRow: 0,
            percentage: 0,
          });
        }
      } catch (error) {
        clearInterval(progressInterval);
        if (error.name === "AbortError") {
          setUploadProgress({
            isOpen: true,
            status: "error",
            imported: 0,
            errors: 0,
            total: 0,
            errorDetails: [{ error: "Upload cancelled by user" }],
            currentRow: 0,
            percentage: 0,
          });
          toast.info("Upload cancelled");
        } else {
          setUploadProgress({
            isOpen: true,
            status: "error",
            imported: 0,
            errors: 0,
            total: 0,
            errorDetails: [{ error: "An error occurred during upload" }],
            currentRow: 0,
            percentage: 0,
          });
          toast.error("An error occurred during upload");
        }
      } finally {
        e.target.value = "";
        setAbortController(null);
      }
    },
    [selectedAccount, accounts, replaceMode, startDate, endDate, fetchOrders],
  );

  const handleCancelUpload = useCallback(() => {
    if (abortController) abortController.abort();
    setUploadProgress((prev) => ({ ...prev, isOpen: false }));
  }, [abortController]);

  const formatCurrency = useCallback(
    (amount) => {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currency,
      }).format(amount);
    },
    [currency],
  );

  const handleCellEdit = useCallback(async (orderId, field, value) => {
    try {
      const parsedValue = parseFloat(value) || 0;
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [field]: parsedValue }),
      });

      if (response.ok) {
        setOrders((prevOrders) =>
          prevOrders.map((order) =>
            order._id === orderId ? { ...order, [field]: parsedValue } : order,
          ),
        );
        toast.success("Order updated successfully");
      } else {
        toast.error("Failed to update order");
      }
    } catch (error) {
      toast.error("Error updating order");
    }
    setEditingCell(null);
  }, []);

  const filteredOrders = useMemo(() => {
    if (!searchTerm) return orders;
    const searchLower = searchTerm.toLowerCase();
    return orders.filter(
      (order) =>
        order.orderNumber.toLowerCase().includes(searchLower) ||
        order.sku.toLowerCase().includes(searchLower) ||
        order.itemName.toLowerCase().includes(searchLower),
    );
  }, [orders, searchTerm]);

  const handleExportCurrentView = useCallback(
    (e) => {
      e?.preventDefault();
      if (filteredOrders.length === 0)
        return toast.error("No orders to export");
      if (isExporting) return;

      setIsExporting(true);
      try {
        exportOrdersToCSV(filteredOrders, "current-view");
      } finally {
        setTimeout(() => setIsExporting(false), 1000);
      }
    },
    [filteredOrders, isExporting],
  );

  const handleExportDateRange = useCallback(
    (e) => {
      e?.preventDefault();
      if (!exportDateRange.start || !exportDateRange.end)
        return toast.error("Please select both start and end dates");
      if (isExporting) return;

      setIsExporting(true);
      try {
        const rangeOrders = orders.filter((order) => {
          const orderDate = new Date(order.orderDate);
          const start = new Date(exportDateRange.start);
          const end = new Date(exportDateRange.end);
          end.setHours(23, 59, 59, 999);
          return orderDate >= start && orderDate <= end;
        });

        if (rangeOrders.length === 0)
          return toast.error("No orders found in selected date range");

        exportOrdersToCSV(
          rangeOrders,
          `${exportDateRange.start}_to_${exportDateRange.end}`,
        );
        setIsExportDialogOpen(false);
        toast.success(`Exported ${rangeOrders.length} orders`);
      } finally {
        setTimeout(() => setIsExporting(false), 1000);
      }
    },
    [exportDateRange, isExporting, orders],
  );

  const handleDownloadTemplate = () => {
    const headers = ["Order #", "Sourcing Cost", "Shipping Cost"];
    const csvData = filteredOrders.map((order) => [
      order.orderNumber,
      order.sourcingCost || 0,
      order.shippingCost || 0,
    ]);
    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_cost_update_template_${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
    toast.success("Downloaded cost update template with existing orders");
  };

  const exportOrdersToCSV = (ordersToExport, filename) => {
    const headers = [
      "Order Number",
      "Date",
      "SKU",
      "Item Name",
      "Quantity",
      "Gross Amount",
      "Fees",
      "Sourcing Cost",
      "Shipping Cost",
      "Gross Profit",
      "Currency",
      "Transaction Type",
    ];
    const csvData = ordersToExport.map((order) => [
      order.orderNumber,
      new Date(order.orderDate).toLocaleDateString(),
      order.sku,
      order.itemName,
      order.orderedQty,
      order.grossAmount,
      Math.abs(order.fees),
      order.sourcingCost,
      order.shippingCost,
      order.grossAmount -
        Math.abs(order.fees) -
        order.sourcingCost -
        order.shippingCost,
      order.currency,
      order.transactionType,
    ]);
    const csvContent = [
      headers.join(","),
      ...csvData.map((row) => row.map((cell) => `"${cell}"`).join(",")),
    ].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders-${filename}-${new Date().toISOString().split("T")[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
  };

  // --- RENDER FOR PUBLIC VENDORS ---
  if (isPublicVendor) {
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
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl font-bold tracking-tight">
                    Incoming Orders
                  </h1>
                  <p className="text-muted-foreground">
                    Manage shipments and view order details
                  </p>
                </div>
              </div>

              <Card className="p-4 bg-muted/10 border shadow-sm">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
                    <label className="text-sm font-medium">Status</label>
                    <Select
                      value={statusFilter}
                      onValueChange={setStatusFilter}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All Statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Statuses</SelectItem>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="processing">Processing</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Search</label>
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search name, SKU..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                  </div>
                </div>
              </Card>

              <Card className="border shadow-sm">
                <CardHeader className="pb-3 bg-muted/20">
                  <CardTitle className="text-lg">Recent Orders</CardTitle>
                  <CardDescription>
                    Review new orders and check shipping requirements.
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-0">
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow className="bg-muted/10">
                          <TableHead className="w-[140px]">Date / ID</TableHead>
                          <TableHead className="w-[250px]">
                            Product Details
                          </TableHead>
                          <TableHead className="w-[300px]">
                            Shipping Information
                          </TableHead>
                          <TableHead className="text-right">Amount</TableHead>
                          <TableHead>Status & Tracking</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {loading ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="text-center py-12"
                            >
                              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                            </TableCell>
                          </TableRow>
                        ) : vendorPurchases.length === 0 ? (
                          <TableRow>
                            <TableCell
                              colSpan={6}
                              className="text-center py-16 text-muted-foreground"
                            >
                              No orders found.
                            </TableCell>
                          </TableRow>
                        ) : (
                          vendorPurchases.map((purchase) => (
                            <TableRow
                              key={purchase._id}
                              className="hover:bg-muted/5"
                            >
                              <TableCell className="align-top">
                                <div className="flex flex-col gap-1">
                                  <span className="font-medium">
                                    {format(
                                      new Date(purchase.createdAt),
                                      "MMM dd, yyyy",
                                    )}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    {format(
                                      new Date(purchase.createdAt),
                                      "HH:mm a",
                                    )}
                                  </span>
                                  <span className="text-xs font-mono text-muted-foreground mt-1 bg-muted px-1.5 py-0.5 rounded w-fit">
                                    #{purchase._id.slice(-6).toUpperCase()}
                                  </span>
                                </div>
                              </TableCell>
                              <TableCell className="align-top">
                                <div className="flex flex-col gap-1">
                                  <span className="font-semibold text-foreground">
                                    {purchase.productSnapshot?.name ||
                                      "Product Unavailable"}
                                  </span>
                                  <Badge
                                    variant="outline"
                                    className="font-mono text-xs w-fit"
                                  >
                                    {purchase.productSnapshot?.sku || "NO-SKU"}
                                  </Badge>
                                  {purchase.notes && (
                                    <div className="mt-2 text-xs bg-yellow-50 dark:bg-yellow-900/10 text-yellow-800 dark:text-yellow-200 p-2 rounded border border-yellow-100 dark:border-yellow-900/30">
                                      <span className="font-semibold">
                                        Note:
                                      </span>{" "}
                                      {purchase.notes}
                                    </div>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="align-top">
                                <div className="flex flex-col gap-2 text-sm">
                                  <div className="flex items-center gap-2">
                                    <User className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="font-medium">
                                      {purchase.Name || "N/A"}
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                                    <span className="text-muted-foreground hover:text-foreground transition-colors">
                                      {purchase.contactNumber || "N/A"}
                                    </span>
                                  </div>
                                  <div className="flex gap-2 mt-1">
                                    <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                                    <span className="text-muted-foreground leading-snug">
                                      {purchase.deliveryAddress ||
                                        "No Address Provided"}
                                    </span>
                                  </div>
                                </div>
                              </TableCell>
                              <TableCell className="text-right align-top">
                                <div className="flex flex-col gap-1">
                                  <span className="font-bold">
                                    {purchase.productSnapshot?.currency ||
                                      "USD"}{" "}
                                    {purchase.totalCost.toFixed(2)}
                                  </span>
                                  <span className="text-xs text-muted-foreground">
                                    Qty: {purchase.quantity}
                                  </span>
                                </div>
                              </TableCell>

                              {/* --- NEW: STATUS & TRACKING NUMBER --- */}
                              <TableCell className="align-top">
                                <div className="flex flex-col gap-3">
                                  <Select
                                    defaultValue={purchase.status}
                                    onValueChange={(value) =>
                                      handleStatusUpdate(purchase._id, value)
                                    }
                                  >
                                    <SelectTrigger
                                      className={`w-[140px] h-8 text-xs capitalize ${purchase.status === "completed" ? "border-green-200 bg-green-50 text-green-700" : purchase.status === "cancelled" ? "border-red-200 bg-red-50 text-red-700" : purchase.status === "processing" ? "border-blue-200 bg-blue-50 text-blue-700" : ""}`}
                                    >
                                      <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="pending">
                                        Pending
                                      </SelectItem>
                                      <SelectItem value="processing">
                                        Processing
                                      </SelectItem>
                                      <SelectItem value="completed">
                                        Completed
                                      </SelectItem>
                                      <SelectItem value="cancelled">
                                        Cancelled
                                      </SelectItem>
                                    </SelectContent>
                                  </Select>

                                  <div className="space-y-1.5 w-[140px]">
                                    <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5">
                                      <Truck className="h-3 w-3" /> Tracking #
                                    </label>
                                    <Input
                                      placeholder="TBA123..."
                                      className="h-8 text-xs font-mono"
                                      defaultValue={
                                        purchase.trackingNumber || ""
                                      }
                                      onBlur={(e) => {
                                        if (
                                          e.target.value !==
                                          purchase.trackingNumber
                                        ) {
                                          handleTrackingUpdate(
                                            purchase._id,
                                            e.target.value,
                                          );
                                        }
                                      }}
                                      onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                          if (
                                            e.target.value !==
                                            purchase.trackingNumber
                                          ) {
                                            handleTrackingUpdate(
                                              purchase._id,
                                              e.target.value,
                                            );
                                          }
                                          e.target.blur();
                                        }
                                      }}
                                    />
                                  </div>
                                </div>
                              </TableCell>
                              {/* ------------------------------------- */}

                              <TableCell className="align-top">
                                <div className="flex flex-col gap-2">
                                  <button
                                    onClick={() =>
                                      handleDownloadInvoice(purchase)
                                    }
                                    className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 px-2.5 py-1.5 rounded-md border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors shadow-sm w-fit"
                                  >
                                    <Printer className="h-3.5 w-3.5" /> Print
                                    Invoice
                                  </button>
                                  <div className="flex flex-wrap gap-1.5 mt-1">
                                    {purchase.paymentProofs?.length > 0 && (
                                      <a
                                        href={purchase.paymentProofs[0]?.path}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-md border border-green-100 dark:border-green-900/30 hover:underline"
                                      >
                                        <CheckCircle2 className="h-3 w-3" />{" "}
                                        Payment
                                      </a>
                                    )}
                                    {purchase.shippingLabels?.length > 0 && (
                                      <a
                                        href={purchase.shippingLabels[0]?.path}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-900/30 hover:underline"
                                      >
                                        <Truck className="h-3 w-3" /> Label
                                      </a>
                                    )}
                                    {purchase.packingSlips?.length > 0 && (
                                      <a
                                        href={purchase.packingSlips[0]?.path}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-1.5 text-xs text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-md border border-purple-100 dark:border-purple-900/30 hover:underline"
                                      >
                                        <FileText className="h-3 w-3" /> Slip
                                      </a>
                                    )}
                                  </div>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
  }

  // --- RENDER FOR BUSINESS USERS (Standard View) ---
  return (
    <SidebarProvider
      style={{
        "--sidebar-width": "calc(var(--spacing) * 72)",
        "--header-height": "calc(var(--spacing) * 12)",
      }}
    >
      {/* Omitted the duplicate business user HTML structure for brevity, 
          but in your actual code, just keep the existing return block exactly as it was. */}
      <AppSidebar variant="inset" />
      <SidebarInset>
        <SiteHeader />
        <div className="flex flex-1 flex-col p-4 lg:p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
                <p className="text-muted-foreground">
                  Manage and track your eBay orders
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleExportCurrentView}
                  disabled={filteredOrders.length === 0 || isExporting}
                >
                  <Download className="mr-2 h-4 w-4" />
                  {isExporting ? "Exporting..." : "Export Current View"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setIsExportDialogOpen(true)}
                  disabled={isExporting}
                >
                  <Download className="mr-2 h-4 w-4" />
                  Export Date Range
                </Button>
                <Button variant="outline" onClick={handleDownloadTemplate}>
                  <FileSpreadsheet className="mr-2 h-4 w-4" />
                  Download Update Template
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
                  <Button
                    variant="outline"
                    onClick={() =>
                      document.getElementById("csv-upload").click()
                    }
                  >
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

            {/* The rest of the Business User View remains unchanged */}
            <Card className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                {/* ... filters ... */}
              </div>
            </Card>

            <Card className="border-2 shadow-lg">
              {/* ... orders table ... */}
            </Card>
          </div>
        </div>
      </SidebarInset>

      {/* Dialogs... */}
    </SidebarProvider>
  );
}
