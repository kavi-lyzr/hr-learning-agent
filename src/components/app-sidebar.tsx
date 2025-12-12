"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
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
  Bot,
  RefreshCcw,
  Info,
  Zap,
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
import { useAuth } from "@/lib/AuthProvider";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";

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
    title: "AI Assistant",
    url: "/employee/ai-assistant",
    icon: Bot,
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

export function AppSidebar({ role = "admin", user }: AppSidebarProps) {
  const { credits, totalCredits, usedCredits, refreshCredits, logout } = useAuth();
  const navItems = role === "admin" ? adminNavItems : employeeNavItems;
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    refreshCredits();
  }, []);

  const handleRefreshCredits = async () => {
    setIsRefreshing(true);
    try {
      await refreshCredits();
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b p-4 max-h-16 h-16">
        <div className="flex items-center gap-2">
          {/* {organization?.iconUrl ? (
            <img
              src={organization.iconUrl}
              alt={organization.name}
              className="h-8 w-8 rounded"
            />
          ) : (
            <img src="/lyzr.png" alt="Lyzr L&D" className="h-8 w-8 rounded" />
          )} */}
          <img src="/lyzr.png" alt="Lyzr L&D" className="h-8 w-8 rounded" />
          <div className="flex flex-col">
            <span className="text-sm font-semibold">
              {"Lyzr L&D"}
              {/* organization?.name ||  */}
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
                    <Link href={item.url}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
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
                    <Link href="/admin/settings">
                      <Settings className="h-4 w-4" />
                      <span>Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>

      <SidebarFooter>
        {/* Credits Section - Different UI for admin vs employee */}
        <div className="px-3 py-3 space-y-2 border-b">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">
              {role === "admin" ? "Credits Left" : "Organization Credits"}
            </span>
            <div className="flex items-center gap-1">
              <span className="text-xs font-medium text-muted-foreground text-right">
                {Math.floor(credits || 0).toLocaleString()}
              </span>
              <button
                onClick={handleRefreshCredits}
                disabled={isRefreshing}
                className="p-1 hover:bg-accent rounded transition-colors disabled:opacity-50 cursor-pointer disabled:cursor-default"
                aria-label="Refresh credits"
              >
                <RefreshCcw className={`h-3 w-3 text-muted-foreground ${isRefreshing ? "animate-spin" : ""}`} />
              </button>
              <HoverCard>
                <HoverCardTrigger asChild>
                  <button
                    className="p-1 hover:bg-accent rounded transition-colors"
                    aria-label="View credits summary"
                  >
                    <Info className="h-3 w-3 text-muted-foreground" />
                  </button>
                </HoverCardTrigger>
                <HoverCardContent align="end" className="w-64">
                  <div className="space-y-4">
                    <div>
                      <h4 className="text-sm font-semibold mb-3">
                        {role === "admin" ? "Credits Summary" : "Organization Credits"}
                      </h4>
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Total Credits</span>
                          <span className="text-sm font-medium">
                            {Math.floor(totalCredits || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Used Credits</span>
                          <span className="text-sm font-medium">
                            {Math.floor(usedCredits || 0).toLocaleString()}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">Credits Left</span>
                          <span className="text-sm font-medium">
                            {Math.floor(credits || 0).toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => {
                        window.open("https://studio.lyzr.ai/upgrade-plan?section=topup", "_blank");
                      }}
                    >
                      <Zap className="h-4 w-4" />
                      Top up
                    </Button>
                  </div>
                </HoverCardContent>
              </HoverCard>
            </div>
          </div>
          {totalCredits && totalCredits > 0 && (
            <Progress
              value={(credits && credits > 0 ? (credits / totalCredits) * 100 : 0)}
              className="h-1.5"
            />
          )}
        </div>

        {/* User Info Section */}
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
                <DropdownMenuItem asChild>
                  <Link href="/account/settings">
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Account Settings</span>
                  </Link>
                </DropdownMenuItem>
                {/* <DropdownMenuItem asChild>
                  <button onClick={refreshCredits}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Refresh Credits
                  </button>
                </DropdownMenuItem> */}
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
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
