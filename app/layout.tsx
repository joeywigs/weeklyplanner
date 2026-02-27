import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Weekly Family Planner',
  description: 'Plan your family week — mornings, lunches, activities, and dinners',
  manifest: '/weeklyplanner/manifest.webmanifest',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Planner',
  },
  icons: {
    icon: '/weeklyplanner/icon-192.png',
    apple: '/weeklyplanner/apple-touch-icon.png',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  viewportFit: 'cover',
  themeColor: '#6ba0c9',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/weeklyplanner/apple-touch-icon.png" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Planner" />
      </head>
      <body className="font-sans min-h-screen">
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', function() {
                  navigator.serviceWorker.register('/weeklyplanner/sw.js', { scope: '/weeklyplanner/' });
                });
              }
            `,
          }}
        />
      </body>
    </html>
  );
}
