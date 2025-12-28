"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { SidebarInset, SidebarProvider } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  ArrowLeft,
  Upload,
  FileText,
  X,
  Loader2,
  CheckCircle,
  Info,
  Package,
  AlertCircle,
  CheckCircle2,
  User,
  Phone,
  MapPin,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export default function PurchaseProductPage() {
  const params = useParams();
  const router = useRouter();
  const { vendorId, productId } = params;

  const [vendor, setVendor] = useState(null);
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  // --- NEW STATE FOR CONTACT DETAILS ---
  const [contactName, setContactName] = useState("");
  const [contactNumber, setContactNumber] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  // ------------------------------------

  // File states
  const [paymentProofs, setPaymentProofs] = useState([]);
  const [shippingLabels, setShippingLabels] = useState([]);
  const [packingSlips, setPackingSlips] = useState([]);

  // Vendor Requirements - Initialize with defaults
  const [requirements, setRequirements] = useState({
    paymentProof: true,
    shippingLabel: false,
    packingSlip: false,
    instructions: "",
  });

  useEffect(() => {
    fetchData();
  }, [vendorId, productId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch vendor - ADD TIMESTAMP TO BUST CACHE
      const timestamp = Date.now();
      const vendorResponse = await fetch(
        `/api/vendors?id=${vendorId}&t=${timestamp}`
      );
      const vendorData = await vendorResponse.json();

      if (vendorResponse.ok && vendorData.vendor) {
        setVendor(vendorData.vendor);

        // --- KEY FIX: HANDLE MISSING OR EMPTY REQUIREMENTS ---
        if (vendorData.vendor.requirements) {
          console.log(
            "Using fetched requirements:",
            vendorData.vendor.requirements
          );
          setRequirements((prev) => ({
            ...prev,
            ...vendorData.vendor.requirements,
          }));
        } else {
          console.log("No requirements found, using defaults");
          // Ensure defaults are enforced if DB field is missing
          setRequirements({
            paymentProof: true,
            shippingLabel: false,
            packingSlip: false,
            instructions: "",
          });
        }
      } else {
        toast.error("Vendor not found");
        router.push("/dashboard/vendors");
        return;
      }

      // Fetch product
      const productsResponse = await fetch(
        `/api/products?vendorId=${vendorId}`
      );
      const productsData = await productsResponse.json();

      if (productsResponse.ok) {
        const foundProduct = productsData.products.find(
          (p) => p._id === productId
        );
        if (foundProduct) {
          setProduct(foundProduct);
        } else {
          toast.error("Product not found");
          router.push(`/dashboard/vendors/${vendorId}/inventory`);
        }
      }
    } catch (error) {
      console.error("Error fetching data:", error);
      toast.error("Failed to load product details");
    } finally {
      setLoading(false);
    }
  };

  const handleFileChange = (e, type) => {
    const files = Array.from(e.target.files);

    if (files.length === 0) return;

    // Add new files to the respective array
    switch (type) {
      case "payment":
        setPaymentProofs((prev) => [...prev, ...files]);
        break;
      case "shipping":
        setShippingLabels((prev) => [...prev, ...files]);
        break;
      case "packing":
        setPackingSlips((prev) => [...prev, ...files]);
        break;
    }

    // Reset input
    e.target.value = "";
  };

  const removeFile = (index, type) => {
    switch (type) {
      case "payment":
        setPaymentProofs((prev) => prev.filter((_, i) => i !== index));
        break;
      case "shipping":
        setShippingLabels((prev) => prev.filter((_, i) => i !== index));
        break;
      case "packing":
        setPackingSlips((prev) => prev.filter((_, i) => i !== index));
        break;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (quantity <= 0 || quantity > product.stock) {
      toast.error(`Quantity must be between 1 and ${product.stock}`);
      return;
    }

    // --- NEW VALIDATION ---
    if (!contactName.trim()) {
      toast.error("Contact Name is required");
      return;
    }
    if (!contactNumber.trim()) {
      toast.error("Contact Number is required");
      return;
    }
    if (!deliveryAddress.trim()) {
      toast.error("Delivery Address is required");
      return;
    }
    // ----------------------

    // Validation based on dynamic requirements
    if (requirements.paymentProof && paymentProofs.length === 0) {
      toast.error("Payment proof is required by the vendor");
      return;
    }

    if (requirements.shippingLabel && shippingLabels.length === 0) {
      toast.error("Shipping label is required by the vendor");
      return;
    }

    if (requirements.packingSlip && packingSlips.length === 0) {
      toast.error("Packing slip is required by the vendor");
      return;
    }

    try {
      setSubmitting(true);

      // Create FormData for file upload
      const formData = new FormData();
      formData.append("vendorId", vendorId);
      formData.append("productId", productId);
      formData.append("quantity", quantity);
      formData.append("notes", notes);

      // --- APPEND NEW FIELDS ---
      formData.append("contactName", contactName);
      formData.append("contactNumber", contactNumber);
      formData.append("deliveryAddress", deliveryAddress);
      // -------------------------

      // Add all payment proofs
      paymentProofs.forEach((file) => {
        formData.append("paymentProofs", file);
      });

      // Add all shipping labels
      shippingLabels.forEach((file) => {
        formData.append("shippingLabels", file);
      });

      // Add all packing slips
      packingSlips.forEach((file) => {
        formData.append("packingSlips", file);
      });

      const response = await fetch("/api/vendor-purchases", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Purchase order created successfully!");
        router.push(`/dashboard/vendors/${vendorId}/inventory`);
      } else {
        toast.error(data.error || "Failed to create purchase order");
      }
    } catch (error) {
      console.error("Error creating purchase:", error);
      toast.error("An error occurred while creating purchase order");
    } finally {
      setSubmitting(false);
    }
  };

  const totalCost = product ? (product.unitCost * quantity).toFixed(2) : "0.00";

  const FileList = ({ files, type, label, required }) => (
    <div className="space-y-2">
      <Label>
        {label} {required && <span className="text-red-500">*</span>}
      </Label>
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Input
            type="file"
            multiple
            onChange={(e) => handleFileChange(e, type)}
            className="cursor-pointer"
            accept=".pdf,.jpg,.jpeg,.png,.doc,.docx"
          />
        </div>
        {files.length > 0 && (
          <div className="space-y-1 mt-2">
            {files.map((file, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-2 bg-muted rounded-md text-sm"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  <span className="truncate max-w-xs">{file.name}</span>
                  <span className="text-muted-foreground text-xs">
                    ({(file.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => removeFile(index, type)}
                  type="button"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );

  if (loading) {
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
          <div className="flex flex-1 items-center justify-center p-4">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </SidebarInset>
      </SidebarProvider>
    );
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
        <div className="flex flex-1 flex-col p-4 lg:p-6">
          <div className="max-w-4xl mx-auto w-full space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
              <Button
                variant="outline"
                size="icon"
                onClick={() =>
                  router.push(`/dashboard/vendors/${vendorId}/inventory`)
                }
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Purchase Product
                </h1>
                <p className="text-muted-foreground">
                  Complete your purchase by uploading required documents
                </p>
              </div>
            </div>

            {/* Vendor Requirements Alert */}
            {/* --- NEW STYLING: REQUIREMENTS CHECKLIST --- */}
            <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
              <div className="bg-muted/40 p-4 border-b">
                <h3 className="font-semibold flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-primary" />
                  Required for this Order
                </h3>
              </div>
              <div className="p-4 space-y-4">
                <div className="grid sm:grid-cols-3 gap-4">
                  {/* Always show Payment Proof if required */}
                  {requirements.paymentProof && (
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-background border-primary/20 shadow-sm">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                        <CheckCircle2 className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">Payment Proof</span>
                    </div>
                  )}

                  {requirements.shippingLabel && (
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-background border-primary/20 shadow-sm">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                        <Package className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">
                        Shipping Label
                      </span>
                    </div>
                  )}

                  {requirements.packingSlip && (
                    <div className="flex items-center gap-3 p-3 rounded-lg border bg-background border-primary/20 shadow-sm">
                      <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-primary/10 text-primary">
                        <FileText className="h-4 w-4" />
                      </div>
                      <span className="text-sm font-medium">Packing Slip</span>
                    </div>
                  )}
                </div>

                {requirements.instructions && (
                  <div className="flex gap-3 p-3 bg-blue-50/50 dark:bg-blue-900/10 text-blue-700 dark:text-blue-300 rounded-md text-sm border border-blue-100 dark:border-blue-900">
                    <Info className="h-4 w-4 shrink-0 mt-0.5" />
                    <p>
                      <strong className="font-semibold">
                        Note from Vendor:
                      </strong>{" "}
                      {requirements.instructions}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Product Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Product Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Vendor</p>
                    <p className="font-medium">{vendor?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">SKU</p>
                    <p className="font-medium">{product?.sku}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Product Name
                    </p>
                    <p className="font-medium">{product?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Unit Cost</p>
                    <p className="font-medium">
                      {product?.currency} {product?.unitCost.toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">
                      Available Stock
                    </p>
                    <Badge
                      variant={product?.stock > 0 ? "success" : "destructive"}
                    >
                      {product?.stock}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Purchase Form */}
            <form onSubmit={handleSubmit}>
              <Card>
                <CardHeader>
                  <CardTitle>Purchase Details</CardTitle>
                  <CardDescription>
                    Enter your contact information and upload required documents
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* --- NEW SECTION: Contact & Delivery Information --- */}
                  <div className="border-b pb-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="contactName">
                          Contact Name <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <User className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="contactName"
                            placeholder="Full Name"
                            className="pl-9"
                            value={contactName}
                            onChange={(e) => setContactName(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="contactNumber">
                          Contact Number <span className="text-red-500">*</span>
                        </Label>
                        <div className="relative">
                          <Phone className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input
                            id="contactNumber"
                            placeholder="+1 234 567 890"
                            className="pl-9"
                            value={contactNumber}
                            onChange={(e) => setContactNumber(e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </div>

                    {/* Delivery Address Field */}
                    <div className="space-y-2">
                      <Label htmlFor="deliveryAddress">
                        Delivery Address <span className="text-red-500">*</span>
                      </Label>
                      <div className="relative">
                        <MapPin className="absolute left-2.5 top-3 h-4 w-4 text-muted-foreground" />
                        <Textarea
                          id="deliveryAddress"
                          placeholder="Enter complete delivery address..."
                          className="pl-9 min-h-[80px]"
                          value={deliveryAddress}
                          onChange={(e) => setDeliveryAddress(e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  </div>
                  {/* -------------------------------------- */}

                  {/* Quantity */}
                  <div className="space-y-2">
                    <Label htmlFor="quantity">Quantity *</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      max={product?.stock}
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(parseInt(e.target.value) || 1)
                      }
                      required
                    />
                    <p className="text-sm text-muted-foreground">
                      Total Cost: {product?.currency} {totalCost}
                    </p>
                  </div>

                  {/* Payment Proof (Based on requirements) */}
                  <FileList
                    files={paymentProofs}
                    type="payment"
                    label="Payment Proof"
                    required={requirements.paymentProof}
                  />

                  {/* Shipping Label (Conditional) */}
                  {requirements.shippingLabel && (
                    <FileList
                      files={shippingLabels}
                      type="shipping"
                      label="Shipping Label"
                      required={true}
                    />
                  )}

                  {/* Packing Slip (Conditional) */}
                  {requirements.packingSlip && (
                    <FileList
                      files={packingSlips}
                      type="packing"
                      label="Packing Slip"
                      required={true}
                    />
                  )}

                  {/* Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="notes">Additional Notes (Optional)</Label>
                    <Textarea
                      id="notes"
                      placeholder="Add any additional notes about this purchase..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                    />
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() =>
                      router.push(`/dashboard/vendors/${vendorId}/inventory`)
                    }
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button type="submit" disabled={submitting}>
                    {submitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating Purchase...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Complete Purchase
                      </>
                    )}
                  </Button>
                </CardFooter>
              </Card>
            </form>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
