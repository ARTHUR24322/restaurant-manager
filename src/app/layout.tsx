import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Toaster } from "sonner";
import "./globals.css";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "SmartResto",
  description: "Plateforme intelligente de gestion de restaurant",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SmartResto",
  },
  icons: {
    icon: "/logo.svg",
    apple: "/logo.svg",
  },
};

export const viewport: Viewport = {
  themeColor: "#4f46e5",
};

import { ThemeProvider } from "@/components/ThemeProvider";
import { OfflineSync } from "@/components/client/OfflineSync";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem
          disableTransitionOnChange
        >
          <Toaster richColors position="top-center" />
          <OfflineSync />
          {children}
        </ThemeProvider>
        
        {/* Anti Broken-Image Global Proxy */}
        <script
          dangerouslySetInnerHTML={{
             __html: `
               document.addEventListener('error', function (e) {
                 if (e.target && e.target.tagName === 'IMG') {
                   if (e.target.dataset.errorHandled) return;
                   e.target.dataset.errorHandled = 'true';
                   e.target.src = 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?q=80&w=400&auto=format&fit=crop';
                 }
               }, true);
             `,
          }}
        />
      </body>
    </html>
  );
}
