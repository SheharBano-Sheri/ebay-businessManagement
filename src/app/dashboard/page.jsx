"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { ChartAreaInteractive } from "@/components/chart-area-interactive";
import { DataTable } from "@/components/data-table";
import { SectionCards } from "@/components/section-cards";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { PieChartsBreakdown } from "@/components/pie-charts-breakdown";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, TrendingUp, Package, ShoppingCart, Users } from "lucide-react";

import data from "./data.json";

export default function Page() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [analytics, setAnalytics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState([]);
  const [exchangeRates, setExchangeRates] = useState({ USD: 1, GBP: 0.79, EUR: 0.92 });
  const [vendorNotification, setVendorNotification] = useState(null);
  
  // Filter states
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedAccount, setSelectedAccount] = useState("all");
  const [currency, setCurrency] = useState("USD");

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/auth/signin");
    }
  }, [status, router]);

  useEffect(() => {
    if (status === "authenticated") {
      fetchAccounts();
      fetchExchangeRates();
      fetchAnalytics();
      if (session?.user?.role === 'public_vendor') {
        fetchVendorNotifications();
      }
    }
  }, [status, startDate, endDate, selectedAccount, session]);

  const fetchAccounts = async () => {
    try {
      const response = await fetch("/api/accounts");
      const data = await response.json();
      if (response.ok) {
        setAccounts(data.accounts || []);
      }
    } catch (error) {
      console.error("Failed to fetch accounts");
    }
  };

  const fetchExchangeRates = async () => {
    try {
      // Using exchangerate-api.com free tier
      const response = await fetch('https://api.exchangerate-api.com/v4/latest/USD');
      const data = await response.json();
      if (data.rates) {
        setExchangeRates({
          USD: 1,
          GBP: data.rates.GBP,
          EUR: data.rates.EUR,
          CAD: data.rates.CAD,
          AUD: data.rates.AUD,
          JPY: data.rates.JPY
        });
      }
    } catch (error) {
      console.error("Failed to fetch exchange rates, using defaults");
    }
  };

  const fetchAnalytics = async () => {
    try {
      let url = "/api/analytics?";
      if (startDate) url += `startDate=${startDate}&`;
      if (endDate) url += `endDate=${endDate}&`;
      if (selectedAccount !== "all") url += `account=${selectedAccount}`;
      
      const response = await fetch(url);
      const data = await response.json();
      
      if (response.ok) {
        setAnalytics(data);
      }
    } catch (error) {
      console.error("Failed to fetch analytics");
    } finally {
      setLoading(false);
    }
  };

  const fetchVendorNotifications = async () => {
    try {
      const response = await fetch("/api/vendors/notifications");
      const data = await response.json();
      if (response.ok && data.followerCount > 0) {
        setVendorNotification(data);
      }
    } catch (error) {
      console.error("Failed to fetch vendor notifications");
    }
  };

  const formatCurrency = (amount) => {
    const convertedAmount = (amount || 0) * (exchangeRates[currency] || 1);
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency,
    }).format(convertedAmount);
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading...</p>
      </div>
    );
  }

  if (status === "unauthenticated") {
    return null;
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
        <div className="flex flex-1 flex-col">
          <div className="@container/main flex flex-1 flex-col gap-2">
            <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 lg:px-6">
              
              {/* Vendor Notification Banner */}
              {vendorNotification && (
                <Alert className="bg-primary/10 border-primary/20">
                  <Users className="h-4 w-4" />
                  <AlertDescription>
                    <strong>{vendorNotification.followerCount}</strong> {vendorNotification.followerCount === 1 ? 'user has' : 'users have'} added you as a vendor!
                  </AlertDescription>
                </Alert>
              )}

              {/* Filters Bar */}
              <Card className="p-4">
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div className="flex items-center gap-4 flex-wrap">
                    <div className="flex items-center gap-2">
                      <Input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="w-40"
                      />
                      <span className="text-muted-foreground">to</span>
                      <Input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="w-40"
                      />
                    </div>
                    
                    <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                      <SelectTrigger className="w-[200px]">
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

                    <Select value={currency} onValueChange={setCurrency}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD $</SelectItem>
                        <SelectItem value="GBP">GBP £</SelectItem>
                        <SelectItem value="EUR">EUR €</SelectItem>
                        <SelectItem value="CAD">CAD $</SelectItem>
                        <SelectItem value="AUD">AUD $</SelectItem>
                        <SelectItem value="JPY">JPY ¥</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="text-sm text-muted-foreground">
                    Reporting in: <span className="font-semibold text-foreground">{currency}</span>
                  </div>
                </div>
              </Card>

              {/* KPI Cards */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Gross Revenue
                    </CardTitle>
                    <DollarSign className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {loading ? "..." : formatCurrency(analytics?.grossRevenue)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Total sales revenue
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Net Profit
                    </CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {loading ? "..." : formatCurrency(analytics?.netProfit)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      After fees and costs
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Inventory Value
                    </CardTitle>
                    <Package className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {loading ? "..." : formatCurrency(analytics?.inventoryValue)}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {analytics?.totalStock || 0} items in stock
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      Total Orders
                    </CardTitle>
                    <ShoppingCart className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">
                      {loading ? "..." : analytics?.ordersCount || 0}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {analytics?.productsCount || 0} products
                    </p>
                  </CardContent>
                </Card>
              </div>

              {/* Charts */}
              <PieChartsBreakdown analytics={analytics} loading={loading} />
              
              {/* Recent Orders Table */}
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>
                    Latest orders from {selectedAccount === 'all' ? 'all accounts' : accounts.find(a => a._id === selectedAccount)?.accountName || 'selected account'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-muted-foreground">Loading recent orders...</p>
                    </div>
                  ) : analytics?.recentOrders && analytics.recentOrders.length > 0 ? (
                    <div className="space-y-2">
                      {analytics.recentOrders.map((order, idx) => (
                        <div key={idx} className="flex items-center justify-between border-b pb-2">
                          <div className="flex-1">
                            <p className="font-medium">{order.itemName}</p>
                            <p className="text-sm text-muted-foreground">Order: {order.orderNumber}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-medium">{formatCurrency(order.grossAmount)}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(order.orderDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center py-8">
                      <p className="text-muted-foreground">No orders yet. Upload CSV to get started!</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
