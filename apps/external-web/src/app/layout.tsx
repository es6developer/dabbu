import type { Metadata, Viewport } from 'next';
import dynamic from 'next/dynamic';
import { Toaster } from 'sonner';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from '@/lib/auth-context';
import { LoadingProvider } from '@/components/loaders';
import { ThemeProvider as ThemeContextProvider } from '@/lib/theme-context';
import './globals.css';

const InstallPrompt = dynamic(
  () => import('@/components/install-prompt').then((m) => m.InstallPrompt),
  { ssr: false },
);

const GOOGLE_CLIENT_ID =
  process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID ||
  '1031730335520-m1ovd3tjcrm74a0pdqp03qgm27bnuita.apps.googleusercontent.com';

export const metadata: Metadata = {
  title: 'Dabbu Split — Collaborative Finance',
  description:
    'Join group expenses, trips, and shared finances with friends and family. Real-time collaboration for everyone.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Dabbu Split',
  },
  icons: {
    icon: [
      { url: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/icons/apple-icon-180x180.png' }],
  },
  openGraph: {
    title: 'Dabbu Split — Collaborative Finance',
    description: 'Join group expenses, trips, and shared finances with friends and family.',
    type: 'website',
    siteName: 'Dabbu Split',
  },
};

export const viewport: Viewport = {
  themeColor: '#F5F5F7',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
          <AuthProvider>
            <LoadingProvider>
              <ThemeContextProvider>
                {children}
              </ThemeContextProvider>
            </LoadingProvider>
          </AuthProvider>
        </GoogleOAuthProvider>
        <Toaster
          position="top-center"
          toastOptions={{
            style: {
              background: 'var(--toast-bg)',
              border: '1px solid var(--toast-border)',
              color: 'var(--toast-text)',
              borderRadius: '14px',
              fontSize: '14px',
            },
          }}
        />
        <InstallPrompt />
      </body>
    </html>
  );
}
