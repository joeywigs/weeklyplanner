import { PlannerProvider } from '@/lib/planner-context';
import { Header } from '@/components/layout/header';
import { BottomNav } from '@/components/layout/bottom-nav';

export default function PlannerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PlannerProvider>
      <div className="min-h-screen flex flex-col bg-[var(--background)]">
        <Header />
        <main className="flex-1 pb-20">{children}</main>
        <BottomNav />
      </div>
    </PlannerProvider>
  );
}
