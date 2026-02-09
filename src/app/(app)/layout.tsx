"use client";

import { AuthProvider } from "@/lib/AuthProvider";
import { OrganizationProvider } from "@/lib/OrganizationProvider";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <OrganizationProvider>
        {children}
      </OrganizationProvider>
    </AuthProvider>
  );
}
