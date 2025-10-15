"use client";

import * as React from "react";
import {
  BookOpen,
  GraduationCap,
  LayoutDashboard,
  Users,
  Building2,
  Settings,
  BarChart3,
  LogOut,
  ChevronUp,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from "@/components/ui/sidebar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

// Admin navigation items
const adminNavItems = [
  {
    title: "Dashboard",
    url: "/admin/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Courses",
    url: "/admin/courses",
    icon: BookOpen,
  },
  {
    title: "Employees",
    url: "/admin/employees",
    icon: Users,
  },
  {
    title: "Departments",
    url: "/admin/departments",
    icon: Building2,
  },
  {
    title: "Analytics",
    url: "/admin/analytics",
    icon: BarChart3,
  },
];

// Employee navigation items
const employeeNavItems = [
  {
    title: "My Learning",
    url: "/employee/dashboard",
    icon: LayoutDashboard,
  },
  {
    title: "Browse Courses",
    url: "/employee/courses",
    icon: BookOpen,
  },
  {
    title: "My Progress",
    url: "/employee/progress",
    icon: GraduationCap,
  },
];

interface AppSidebarProps {
  role?: "admin" | "employee";
  user?: {
    name?: string;
    email?: string;
    avatarUrl?: string;
  };
  organization?: {
    name?: string;
    iconUrl?: string;
  };
}

export function AppSidebar({ role = "admin", user, organization }: AppSidebarProps) {
  const navItems = role === "admin" ? adminNavItems : employeeNavItems;

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4">
        <div className="flex items-center gap-2">
          {organization?.iconUrl ? (
            <img
              src={organization.iconUrl}
              alt={organization.name}
              className="h-8 w-8 rounded"
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded bg-primary text-primary-foreground text-sm font-semibold">
              L
            </div>
          )}
          <div className="flex flex-col">
            <span className="text-sm font-semibold">
              {organization?.name || "Lyzr L&D"}
            </span>
            <span className="text-xs text-muted-foreground capitalize">
              {role} Portal
            </span>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Settings</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <a href="/admin/settings">
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        <SidebarMenu>
          <SidebarMenuItem>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <SidebarMenuButton className="h-12">
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={user?.avatarUrl} />
                    <AvatarFallback>
                      {user?.name?.charAt(0).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col flex-1 text-left text-sm">
                    <span className="font-medium truncate">
                      {user?.name || "User"}
                    </span>
                    <span className="text-xs text-muted-foreground truncate">
                      {user?.email || "user@example.com"}
                    </span>
                  </div>
                  <ChevronUp className="h-4 w-4 ml-auto" />
                </SidebarMenuButton>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuItem>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Account Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>Log out</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  );
}
