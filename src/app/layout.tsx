import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import { AuthProvider } from "@/lib/AuthProvider";
import { OrganizationProvider } from "@/lib/OrganizationProvider";
import { ThemeProvider } from "@/components/ThemeProvider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Lyzr L&D Platform",
    template: "%s | Lyzr L&D"
  },
  description: "AI-powered Learning & Development platform for enterprises. Create courses, manage employees, and deliver training with AI-powered tutoring.",
  keywords: [
    "learning",
    "development",
    "L&D",
    "training",
    "courses",
    "AI tutor",
    "employee training",
    "Lyzr",
    "education"
  ],
  authors: [{ name: "Lyzr AI" }],
  creator: "Lyzr AI",
  publisher: "Lyzr AI",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link href="https://api.fontshare.com/v2/css?f[]=switzer@1,2&display=swap" rel="stylesheet"></link>
        <link rel="icon" href="/lyzr.png" type="image/png" />
        <meta name="theme-color" content="#8b5cf6" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AuthProvider>
            <OrganizationProvider>
              <main className="w-full min-w-full">
                {children}
                <Toaster />
              </main>
            </OrganizationProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
