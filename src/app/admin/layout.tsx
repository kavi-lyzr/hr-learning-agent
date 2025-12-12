"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { useOrganization } from "@/lib/OrganizationProvider";
import { useAuth } from "@/lib/AuthProvider";
import { useUserProfile } from "@/hooks/use-queries";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const { currentOrganization, isLoading } = useOrganization();
  const { email, displayName } = useAuth();
  const { data: userProfile } = useUserProfile(email);

  useEffect(() => {
    if (!isLoading && !currentOrganization) {
      router.push('/organizations');
    } else if (!isLoading && currentOrganization && currentOrganization.role !== 'admin') {
      // Non-admins cannot access admin routes
      router.push('/employee/dashboard');
    }
  }, [currentOrganization, isLoading, router]);

  if (isLoading) {
    return null;
  }

  if (!currentOrganization) {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar
          role="admin"
          user={{
            name: userProfile?.name || displayName || undefined,
            email: email || undefined,
            avatarUrl: userProfile?.avatarUrl,
          }}
          organization={{
            name: currentOrganization.name,
            iconUrl: currentOrganization.iconUrl,
          }}
        />
        <div className="flex-1 flex flex-col w-full">
          <SiteHeader />
          {children}
        </div>
      </div>
    </SidebarProvider>
  );
}
