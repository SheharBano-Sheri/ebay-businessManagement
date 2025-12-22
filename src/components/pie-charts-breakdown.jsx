"use client";

import { TrendingUp, DollarSign, Package, CreditCard } from "lucide-react";
import { Pie, PieChart, Cell } from "recharts";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

export const description = "Business analytics pie charts";

export function PieChartsBreakdown({ analytics, loading }) {
  if (loading || !analytics) {
    return (
      <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="flex flex-col">
            <CardContent className="flex items-center justify-center py-12">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Revenue Breakdown Chart Data
  const revenueData = [
    { 
      name: "Gross Revenue", 
      value: analytics.grossRevenue || 0, 
      fill: "#22c55e"
    },
    { 
      name: "Fees", 
      value: analytics.totalFees || 0, 
      fill: "#ef4444"
    },
    { 
      name: "Total Costs", 
      value: analytics.totalCosts || ((analytics.totalSourcingCost || 0) + (analytics.totalShippingCost || 0)), 
      fill: "#f59e0b"
    },
  ];

  // Payment Status Chart Data
  const paymentData = [
    { 
      name: "Paid", 
      value: analytics.paidPayments || 0, 
      fill: "#10b981"
    },
    { 
      name: "Pending", 
      value: analytics.pendingPayments || 0, 
      fill: "#f59e0b"
    },
  ];

  // Product Status Chart Data
  const productData = [
    { 
      name: "In Stock", 
      value: analytics.totalStock || 0, 
      fill: "#3b82f6"
    },
    { 
      name: "Products", 
      value: analytics.productsCount || 0, 
      fill: "#8b5cf6"
    },
  ];

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(value);
  };

  const revenueConfig = {
    value: { label: "Amount" },
  };

  const paymentConfig = {
    value: { label: "Amount" },
  };

  const productConfig = {
    value: { label: "Count" },
  };

  const totalRevenue = revenueData.reduce((sum, item) => sum + item.value, 0);
  const totalPayments = paymentData.reduce((sum, item) => sum + item.value, 0);
  const netProfit = analytics.netProfit || 0;

  return (
    <div className="grid grid-cols-1 gap-4 px-4 lg:px-6 @xl/main:grid-cols-2 @5xl/main:grid-cols-3">
      {/* Revenue Breakdown Chart */}
      <Card className="flex flex-col border-2 shadow-lg">
        <CardHeader className="items-center pb-0">
          <CardTitle className="flex items-center gap-2">
            <DollarSign className="h-5 w-5" />
            Revenue Breakdown
          </CardTitle>
          <CardDescription>Distribution of revenue components</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <ChartContainer config={revenueConfig} className="mx-auto aspect-square max-h-[250px]">
            <PieChart>
              <ChartTooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium">{payload[0].name}</span>
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(payload[0].value)}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Pie 
                data={revenueData} 
                dataKey="value" 
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
              >
                {revenueData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 leading-none font-medium text-green-600 dark:text-green-400">
            Net Profit: {formatCurrency(netProfit)}
          </div>
          <div className="text-muted-foreground leading-none">Total: {formatCurrency(totalRevenue)}</div>
        </CardFooter>
      </Card>

      {/* Payment Status Chart */}
      <Card className="flex flex-col border-2 shadow-lg">
        <CardHeader className="items-center pb-0">
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Payment Status
          </CardTitle>
          <CardDescription>Paid vs Pending payments</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <ChartContainer config={paymentConfig} className="mx-auto aspect-square max-h-[250px]">
            <PieChart>
              <ChartTooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium">{payload[0].name}</span>
                          <span className="text-sm text-muted-foreground">
                            {formatCurrency(payload[0].value)}
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Pie 
                data={paymentData} 
                dataKey="value" 
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
              >
                {paymentData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 leading-none font-medium">
            Total Payments: {formatCurrency(totalPayments)}
          </div>
          <div className="text-muted-foreground leading-none">
            {paymentData[0]?.value > 0 ? 
              `${((paymentData[0].value / totalPayments) * 100).toFixed(1)}% paid` : 
              'No payments yet'}
          </div>
        </CardFooter>
      </Card>

      {/* Inventory Overview Chart */}
      <Card className="flex flex-col border-2 shadow-lg">
        <CardHeader className="items-center pb-0">
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            Inventory Overview
          </CardTitle>
          <CardDescription>Products and stock levels</CardDescription>
        </CardHeader>
        <CardContent className="flex-1 pb-0">
          <ChartContainer config={productConfig} className="mx-auto aspect-square max-h-[250px]">
            <PieChart>
              <ChartTooltip 
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="rounded-lg border bg-background p-2 shadow-sm">
                        <div className="flex flex-col gap-1">
                          <span className="text-sm font-medium">{payload[0].name}</span>
                          <span className="text-sm text-muted-foreground">
                            {payload[0].value} units
                          </span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Pie 
                data={productData} 
                dataKey="value" 
                nameKey="name"
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={80}
              >
                {productData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
        </CardContent>
        <CardFooter className="flex-col gap-2 text-sm">
          <div className="flex items-center gap-2 leading-none font-medium">
            {analytics.productsCount || 0} Products
          </div>
          <div className="text-muted-foreground leading-none">
            Total stock: {analytics.totalStock || 0} units
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
