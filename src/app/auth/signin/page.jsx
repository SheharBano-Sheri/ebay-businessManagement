"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { Package, Clock, Eye, EyeOff, CheckCircle2, Mail } from "lucide-react";

function SignInForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [pendingApproval, setPendingApproval] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);
  const [emailNotVerified, setEmailNotVerified] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // New state for password visibility
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    const isPending = searchParams.get("pending");
    const isVerified = searchParams.get("verified");
    
    if (isPending === "true") {
      setPendingApproval(true);
    }
    
    if (isVerified === "true") {
      setEmailVerified(true);
      toast.success("Email verified! You can now sign in.");
    }
  }, [searchParams]);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Get IP and user agent from server
      const metadataResponse = await fetch("/api/auth/signin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: formData.email }),
      });

      const metadata = await metadataResponse.json();

      co// Check if error is related to email verification
        if (result.error.includes("verify your email")) {
          setEmailNotVerified(true);
          toast.error(result.error, {
            duration: 5000,
          });
        } else {
          toast.error(result.error);
        }"credentials", {
        email: formData.email,
        password: formData.password,
        ipAddress: metadata.ipAddress,
        userAgent: metadata.userAgent,
        redirect: false,
      });

      if (result?.error) {
        toast.error(result.error);
      } else if (result?.ok) {
        toast.success("Signed in successfully!");
        router.refresh();
        router.push("/dashboard");
      }
    } catch (error) {
      toast.error("An error occurred during sign in");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
           emailVerified && (
            <Alert className="mb-6 border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Email verified successfully!</strong> You can now sign in to your account.
              </AlertDescription>
            </Alert>
          )}
          
          {pendingApproval && (
            <Alert className="mb-6 border-yellow-200 bg-yellow-50">
              <Clock className="h-4 w-4 text-yellow-600" />
              <AlertDescription className="text-yellow-800">
                Your account is pending approval by the administrator. You will be able to sign in once approved. Please check back soon.
              </AlertDescription>
            </Alert>
          )}
          
          {emailNotVerified && (
            <Alert className="mb-6 border-orange-200 bg-orange-50">
              <Mail className="h-4 w-4 text-orange-600" />
              <AlertDescription className="text-orange-800">
                <strong>Email not verified.</strong> Please check your inbox for the verification link.
                <div className="mt-2">
                  <Link href="/auth/resend-verification" className="text-orange-900 underline hover:no-underline font-medium">
                    Resend verification email
                  </Link>
                </div>
              </AlertDescription>
            </Alert>
          )}
              Your account is pending approval by the administrator. You will be able to sign in once approved. Please check back soon.
=======
                Your vendor account is pending approval by the administrator.
                You will be able to sign in once approved. Please check back
                soon.
>>>>>>> f577f2f1f2110dabe06c0b27e039935664b22052
              </AlertDescription>
            </Alert>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
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
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="pr-10" // Add padding to prevent text overlapping the icon
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-4">
          <div className="text-center w-full">
            <p className="text-sm text-muted-foreground">
              Don't have an account?{" "}
              <Link
                href="/auth/signup"
                className="text-primary hover:underline"
              >
                Sign up
              </Link>
            </p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
