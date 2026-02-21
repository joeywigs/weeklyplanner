import { BottomNav } from '@/components/layout/bottom-nav';

export default function PagesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--background)]">
      <main className="flex-1 pb-20">{children}</main>
      <BottomNav />
    </div>
  );
}
