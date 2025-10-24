"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { LogOut, ChevronDown, Moon, Sun, Eye } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/lib/AuthProvider";
import { useEffect, useState } from "react";

interface Organization {
  id: string;
  name: string;
  role: 'admin' | 'employee';
}

interface SiteHeaderProps {
  organization?: Organization;
  breadcrumbs?: Array<{ label: string; href?: string }>;
}

export function SiteHeader({ organization, breadcrumbs }: SiteHeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { email, displayName, logout } = useAuth();
  const [isAdminView, setIsAdminView] = useState(true);
  const [mounted, setMounted] = useState(false);

  // Determine if current view is admin or employee based on pathname
  useEffect(() => {
    setMounted(true);
    setIsAdminView(pathname.startsWith('/admin'));
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  const toggleView = () => {
    if (!organization) return;

    const newView = isAdminView ? 'employee' : 'admin';
    setIsAdminView(!isAdminView);

    // Navigate to the new view's dashboard
    if (newView === 'admin') {
      router.push(`/admin/dashboard?org=${organization.id}`);
    } else {
      router.push(`/employee/dashboard?org=${organization.id}`);
    }
  };

  const getNameFromEmail = (email: string | null | undefined): string => {
    if (!email) return 'User';
    const name = email.split('@')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  const userDisplayName = displayName || getNameFromEmail(email);

  // Prevent hydration mismatch for theme-dependent UI
  if (!mounted) {
    return (
      <header className="sticky top-0 z-50 border-b bg-background">
        <div className="container mx-auto px-4 h-16" />
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">
        {/* Left: Breadcrumbs or Organization Name */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          {breadcrumbs && breadcrumbs.length > 0 ? (
            <Breadcrumb>
              <BreadcrumbList>
                {breadcrumbs.map((crumb, index) => (
                  <div key={index} className="flex items-center">
                    {index > 0 && <BreadcrumbSeparator />}
                    <BreadcrumbItem>
                      {crumb.href ? (
                        <BreadcrumbLink href={crumb.href} className="max-w-[200px] truncate">
                          {crumb.label}
                        </BreadcrumbLink>
                      ) : (
                        <BreadcrumbPage className="max-w-[200px] truncate">
                          {crumb.label}
                        </BreadcrumbPage>
                      )}
                    </BreadcrumbItem>
                  </div>
                ))}
              </BreadcrumbList>
            </Breadcrumb>
          ) : organization ? (
            <div className="flex flex-col min-w-0">
              <span className="font-semibold text-base truncate">{organization.name}</span>
              <p className="text-xs text-muted-foreground">
                {isAdminView ? 'Admin View' : 'Employee View'}
              </p>
            </div>
          ) : (
            <span className="font-semibold text-base">Lyzr L&D</span>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {/* Theme Switcher */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="h-9 w-9"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          {/* View Toggle (Admin Only) */}
          {organization && organization.role === 'admin' && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md border bg-muted/50">
              <Eye className="h-4 w-4 text-muted-foreground" />
              <Switch
                checked={isAdminView}
                onCheckedChange={toggleView}
                className="data-[state=checked]:bg-primary"
              />
              <Label className="text-xs font-medium cursor-pointer" onClick={toggleView}>
                {isAdminView ? 'Admin' : 'Employee'}
              </Label>
            </div>
          )}

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 pr-3 pl-0">
                <Avatar className="h-9 w-9">
                  <AvatarImage src="" />
                  <AvatarFallback className="text-xs bg-muted">
                    {userDisplayName.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="h-4 w-4 opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <div className="px-2 py-1.5">
                <p className="text-sm font-medium">{userDisplayName}</p>
                <p className="text-xs text-muted-foreground truncate">{email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => router.push('/organizations')}>
                Switch Organization
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
