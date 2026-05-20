import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { ThemeProvider } from "@/components/theme-provider";
import { UserProvider } from "@/contexts/user-context";
import { TendersProvider } from "@/contexts/tenders-context";
import { NotificationsProvider } from "@/contexts/notifications-context";
import { AppShell } from "@/components/layout/app-shell";

export const metadata: Metadata = {
  title: "SONAR",
  description: "Sistema SONAR",
  icons: {
    icon: "/sonar-logo-transparent.png",
    shortcut: "/sonar-logo-transparent.png",
    apple: "/sonar-logo-transparent.png",
  },
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
  minimumScale: 0.1,
  maximumScale: 5,
  userScalable: true,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-br" className="bg-radar-cream" suppressHydrationWarning>
      <body className="min-h-screen bg-radar-cream font-sans">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          forcedTheme="light"
          disableTransitionOnChange
        >
          <UserProvider>
            <TendersProvider>
              <NotificationsProvider>
                <AppShell>
                  {children}
                </AppShell>
              </NotificationsProvider>
            </TendersProvider>
          </UserProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
