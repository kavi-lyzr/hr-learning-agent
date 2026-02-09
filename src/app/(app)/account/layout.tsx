"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { useOrganization } from "@/lib/OrganizationProvider";
import { useAuth } from "@/lib/AuthProvider";
import { useUserProfile } from "@/hooks/use-queries";

export default function AccountLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { currentOrganization, isLoading } = useOrganization();
  const { email, displayName } = useAuth();
  const { data: userProfile } = useUserProfile(email);

  // Determine role based on current route (fallback to employee)
  const pathname = usePathname();
  const isAdminRoute = pathname?.startsWith('/admin');
  const role = isAdminRoute ? 'admin' : 'employee';

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar
          role={role}
          user={{
            name: userProfile?.name || displayName || undefined,
            email: email || undefined,
            avatarUrl: userProfile?.avatarUrl,
          }}
          organization={currentOrganization ? {
            name: currentOrganization.name,
            iconUrl: currentOrganization.iconUrl,
          } : undefined}
        />
        <div className="flex-1 flex flex-col min-w-0 w-full">
          <SiteHeader />
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}
