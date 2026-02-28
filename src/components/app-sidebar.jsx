"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import UserCheck from "lucide-react";
import Image from "next/image";
import {
  IconBox,
  IconChartBar,
  IconDashboard,
  IconDatabase,
  IconHelp,
  IconListDetails,
  IconMenuOrder,
  IconPackage,
  IconSettings,
  IconShield,
  IconUsers,
} from "@tabler/icons-react";

import { NavDocuments } from "@/components/nav-documents";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
} from "@/components/ui/sidebar";

const data = {
  navSecondary: [
    {
      title: "Settings",
      url: "/dashboard/settings",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
  ],
};

export function AppSidebar({ ...props }) {
  const { data: session } = useSession();
  const [mounted, setMounted] = React.useState(false);

  React.useEffect(() => {
    setMounted(true);
  }, []);

  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "/avatars/default.jpg",
  };

  // Helper function to check if user has access to a module
  const hasAccess = (module) => {
    // Owners, master admins, and public vendors have full access
    if (
      session?.user?.role === "owner" ||
      session?.user?.role === "master_admin" ||
      session?.user?.role === "public_vendor"
    ) {
      return true;
    }

    // Team members need to check permissions
    if (session?.user?.permissions) {
      const modulePerms = session.user.permissions[module];
      return modulePerms && modulePerms.length > 0;
    }

    return false;
  };

  // Build navigation based on user permissions
  let navItems = [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
  ];

  // Add Master Admin Panel for Master Admin only
  if (session?.user?.role === "master_admin") {
    navItems.push({
      title: "Master Admin Panel",
      url: "/dashboard/master-admin",
      icon: IconShield,
    });
  }

  // Add items based on permissions
  if (hasAccess("orders")) {
    navItems.push({
      title: "Orders",
      url: "/dashboard/orders",
      icon: IconPackage,
    });
  }

  if (hasAccess("inventory")) {
    navItems.push({
      title: "Inventory",
      url: "/dashboard/inventory",
      icon: IconBox,
    });
  }

  if (hasAccess("vendors")) {
    navItems.push({
      title: "Vendors",
      url: "/dashboard/vendors",
      icon: IconUsers,
    });

    navItems.push({
      title: "Purchase History",
      url: "/dashboard/purchases",
      icon: IconMenuOrder,
    });
  }

  if (hasAccess("accounts")) {
    navItems.push({
      title: "Accounts",
      url: "/dashboard/accounts",
      icon: IconDatabase,
    });
  }

  if (hasAccess("payments")) {
    navItems.push({
      title: "Payments",
      url: "/dashboard/payments",
      icon: IconChartBar,
    });
  }

  // Only owners and users with team permissions can see Team management
  if (
    session?.user?.role === "owner" ||
    session?.user?.role === "public_vendor" ||
    hasAccess("team")
  ) {
    navItems.push({
      title: "Team",
      url: "/dashboard/team",
      icon: IconUsers,
    });
  }

  // Add Approvals pages for Master Admin
  if (session?.user?.role === "master_admin") {
    navItems.push({
      title: "Inventory Approvals",
      url: "/dashboard/inventory-approvals",
      icon: IconListDetails,
    });
    navItems.push({
      title: "Vendor Approvals",
      url: "/dashboard/vendor-approvals",
      icon: IconUsers,
    });
  }

  const logoSrc = "/logo.png";

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="border-b-0 bg-transparent">
        <a href="/dashboard">
          <img
            src={logoSrc}
            alt="GenieBMS Logo"
            className="w-full h-auto object-contain"
            style={{ marginBottom: "-80px", marginTop: "-80px", width: "100%" }}
          />
        </a>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
