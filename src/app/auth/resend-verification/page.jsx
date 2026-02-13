"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Mail, CheckCircle2, ArrowLeft } from "lucide-react";

export default function ResendVerificationPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [email, setEmail] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!email) {
      toast.error("Please enter your email address");
      return;
    }

    setLoading(true);
    setSuccess(false);

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccess(true);
        toast.success("Verification email sent successfully!");
        
        if (data.code === "ALREADY_VERIFIED") {
          setTimeout(() => {
            router.push("/auth/signin");
          }, 2000);
        }
      } else {
        if (data.code === "USER_NOT_FOUND") {
          toast.error("No account found with this email address");
        } else if (data.code === "ALREADY_VERIFIED") {
          toast.info("Your email is already verified. You can log in now.");
          setTimeout(() => {
            router.push("/auth/signin");
          }, 2000);
        } else {
          toast.error(data.error || "Failed to send verification email");
        }
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
            <Mail className="h-8 w-8 text-purple-600" />
          </div>
          <CardTitle className="text-2xl">Resend Verification Email</CardTitle>
          <CardDescription>
            Enter your email address to receive a new verification link
          </CardDescription>
        </CardHeader>

        <CardContent>
          {success ? (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                <strong>Verification email sent!</strong>
                <br />
                Please check your inbox and click the verification link. The
                link will expire in 24 hours.
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="your.email@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="w-full"
                />
                <p className="text-xs text-gray-500">
                  We&apos;ll send a new verification link to this email address
                </p>
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <span className="animate-spin mr-2">⏳</span>
                    Sending...
                  </>
                ) : (
                  <>
                    <Mail className="mr-2 h-4 w-4" />
                    Send Verification Email
                  </>
                )}
              </Button>
            </form>
          )}

          {success && (
            <div className="mt-4 space-y-2">
              <Alert>
                <AlertDescription>
                  <strong>Didn&apos;t receive the email?</strong>
                  <ul className="mt-2 list-disc list-inside text-sm space-y-1">
                    <li>Check your spam/junk folder</li>
                    <li>Make sure you entered the correct email</li>
                    <li>Wait a few minutes and try again</li>
                  </ul>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-2">
          <Button asChild variant="outline" className="w-full">
            <Link href="/auth/signin">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Sign In
            </Link>
          </Button>
          
          <p className="text-xs text-center text-gray-500">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="text-purple-600 hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
