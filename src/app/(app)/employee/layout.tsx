"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { SiteHeader } from "@/components/site-header";
import { AiTutorPanel } from "@/components/ai-tutor-panel";
import { useOrganization } from "@/lib/OrganizationProvider";
import { useAuth } from "@/lib/AuthProvider";
import { useUserProfile } from "@/hooks/use-queries";
import { Bot } from "lucide-react";
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
  const [aiPanelMinimized, setAiPanelMinimized] = useState(false);

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
              <div className="hidden md:flex flex-1 min-h-0 w-full">
                <ResizablePanelGroup direction="horizontal" className="flex-1 min-h-0 w-full">
                  {/* Main Content Panel */}
                  <ResizablePanel defaultSize={75} minSize={50} className="flex flex-col min-h-0">
                    <SiteHeader />
                    {children}
                  </ResizablePanel>

                  {/* AI Tutor Panel - Resizable (hide completely when minimized) */}
                  {!aiPanelMinimized && (
                    <>
                      <ResizableHandle withHandle />
                      <ResizablePanel defaultSize={25} minSize={20} maxSize={45} className="flex flex-col min-h-0 min-w-0">
                        <AiTutorPanel onMinimize={() => setAiPanelMinimized(true)} />
                      </ResizablePanel>
                    </>
                  )}
                </ResizablePanelGroup>
              </div>

              {/* Mobile: Full width with floating AI button */}
              <div className="flex md:hidden flex-1 flex-col min-h-0 min-w-0 w-full">
                <SiteHeader />
                {children}
                {!aiPanelMinimized && <AiTutorPanel onMinimize={() => setAiPanelMinimized(true)} />}
              </div>

              {/* Floating launcher when minimized */}
              {aiPanelMinimized && (
                <div className="fixed bottom-4 right-4 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
                  <button
                    type="button"
                    onClick={() => setAiPanelMinimized(false)}
                    className="rounded-full h-14 w-14 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 bg-primary text-primary-foreground flex items-center justify-center"
                    aria-label="Open AI assistant panel"
                  >
                    <span className="sr-only">Open AI assistant panel</span>
                    <Bot className="h-6 w-6" />
                  </button>
                </div>
              )}
            </>
          ) : (
            // AI Assistant page - full width, no panel
            <div className="flex-1 flex flex-col min-h-0 min-w-0 w-full">
              <SiteHeader />
              {children}
            </div>
          )}
        </div>
      </div>
    </SidebarProvider>
  );
}
