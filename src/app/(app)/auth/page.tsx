"use client";

import { useAuth } from "@/lib/AuthProvider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";


export default function AuthPage() {
  const { isAuthenticated, isLoading, userId, email, displayName, logout } = useAuth();
  const router = useRouter();


  useEffect(() => {
    if (isAuthenticated) {
      router.push('/organizations');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="flex flex-col min-h-screen bg-background">
    </div>
  );
}
