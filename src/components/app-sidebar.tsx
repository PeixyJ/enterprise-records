"use client"

import * as React from "react"
import {
  Building2,
  FileText,
  LayoutDashboard,
  LifeBuoy,
  Settings2,
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavSecondary } from "@/components/nav-secondary"
import { NavUser } from "@/components/nav-user"
import { Link } from "react-router"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

const data = {
  user: {
    name: "管理员",
    email: "admin",
    avatar: "",
  },
  navMain: [
    {
      title: "仪表盘",
      url: "/app",
      icon: LayoutDashboard,
      isActive: true,
    },
    {
      title: "档案管理",
      url: "#",
      icon: FileText,
      items: [
        { title: "初筛表", url: "/app/screening" },
        { title: "市级表", url: "/app/city" },
        { title: "镇级表", url: "/app/town" },
      ],
    },
    {
      title: "系统设置",
      url: "#",
      icon: Settings2,
      items: [
        { title: "基本设置", url: "/app/settings" },
        { title: "高级设置", url: "/app/advanced-settings" },
      ],
    },
  ],
  navSecondary: [
    {
      title: "帮助支持",
      url: "#",
      icon: LifeBuoy,
    },
  ],
}

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar variant="inset" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild>
              <Link to="/app">
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                  <Building2 className="size-4" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-medium">企业档案系统</span>
                  <span className="truncate text-xs">Enterprise Records</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  )
}
