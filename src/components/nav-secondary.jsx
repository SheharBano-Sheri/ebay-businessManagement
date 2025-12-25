"use client";
import * as React from "react"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { Separator } from "@/components/ui/separator"

export function NavSecondary({
  items,
  ...props
}) {
  return (
    <SidebarGroup {...props}>
      <Separator className="mb-2" />
      <SidebarGroupContent>
        <SidebarMenu className="gap-0.5">
          {items.map((item) => (
            <SidebarMenuItem key={item.title}>
              <SidebarMenuButton asChild className="h-10 text-base font-medium">
                <a href={item.url} className="flex items-center justify-start gap-3 px-3 w-full">
                  <item.icon className="size-5 flex-shrink-0" />
                  <span className="leading-none tracking-wide">{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
