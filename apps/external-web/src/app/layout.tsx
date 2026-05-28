import type { Metadata, Viewport } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Dabbu Split - Collaborative Finance",
  description:
    "Join group expenses, trips, and shared finances with friends and family. Real-time collaboration for everyone.",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Dabbu Split",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-icon-180x180.png" }],
  },
  openGraph: {
    title: "Dabbu Split - Collaborative Finance",
    description:
      "Join group expenses, trips, and shared finances with friends and family.",
    type: "website",
    siteName: "Dabbu Split",
  },
};

export const viewport: Viewport = {
  themeColor: "#0A0A0F",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-dabbu-bg text-dabbu-text antialiased">
        <ThemeProvider>{children}</ThemeProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: "var(--toast-bg)",
              border: "1px solid var(--toast-border)",
              color: "var(--toast-text)",
            },
          }}
        />
      </body>
    </html>
  );
}

function ThemeProvider({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 bg-gradient-radial from-dabbu-accent/3 via-transparent to-transparent pointer-events-none" />
      {children}
    </div>
  );
}
