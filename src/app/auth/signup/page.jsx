"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { BadgeCheck, Building2, User, Mail } from "lucide-react";

function SignupFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [accountType, setAccountType] = useState("user");
  const [membershipPlan, setMembershipPlan] = useState("personal");
  const [inviteToken, setInviteToken] = useState(null);
  const [inviteEmail, setInviteEmail] = useState(null);
  const [inviteInfo, setInviteInfo] = useState(null);

  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: ""
  });

  useEffect(() => {
    const token = searchParams.get('token');
    const email = searchParams.get('email');
    const type = searchParams.get('type');
    
    if (token && email) {
      setInviteToken(token);
      setInviteEmail(email);
      setFormData(prev => ({ ...prev, email }));
      
      // Determine which API to call based on type
      const apiEndpoint = type === 'vendor' ? '/api/vendors/verify-invite' : '/api/team/verify-invite';
      
      // Fetch invitation details
      fetch(`${apiEndpoint}?token=${token}`)
        .then(res => res.json())
        .then(data => {
          if (data.valid) {
            setInviteInfo({
              ...data.invitation,
              type: type || 'team'
            });
          }
        })
        .catch(err => console.error('Failed to verify invite:', err));
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      setLoading(false);
      return;
    }

    try {
      console.log('Signup request:', { accountType, name: formData.name, email: formData.email });
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          accountType: inviteToken ? "user" : accountType,
          membershipPlan: inviteToken ? "invited" : (accountType === "user" ? membershipPlan : "personal"),
          inviteToken
        })
      });

      const data = await response.json();

      if (response.ok) {
        // Check if pending approval
        if (data.pendingApproval) {
          toast.success("Registration successful! Your account is pending approval.");
          router.push("/auth/signin?pending=true");
          return;
        }

        toast.success("Account created successfully!");
        
        // Auto sign in
        const result = await signIn("credentials", {
          email: formData.email,
          password: formData.password,
          redirect: false
        });

        if (result?.ok) {
          router.push("/dashboard");
        } else {
          router.push("/auth/signin");
        }
      } else {
        // Show specific password validation errors if available
        if (data.details && Array.isArray(data.details) && data.details.length > 0) {
          // Show main error
          toast.error(data.error || "Signup failed");
          // Show each specific requirement that wasn't met
          data.details.forEach((detail, index) => {
            setTimeout(() => {
              toast.error(detail, { duration: 5000 });
            }, (index + 1) * 100);
          });
        } else {
          toast.error(data.error || "Signup failed");
        }
      }
    } catch (error) {
      toast.error("An error occurred during signup");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader className="text-center">
          {inviteInfo ? (
            <>
              <div className="mx-auto mb-4 h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                <Mail className="h-8 w-8 text-primary" />
              </div>
              <CardTitle className="text-3xl font-bold">
                {inviteInfo.type === 'vendor' ? `Join as Vendor` : `Join ${inviteInfo.inviterName}'s Team`}
              </CardTitle>
              <CardDescription>
                {inviteInfo.type === 'vendor' 
                  ? `You've been invited to join the marketplace as a vendor` 
                  : `You've been invited as a ${inviteInfo.role}. Create your account to get started.`}
              </CardDescription>
            </>
          ) : (
            <>
              <CardTitle className="text-3xl font-bold">Create Your Account</CardTitle>
              <CardDescription>Choose your account type and get started</CardDescription>
            </>
          )}
        </CardHeader>
        <CardContent>
          {inviteToken ? (
            /* Invitation Signup Form */
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  name="name"
                  type="text"
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">Email is pre-filled from your invitation</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
                <div className="text-xs text-muted-foreground space-y-1 mt-2">
                  <p className="font-medium">Password must contain:</p>
                  <ul className="list-disc list-inside space-y-0.5 ml-1">
                    <li>At least 8 characters</li>
                    <li>At least one special character (!@#$%^&*...)</li>
                    <li>At least one number (recommended)</li>
                    <li>At least one uppercase letter (recommended)</li>
                  </ul>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  disabled={loading}
                />
              </div>
              {inviteInfo && (
                <div className="bg-primary/5 border border-primary/20 p-4 rounded-lg">
                  <h4 className="font-semibold mb-2 flex items-center gap-2">
                    <BadgeCheck className="h-4 w-4" />
                    Your Access
                  </h4>
                  {inviteInfo.type === 'vendor' ? (
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Account Type: <strong className="text-foreground">Public Vendor</strong></li>
                      <li>• Invited by: <strong className="text-foreground">{inviteInfo.inviterName}</strong></li>
                      <li>• No subscription required - join the marketplace for free</li>
                    </ul>
                  ) : (
                    <ul className="text-sm space-y-1 text-muted-foreground">
                      <li>• Role: <strong className="text-foreground capitalize">{inviteInfo.role}</strong></li>
                      <li>• Team: <strong className="text-foreground">{inviteInfo.inviterName}'s Business</strong></li>
                      <li>• No subscription required - you're joining an existing team</li>
                    </ul>
                  )}
                </div>
              )}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating Account..." : "Accept Invitation & Create Account"}
              </Button>
            </form>
          ) : (
            // Regular Signup Form
            <>
              <Tabs value={accountType} onValueChange={setAccountType} className="w-full">
                <TabsList className="grid w-full grid-cols-2 mb-6">
                  <TabsTrigger value="user" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Business User
                  </TabsTrigger>
                  <TabsTrigger value="public_vendor" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Public Vendor
                  </TabsTrigger>
                </TabsList>

            <TabsContent value="user">
              <div className="space-y-6">
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Business Manager Account</h3>
                  <p className="text-sm text-muted-foreground">
                    Manage inventory, orders, vendors, teams, and analytics for your eBay business
                  </p>
                </div>

                <div className="space-y-4">
                  <h4 className="font-semibold">Select Membership Plan</h4>
                  <div className="grid grid-cols-3 gap-4">
                    <Card 
                      className={`cursor-pointer transition-all ${membershipPlan === "personal" ? "ring-2 ring-primary" : ""}`}
                      onClick={() => setMembershipPlan("personal")}
                    >
                      <CardHeader className="p-4">
                        <CardTitle className="text-lg">Personal</CardTitle>
                        <CardDescription className="text-xl font-bold text-green-600">FREE</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <ul className="text-sm space-y-1">
                          <li>✓ 1 store and 1 user only</li>
                          <li>✓ Instant activation</li>
                          <li>✓ No approval required</li>
                          <li>✓ Add vendors for internal use</li>
                          <li>✓ Real-time inventory sync</li>
                          <li>✓ Basic analytics dashboard</li>
                          <li>✓ Email support</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card 
                      className={`cursor-pointer transition-all ${membershipPlan === "enterprise" ? "ring-2 ring-primary" : ""}`}
                      onClick={() => setMembershipPlan("enterprise")}
                    >
                      <CardHeader className="p-4">
                        <CardTitle className="text-lg">Enterprise</CardTitle>
                        <CardDescription className="text-xl font-bold">$20/month</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <ul className="text-sm space-y-1">
                          <li>✓ Up to 10 active members</li>
                          <li>✓ Add vendors for team use</li>
                          <li>✓ Advanced team permissions</li>
                          <li>✓ Real-time inventory sync</li>
                          <li>✓ Priority support</li>
                          <li>⏳ Requires admin approval</li>
                          <li className="text-xs text-muted-foreground mt-2">* Free during trial period</li>
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="cursor-not-allowed opacity-60">
                      <CardHeader className="p-4">
                        <CardTitle className="text-lg">Premium</CardTitle>
                        <CardDescription className="text-base font-semibold text-primary">Contact for Pricing</CardDescription>
                      </CardHeader>
                      <CardContent className="p-4 pt-0">
                        <ul className="text-sm space-y-1">
                          <li>✓ More than 10 members</li>
                          <li>✓ Unlimited team expansion</li>
                          <li>✓ Dedicated account manager</li>
                          <li>✓ Custom integrations</li>
                          <li>✓ Advanced security</li>
                          <li>✓ 24/7 priority support</li>
                        </ul>
                        <p className="text-xs text-muted-foreground mt-3">Contact us to discuss your needs</p>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="public_vendor">
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <h3 className="font-semibold mb-2">Public Vendor Account</h3>
                  <p className="text-sm text-muted-foreground">
                    Join the marketplace and supply products to multiple business users
                  </p>
                </div>
                
                <Card className="border-primary/20">
                  <CardHeader className="p-4">
                    <CardTitle className="text-lg">Public Vendor Plan</CardTitle>
                    <CardDescription className="text-base font-semibold text-primary">Contact for Pricing</CardDescription>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <ul className="text-sm space-y-1">
                      <li>✓ Marketplace vendor account</li>
                      <li>✓ No team members (individual vendor)</li>
                      <li>✓ Manage your product catalog</li>
                      <li>✓ Connect with multiple buyers</li>
                      <li>✓ Track purchase orders</li>
                      <li>✓ Vendor dashboard & analytics</li>
                      <li>⏳ Requires admin approval</li>
                    </ul>
                    <p className="text-xs text-muted-foreground mt-3 pt-3 border-t">
                      To become a public vendor, please contact us. This is not a free service.
                    </p>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>

          <form onSubmit={handleSubmit} className="space-y-4 mt-6">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                name="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                value={formData.email}
                onChange={handleChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
                value={formData.password}
                onChange={handleChange}
                required
              />
              <div className="text-xs text-muted-foreground space-y-1 mt-2">
                <p className="font-medium">Password must contain:</p>
                <ul className="list-disc list-inside space-y-0.5 ml-1">
                  <li>At least 8 characters</li>
                  <li>At least one special character (!@#$%^&*...)</li>
                  <li>At least one number (recommended)</li>
                  <li>At least one uppercase letter (recommended)</li>
                </ul>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={formData.confirmPassword}
                onChange={handleChange}
                required
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Creating Account..." : "Create Account"}
            </Button>
          </form>
            </>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <p className="text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-primary hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    }>
      <SignupFormContent />
    </Suspense>
  );
}
