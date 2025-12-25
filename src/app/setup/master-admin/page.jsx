"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Shield, CheckCircle, Loader2 } from "lucide-react";

export default function SeedMasterAdminPage() {
  const [loading, setLoading] = useState(false);
  const [seeded, setSeeded] = useState(false);

  const handleSeed = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/seed-master", {
        method: "POST",
      });

      const data = await response.json();

      if (response.ok) {
        toast.success(data.message);
        setSeeded(true);
      } else {
        toast.error(data.error || "Failed to create Master Admin");
      }
    } catch (error) {
      toast.error("An error occurred while creating Master Admin");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-background to-muted">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <CardTitle className="text-2xl">Initialize Master Admin</CardTitle>
          <CardDescription>
            Create the Master Admin account for GenieBMS
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {seeded ? (
            <div className="text-center space-y-4">
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900">
                <CheckCircle className="h-8 w-8 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <h3 className="font-semibold text-lg">Master Admin Created!</h3>
                <p className="text-sm text-muted-foreground mt-2">
                  You can now sign in with the following credentials:
                </p>
              </div>
              <div className="bg-muted p-4 rounded-lg space-y-2 text-left">
                <div>
                  <span className="text-xs text-muted-foreground">Email:</span>
                  <p className="font-mono text-sm">masteradmin@geniebms.local</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Username:</span>
                  <p className="font-mono text-sm font-semibold">MasterAdmin</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Password:</span>
                  <p className="font-mono text-sm font-semibold">admin890</p>
                </div>
              </div>
              <Button asChild className="w-full">
                <a href="/auth/signin">Go to Sign In</a>
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-lg space-y-2">
                <p className="text-sm font-medium">Master Admin Credentials:</p>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>• Email: masteradmin@geniebms.local</p>
                  <p>• Username: MasterAdmin</p>
                  <p>• Password: admin890</p>
                </div>
              </div>
              <Button
                onClick={handleSeed}
                disabled={loading}
                className="w-full"
                size="lg"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    Creating Master Admin...
                  </>
                ) : (
                  <>
                    <Shield className="mr-2 h-5 w-5" />
                    Create Master Admin
                  </>
                )}
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                This should be done only once during initial setup
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
