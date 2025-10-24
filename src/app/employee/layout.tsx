"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { AiTutorPanel } from "@/components/ai-tutor-panel";
import { useOrganization } from "@/lib/OrganizationProvider";
import { useAuth } from "@/lib/AuthProvider";

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentOrganization, isLoading } = useOrganization();
  const { email, displayName } = useAuth();

  useEffect(() => {
    if (!isLoading && !currentOrganization) {
      router.push('/organizations');
    }
  }, [currentOrganization, isLoading, router]);

  if (isLoading) {
    return null;
  }

  if (!currentOrganization) {
    return null;
  }

  // Check if we're on the AI assistant page (full-screen, no panel)
  const isAIAssistantPage = pathname === '/employee/ai-assistant';

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full">
        <AppSidebar
          role="employee"
          user={{
            name: displayName || undefined,
            email: email || undefined,
          }}
          organization={{
            name: currentOrganization.name,
            iconUrl: currentOrganization.iconUrl,
          }}
        />
        <div className="flex-1 flex w-full">
          {/* Main Content Area */}
          <div className="flex-1 flex flex-col min-w-0 w-full">
            <SiteHeader organization={currentOrganization} />
            {children}
          </div>

          {/* AI Tutor Panel - Hidden on AI Assistant page and small screens */}
          {!isAIAssistantPage && (
            <div className="w-96 hidden xl:block flex-shrink-0">
              <AiTutorPanel />
            </div>
          )}
        </div>
      </div>
    </SidebarProvider>
  );
}
