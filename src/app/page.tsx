"use client";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BookOpen, Users, Sparkles, Loader2 } from "lucide-react";
import Image from "next/image";
import { useAuth } from "@/lib/AuthProvider";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { isAuthenticated, isLoading, login } = useAuth();
  const router = useRouter();

  // Redirect to organizations if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/organizations');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleSignIn = async () => {
    await login();
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b p-4 md:p-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Image
              src="https://i0.wp.com/www.lyzr.ai/wp-content/uploads/2024/11/cropped_lyzr_logo_1.webp?fit=452%2C180&ssl=1"
              alt="Lyzr Logo"
              width={80}
              height={32}
              className="h-8 object-contain dark:invert"
              style={{ width: 'auto', height: '32px' }}
            />
            <span className="text-xl font-semibold">L&D Platform</span>
          </div>
          <Button onClick={handleSignIn}>Sign in with Lyzr</Button>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center p-4 md:p-6 lg:p-8">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          {/* Title */}
          <div className="space-y-4">
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight">
              AI-Powered Learning <br />
              <span className="text-primary">Made Simple</span>
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Transform your team's skills with intelligent course creation,
              AI tutoring, and personalized learning paths.
            </p>
          </div>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8" onClick={handleSignIn}>
              Get Started
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8">
              Watch Demo
            </Button>
          </div>

          {/* Feature Cards */}
          <div className="grid md:grid-cols-3 gap-6 mt-16">
            <Card className="p-6 text-left space-y-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <BookOpen className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Course Creation</h3>
              <p className="text-sm text-muted-foreground">
                Build engaging courses with videos, articles, and AI-generated quizzes in minutes.
              </p>
            </Card>

            <Card className="p-6 text-left space-y-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">AI Tutor</h3>
              <p className="text-sm text-muted-foreground">
                Get personalized help with context-aware AI assistance for every learner.
              </p>
            </Card>

            <Card className="p-6 text-left space-y-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">Team Management</h3>
              <p className="text-sm text-muted-foreground">
                Track progress, manage departments, and measure learning outcomes effortlessly.
              </p>
            </Card>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t p-6 text-center text-sm text-muted-foreground">
        <p>Powered by Lyzr AI • © 2025 All rights reserved</p>
      </footer>
    </div>
  );
}
