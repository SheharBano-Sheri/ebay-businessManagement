"use client";

import * as React from "react";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { IconBox, IconCamera, IconChartBar, IconDashboard, IconDatabase, IconFileAi, IconFileDescription, IconFileWord, IconFolder, IconHelp, IconInnerShadowTop, IconListDetails, IconMenuOrder, IconPackage, IconReport, IconSearch, IconSettings, IconUsers } from "@tabler/icons-react";

import { NavDocuments } from "@/components/nav-documents";
import { NavMain } from "@/components/nav-main";
import { NavSecondary } from "@/components/nav-secondary";
import { NavUser } from "@/components/nav-user";
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from "@/components/ui/sidebar";

const data = {
  navMain: [
    {
      title: "Dashboard",
      url: "/dashboard",
      icon: IconDashboard,
    },
    {
      title: "Orders",
      url: "/dashboard/orders",
      icon: IconPackage,
    },
    {
      title: "Inventory",
      url: "/dashboard/inventory",
      icon: IconBox,
    },
    {
      title: "Vendors",
      url: "/dashboard/vendors",
      icon: IconUsers,
    },
    {
      title: "Accounts",
      url: "/dashboard/accounts",
      icon: IconDatabase,
    },
    {
      title: "Payments",
      url: "/dashboard/payments",
      icon: IconChartBar,
    },
    {
      title: "Team",
      url: "/dashboard/team",
      icon: IconUsers,
    },
  ],
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
  
  const user = {
    name: session?.user?.name || "User",
    email: session?.user?.email || "",
    avatar: session?.user?.image || "/avatars/default.jpg",
  };

  // Add Vendor Approvals page for Master Admin
  const navItems = [...data.navMain];
  if (session?.user?.role === 'master_admin') {
    navItems.push({
      title: "Vendor Approvals",
      url: "/dashboard/vendor-approvals",
      icon: IconUsers,
    });
  }

  return (
    <Sidebar collapsible="offcanvas" {...props}>
      <SidebarHeader className="border-b-0 bg-transparent">
        <a href="/dashboard" className="block px-4 py-4">
          <img 
            src="/genie-logo.png" 
            alt="GenieBMS Logo" 
            className="w-full h-auto object-contain"
            style={{ maxHeight: '70px' }}
          />
        </a>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={navItems} />
        {/* <NavDocuments items={data.navTeam} /> */}
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={user} />
      </SidebarFooter>
    </Sidebar>
  );
}
