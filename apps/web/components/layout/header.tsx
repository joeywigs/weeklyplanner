'use client';

import Link from 'next/link';
import { useAuth } from '@/lib/hooks/use-auth';

export function Header() {
  const { user, logout } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[var(--background)]/95 backdrop-blur supports-[backdrop-filter]:bg-[var(--background)]/60">
      <div className="flex items-center justify-between h-14 px-4 max-w-4xl mx-auto">
        <Link href="/plan" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold text-sm">
            M
          </div>
          <span className="font-semibold hidden sm:inline">MealFlow</span>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          <NavLink href="/plan">Plan</NavLink>
          <NavLink href="/recipes">Recipes</NavLink>
          <NavLink href="/shopping">Shopping</NavLink>
        </nav>

        {user && (
          <div className="flex items-center gap-3">
            <span className="text-sm text-[var(--muted)] hidden sm:inline">
              {user.name}
            </span>
            {user.picture && (
              <img
                src={user.picture}
                alt=""
                className="w-8 h-8 rounded-full"
              />
            )}
            <button
              onClick={logout}
              className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] transition-colors"
            >
              Sign out
            </button>
          </div>
        )}
      </div>
    </header>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="px-3 py-1.5 rounded-lg text-sm font-medium text-[var(--muted)] hover:text-[var(--foreground)] hover:bg-[var(--border)] transition-colors"
    >
      {children}
    </Link>
  );
}
