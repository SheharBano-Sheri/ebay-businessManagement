"use client";

import { useState, useEffect, Suspense } from "react";
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
import { Alert, AlertDescription } from "@/components/ui/alert";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Loader2, Mail } from "lucide-react";

function VerifyEmailContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState("verifying"); // verifying, success, error
  const [message, setMessage] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [userEmail, setUserEmail] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");
    
    if (!token) {
      setStatus("error");
      setMessage("Invalid verification link. No token provided.");
      setErrorCode("NO_TOKEN");
      return;
    }

    verifyEmail(token);
  }, [searchParams]);

  const verifyEmail = async (token) => {
    try {
      const response = await fetch(`/api/auth/verify-email?token=${token}`, {
        method: "GET",
      });

      const data = await response.json();

      if (response.ok) {
        setStatus("success");
        setMessage(data.message);
        toast.success("Email verified successfully!");
        
        // Redirect to signin after 3 seconds
        setTimeout(() => {
          router.push("/auth/signin?verified=true");
        }, 3000);
      } else {
        setStatus("error");
        setMessage(data.error);
        setErrorCode(data.code);
        setUserEmail(data.email || "");
        
        if (data.code === "TOKEN_EXPIRED") {
          toast.error("Verification link has expired");
        } else if (data.code === "TOKEN_USED") {
          toast.error("This verification link has already been used");
        } else if (data.code === "ALREADY_VERIFIED") {
          setStatus("success");
          setMessage("Your email is already verified! You can log in now.");
          setTimeout(() => {
            router.push("/auth/signin");
          }, 3000);
        } else {
          toast.error(data.error);
        }
      }
    } catch (error) {
      setStatus("error");
      setMessage("Failed to verify email. Please try again later.");
      setErrorCode("NETWORK_ERROR");
      toast.error("Network error occurred");
    }
  };

  const handleResendEmail = async () => {
    if (!userEmail) {
      toast.error("Email address not found");
      return;
    }

    try {
      const response = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: userEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        toast.success("Verification email sent! Check your inbox.");
      } else {
        toast.error(data.error || "Failed to resend verification email");
      }
    } catch (error) {
      toast.error("Network error. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-purple-50 to-blue-50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          {status === "verifying" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-blue-100">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
              </div>
              <CardTitle className="text-2xl">Verifying Email...</CardTitle>
              <CardDescription>
                Please wait while we verify your email address
              </CardDescription>
            </>
          )}
          
          {status === "success" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
                <CheckCircle2 className="h-8 w-8 text-green-600" />
              </div>
              <CardTitle className="text-2xl text-green-600">
                Email Verified!
              </CardTitle>
              <CardDescription className="mt-2">
                {message}
              </CardDescription>
            </>
          )}
          
          {status === "error" && (
            <>
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-red-100">
                <XCircle className="h-8 w-8 text-red-600" />
              </div>
              <CardTitle className="text-2xl text-red-600">
                Verification Failed
              </CardTitle>
              <CardDescription className="mt-2 text-red-600">
                {message}
              </CardDescription>
            </>
          )}
        </CardHeader>

        <CardContent>
          {status === "verifying" && (
            <div className="space-y-2 text-center text-sm text-gray-600">
              <p>This should only take a moment...</p>
            </div>
          )}

          {status === "success" && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle2 className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Redirecting you to the sign-in page in a few seconds...
              </AlertDescription>
            </Alert>
          )}

          {status === "error" && (
            <div className="space-y-4">
              <Alert className="border-red-200 bg-red-50">
                <XCircle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  {errorCode === "TOKEN_EXPIRED" && (
                    <>
                      Your verification link has expired. Verification links are
                      valid for 24 hours only.
                    </>
                  )}
                  {errorCode === "TOKEN_USED" && (
                    <>
                      This verification link has already been used. If you
                      haven&apos;t verified your email yet, please request a new
                      verification link.
                    </>
                  )}
                  {errorCode === "INVALID_TOKEN" && (
                    <>
                      The verification link is invalid. Please make sure you
                      copied the entire link from your email.
                    </>
                  )}
                  {!errorCode && (
                    <>
                      An error occurred during verification. Please try again or
                      contact support.
                    </>
                  )}
                </AlertDescription>
              </Alert>

              {(errorCode === "TOKEN_EXPIRED" || errorCode === "TOKEN_USED") && userEmail && (
                <div className="space-y-2">
                  <p className="text-sm text-gray-600">
                    Need a new verification link?
                  </p>
                  <Button
                    onClick={handleResendEmail}
                    variant="outline"
                    className="w-full"
                  >
                    <Mail className="mr-2 h-4 w-4" />
                    Resend Verification Email
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-2">
          {status === "success" && (
            <Button asChild className="w-full">
              <Link href="/auth/signin">Go to Sign In</Link>
            </Button>
          )}
          
          {status === "error" && (
            <>
              <Button asChild className="w-full" variant="outline">
                <Link href="/auth/signin">Back to Sign In</Link>
              </Button>
              {!(errorCode === "TOKEN_EXPIRED" || errorCode === "TOKEN_USED") && (
                <Button asChild className="w-full" variant="ghost">
                  <Link href="/auth/signup">Create New Account</Link>
                </Button>
              )}
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  );
}

export default function VerifyEmailPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      }
    >
      <VerifyEmailContent />
    </Suspense>
  );
}
