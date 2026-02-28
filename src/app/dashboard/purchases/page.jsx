"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import {
  Package,
  Printer,
  FileText,
  CheckCircle2,
  Truck,
  Store,
  MapPin,
  Clock,
  DollarSign,
} from "lucide-react";
import { format } from "date-fns";

export default function PurchaseHistoryPage() {
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPurchases();
  }, []);

  const fetchPurchases = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/vendor-purchases");
      const data = await response.json();

      if (response.ok) {
        setPurchases(data.purchases || []);
      } else {
        toast.error(data.error || "Failed to fetch purchase history");
      }
    } catch (error) {
      toast.error("An error occurred while fetching purchase history");
    } finally {
      setLoading(false);
    }
  };

  // Calculate Summary Metrics
  const totalSpent = purchases.reduce((sum, p) => sum + p.totalCost, 0);
  const totalOrders = purchases.length;
  const activeOrders = purchases.filter(
    (p) => p.status === "pending" || p.status === "processing",
  ).length;

  const handlePrintInvoice = (order) => {
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
        <title>Purchase Receipt #${orderId}</title>
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
        </style>
      </head>
      <body>
        <div class="header">
          <div class="logo">Purchase Receipt</div>
          <div class="invoice-details">
            <h1>RECEIPT</h1>
            <p class="meta">Order #${orderId}</p>
            <p class="meta">Date: ${orderDate}</p>
            <p class="meta">Status: <strong style="text-transform: uppercase;">${order.status}</strong></p>
          </div>
        </div>
        <div class="addresses">
          <div class="address-box">
            <h3>Purchased From</h3>
            <p><strong>${vendorName}</strong></p>
            <p>${vendorEmail}</p>
          </div>
          <div class="address-box">
            <h3>Ship To</h3>
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
              <td><strong>${order.productSnapshot?.name || "Product"}</strong></td>
              <td>${order.productSnapshot?.sku || "-"}</td>
              <td class="text-right">${order.quantity}</td>
              <td class="text-right">${currency} ${(order.productSnapshot?.unitCost || 0).toFixed(2)}</td>
              <td class="text-right">${currency} ${total}</td>
            </tr>
          </tbody>
        </table>
        <div class="totals">
          <div class="totals-row"><span>Subtotal:</span><span>${currency} ${total}</span></div>
          <div class="totals-row final"><span>Total Paid:</span><span>${currency} ${total}</span></div>
        </div>
        <div class="footer">
          <p>Thank you for your purchase!</p>
          ${order.trackingNumber ? `<p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>` : ""}
        </div>
        <script>window.onload = function() { window.print(); }</script>
      </body>
      </html>
    `;

    const printWindow = window.open("", "_blank", "width=900,height=800");
    if (printWindow) {
      printWindow.document.write(invoiceHTML);
      printWindow.document.close();
    }
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
          <div className="space-y-6">
            {/* Page Header */}
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Purchase History
              </h1>
              <p className="text-muted-foreground mt-1">
                Track and manage orders you have placed with your vendors
              </p>
            </div>

            {/* Clean Stats Row */}
            {!loading && purchases.length > 0 && (
              <div className="grid gap-4 md:grid-cols-3">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Spent
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      ${totalSpent.toFixed(2)}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Orders
                    </CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {totalOrders}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Active Orders
                    </CardTitle>
                    <Truck className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-foreground">
                      {activeOrders}
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}

            {/* Standard Table Card */}
            <Card className="border shadow-sm">
              <CardHeader className="pb-3 bg-muted/20">
                <CardTitle className="text-lg">My Vendor Orders</CardTitle>
                <CardDescription>
                  Review your recent purchases and tracking details.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/10">
                        <TableHead className="w-[140px]">Date / ID</TableHead>
                        <TableHead className="w-[200px]">Vendor</TableHead>
                        <TableHead className="w-[250px]">
                          Product Details
                        </TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                        <TableHead className="w-[200px]">
                          Status & Tracking
                        </TableHead>
                        <TableHead className="text-right pr-6">
                          Actions
                        </TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loading ? (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-12">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto"></div>
                          </TableCell>
                        </TableRow>
                      ) : purchases.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={6}
                            className="text-center py-16 text-muted-foreground"
                          >
                            <Package className="h-10 w-10 opacity-30 mx-auto mb-3" />
                            <p className="font-medium">No purchases found</p>
                            <p className="text-sm">
                              You haven't bought any products from vendors yet.
                            </p>
                          </TableCell>
                        </TableRow>
                      ) : (
                        purchases.map((purchase) => (
                          <TableRow
                            key={purchase._id}
                            className="hover:bg-muted/5"
                          >
                            {/* Date & ID */}
                            <TableCell className="align-top">
                              <div className="flex flex-col gap-1">
                                <span className="font-medium text-sm">
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

                            {/* Vendor Info */}
                            <TableCell className="align-top">
                              <div className="flex flex-col gap-1">
                                <span className="font-medium flex items-center gap-1.5 text-sm">
                                  <Store className="h-3.5 w-3.5 text-muted-foreground" />
                                  {purchase.vendorId?.name || "Unknown Vendor"}
                                </span>
                                <span className="text-xs text-muted-foreground truncate max-w-[180px]">
                                  {purchase.vendorId?.email}
                                </span>
                              </div>
                            </TableCell>

                            {/* Product Info */}
                            <TableCell className="align-top">
                              <div className="flex flex-col gap-1">
                                <span className="font-medium text-sm text-foreground">
                                  {purchase.productSnapshot?.name ||
                                    "Product Unavailable"}
                                </span>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <Badge
                                    variant="outline"
                                    className="font-mono text-[10px] w-fit"
                                  >
                                    {purchase.productSnapshot?.sku || "NO-SKU"}
                                  </Badge>
                                </div>
                              </div>
                            </TableCell>

                            {/* Amount & Qty */}
                            <TableCell className="text-right align-top">
                              <div className="flex flex-col gap-1">
                                <span className="font-semibold text-sm">
                                  {purchase.productSnapshot?.currency || "USD"}{" "}
                                  {purchase.totalCost.toFixed(2)}
                                </span>
                                <span className="text-xs text-muted-foreground">
                                  Qty: {purchase.quantity}
                                </span>
                              </div>
                            </TableCell>

                            {/* Status & Tracking */}
                            <TableCell className="align-top">
                              <div className="flex flex-col gap-2">
                                <Badge
                                  variant="outline"
                                  className={`w-fit uppercase text-[10px] ${
                                    purchase.status === "completed"
                                      ? "border-green-200 bg-green-50 text-green-700"
                                      : purchase.status === "cancelled"
                                        ? "border-red-200 bg-red-50 text-red-700"
                                        : purchase.status === "processing"
                                          ? "border-blue-200 bg-blue-50 text-blue-700"
                                          : "bg-yellow-50 text-yellow-700 border-yellow-200"
                                  }`}
                                >
                                  {purchase.status}
                                </Badge>

                                <div className="flex flex-col gap-1 mt-1">
                                  <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                                    <Truck className="h-3 w-3" /> Tracking
                                    Number
                                  </span>
                                  {purchase.trackingNumber ? (
                                    <span className="text-xs font-mono font-medium">
                                      {purchase.trackingNumber}
                                    </span>
                                  ) : (
                                    <span className="text-xs text-muted-foreground italic">
                                      Awaiting Tracking
                                    </span>
                                  )}
                                </div>
                              </div>
                            </TableCell>

                            {/* Actions & Documents */}
                            <TableCell className="align-top text-right pr-6">
                              <div className="flex flex-col items-end gap-2">
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handlePrintInvoice(purchase)}
                                  className="h-8 text-xs w-[110px] flex justify-start"
                                >
                                  <Printer className="mr-2 h-3.5 w-3.5" />{" "}
                                  Receipt
                                </Button>

                                <div className="flex flex-col gap-1.5 items-end">
                                  {purchase.paymentProofs?.length > 0 && (
                                    <a
                                      href={purchase.paymentProofs[0]?.path}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-xs text-green-700 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-md border border-green-100 dark:border-green-900/30 hover:underline w-[110px]"
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
                                      className="inline-flex items-center gap-1.5 text-xs text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-2 py-1 rounded-md border border-blue-100 dark:border-blue-900/30 hover:underline w-[110px]"
                                    >
                                      <MapPin className="h-3 w-3" /> Label
                                    </a>
                                  )}
                                  {purchase.packingSlips?.length > 0 && (
                                    <a
                                      href={purchase.packingSlips[0]?.path}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1.5 text-xs text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-900/20 px-2 py-1 rounded-md border border-purple-100 dark:border-purple-900/30 hover:underline w-[110px]"
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
