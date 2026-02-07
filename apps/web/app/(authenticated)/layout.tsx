'use client';

import { useAuth } from '@/lib/hooks/use-auth';
import { Header } from '@/components/layout/header';
import { NavBar } from '@/components/layout/nav-bar';

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-brand-600/20" />
          <div className="h-2 w-24 rounded bg-[var(--border)]" />
        </div>
      </div>
    );
  }

  if (!user) {
    if (typeof window !== 'undefined') {
      window.location.href = '/';
    }
    return null;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <main className="flex-1 pb-20 md:pb-6">
        <div className="max-w-4xl mx-auto px-4 py-4">{children}</div>
      </main>
      <NavBar />
    </div>
  );
}
