"use client";

import { useState, useEffect } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Plus, DollarSign, CreditCard } from "lucide-react";
import { format } from "date-fns";

export default function PaymentsPage() {
  const [payments, setPayments] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const [formData, setFormData] = useState({
    paymentType: "vendor_payment",
    vendorId: "",
    amount: "",
    currency: "USD",
    status: "pending",
    paymentDate: "",
    dueDate: "",
    description: "",
    paymentMethod: "",
  });

  useEffect(() => {
    fetchPayments();
    fetchVendors();
  }, []);

  const fetchPayments = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/payments");
      const data = await response.json();
      
      if (response.ok) {
        setPayments(data.payments);
      } else {
        toast.error(data.error || "Failed to fetch payments");
      }
    } catch (error) {
      toast.error("An error occurred while fetching payments");
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
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Payment recorded successfully!");
        setIsAddDialogOpen(false);
        setFormData({
          paymentType: "vendor_payment",
          vendorId: "",
          amount: "",
          currency: "USD",
          status: "pending",
          paymentDate: "",
          dueDate: "",
          description: "",
          paymentMethod: "",
        });
        fetchPayments();
      } else {
        toast.error(data.error || "Failed to record payment");
      }
    } catch (error) {
      toast.error("An error occurred while recording payment");
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value,
    });
  };

  const formatCurrency = (amount, currency = "USD") => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(amount);
  };

  const getStatusBadge = (status) => {
    const variants = {
      pending: "warning",
      paid: "success",
      failed: "destructive",
      refunded: "secondary",
    };
    return <Badge variant={variants[status] || "default"}>{status}</Badge>;
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
                <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
                <p className="text-muted-foreground">
                  Track vendor payments and subscriptions
                </p>
              </div>
              <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="mr-2 h-4 w-4" />
                    Record Payment
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                  <form onSubmit={handleSubmit}>
                    <DialogHeader>
                      <DialogTitle>Record New Payment</DialogTitle>
                      <DialogDescription>
                        Add a payment transaction to your records
                      </DialogDescription>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="paymentType">Payment Type *</Label>
                        <Select
                          value={formData.paymentType}
                          onValueChange={(value) =>
                            setFormData({ ...formData, paymentType: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="vendor_payment">Vendor Payment</SelectItem>
                            <SelectItem value="subscription_payment">
                              Subscription Payment
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {formData.paymentType === "vendor_payment" && (
                        <div className="space-y-2">
                          <Label htmlFor="vendorId">Vendor</Label>
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
                                  {vendor.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="amount">Amount *</Label>
                          <Input
                            id="amount"
                            name="amount"
                            type="number"
                            step="0.01"
                            value={formData.amount}
                            onChange={handleChange}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="currency">Currency</Label>
                          <Select
                            value={formData.currency}
                            onValueChange={(value) =>
                              setFormData({ ...formData, currency: value })
                            }
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="USD">USD</SelectItem>
                              <SelectItem value="EUR">EUR</SelectItem>
                              <SelectItem value="GBP">GBP</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={formData.status}
                          onValueChange={(value) =>
                            setFormData({ ...formData, status: value })
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="paid">Paid</SelectItem>
                            <SelectItem value="failed">Failed</SelectItem>
                            <SelectItem value="refunded">Refunded</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="paymentDate">Payment Date</Label>
                          <Input
                            id="paymentDate"
                            name="paymentDate"
                            type="date"
                            value={formData.paymentDate}
                            onChange={handleChange}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dueDate">Due Date</Label>
                          <Input
                            id="dueDate"
                            name="dueDate"
                            type="date"
                            value={formData.dueDate}
                            onChange={handleChange}
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Input
                          id="description"
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="paymentMethod">Payment Method</Label>
                        <Input
                          id="paymentMethod"
                          name="paymentMethod"
                          placeholder="e.g., Bank Transfer, Credit Card"
                          value={formData.paymentMethod}
                          onChange={handleChange}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button type="submit">Record Payment</Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>

            {/* Payments Table */}
            <Card className="border-2 shadow-lg">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-gradient-to-r from-primary/10 to-primary/5 border-b-2">
                      <TableHead className="font-bold border-r">TYPE</TableHead>
                      <TableHead className="font-bold border-r">VENDOR</TableHead>
                      <TableHead className="text-right font-bold border-r">AMOUNT</TableHead>
                      <TableHead className="font-bold border-r">STATUS</TableHead>
                      <TableHead className="font-bold border-r">PAYMENT DATE</TableHead>
                      <TableHead className="font-bold border-r">DUE DATE</TableHead>
                      <TableHead className="font-bold">DESCRIPTION</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex flex-col items-center gap-2">
                            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
                            <span className="text-muted-foreground">Loading payments...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : payments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-12">
                          <div className="flex flex-col items-center gap-2 text-muted-foreground">
                            <CreditCard className="h-12 w-12 opacity-50" />
                            <p className="text-lg font-medium">No payments recorded</p>
                            <p className="text-sm">Record your first payment to get started</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      payments.map((payment, index) => (
                        <TableRow 
                          key={payment._id}
                          className={`hover:bg-muted/50 transition-colors ${index % 2 === 0 ? 'bg-background' : 'bg-muted/20'}`}
                        >
                          <TableCell className="capitalize border-r font-medium">
                            <Badge variant="secondary" className="font-medium">
                              {payment.paymentType.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell className="border-r font-medium">
                            {payment.vendorId?.name || <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell className="text-right font-bold text-lg border-r text-blue-600 dark:text-blue-400">
                            {formatCurrency(payment.amount, payment.currency)}
                          </TableCell>
                          <TableCell className="border-r">{getStatusBadge(payment.status)}</TableCell>
                          <TableCell className="border-r font-medium whitespace-nowrap">
                            {payment.paymentDate
                              ? format(new Date(payment.paymentDate), "dd/MM/yyyy")
                              : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell className="border-r font-medium whitespace-nowrap">
                            {payment.dueDate
                              ? format(new Date(payment.dueDate), "dd/MM/yyyy")
                              : <span className="text-muted-foreground">-</span>}
                          </TableCell>
                          <TableCell className="max-w-xs truncate" title={payment.description}>
                            {payment.description || <span className="text-muted-foreground">-</span>}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </Card>

            {/* Summary Card */}
            {payments.length > 0 && (
              <Card className="p-6 border-2 shadow-lg bg-gradient-to-br from-background to-muted/20">
                <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
                  <span className="h-1 w-8 bg-primary rounded"></span>
                  Payments Summary
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Total Payments</p>
                    <p className="text-3xl font-bold text-primary">{payments.length}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pending</p>
                    <p className="text-3xl font-bold text-orange-600 dark:text-orange-400">
                      {formatCurrency(
                        payments
                          .filter((p) => p.status === "pending")
                          .reduce((sum, p) => sum + p.amount, 0)
                      )}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Paid</p>
                    <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                      {formatCurrency(
                        payments
                          .filter((p) => p.status === "paid")
                          .reduce((sum, p) => sum + p.amount, 0)
                      )}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Failed</p>
                    <p className="text-3xl font-bold text-red-600 dark:text-red-400">
                      {formatCurrency(
                        payments
                          .filter((p) => p.status === "failed")
                          .reduce((sum, p) => sum + p.amount, 0)
                      )}
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
