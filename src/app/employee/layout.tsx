"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { AiTutorPanel } from "@/components/ai-tutor-panel";
import { useOrganization } from "@/lib/OrganizationProvider";
import { useAuth } from "@/lib/AuthProvider";
import { useUserProfile } from "@/hooks/use-queries";
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable";

export default function EmployeeLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { currentOrganization, isLoading } = useOrganization();
  const { email, displayName } = useAuth();
  const { data: userProfile } = useUserProfile(email);

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
            name: userProfile?.name || displayName || undefined,
            email: email || undefined,
            avatarUrl: userProfile?.avatarUrl,
          }}
          organization={{
            name: currentOrganization.name,
            iconUrl: currentOrganization.iconUrl,
          }}
        />
        <div className="flex-1 flex w-full min-w-0">
          {!isAIAssistantPage ? (
            <>
              {/* Desktop: Resizable Panels */}
              <div className="hidden md:flex flex-1">
                <ResizablePanelGroup direction="horizontal" className="flex-1">
                  {/* Main Content Panel */}
                  <ResizablePanel defaultSize={75} minSize={50} className="flex flex-col">
                    <SiteHeader />
                    {children}
                  </ResizablePanel>

                  {/* AI Tutor Panel - Resizable */}
                  <ResizableHandle withHandle />
                  <ResizablePanel defaultSize={25} minSize={20} maxSize={40} className="flex flex-col">
                    <AiTutorPanel />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>

              {/* Mobile: Full width with floating AI button */}
              <div className="flex md:hidden flex-1 flex-col min-w-0 w-full">
                <SiteHeader />
                {children}
                <AiTutorPanel />
              </div>
            </>
          ) : (
            // AI Assistant page - full width, no panel
            <div className="flex-1 flex flex-col min-w-0 w-full">
              <SiteHeader />
              {children}
            </div>
          )}
        </div>
      </div>
    </SidebarProvider>
  );
}
