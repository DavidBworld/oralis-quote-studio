import { AppTopNav } from "@/components/AppTopNav";

interface AppLayoutProps {
  children: React.ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col w-full">
      <AppTopNav />
      <main className="flex-1 overflow-auto bg-background">
        {children}
      </main>
    </div>
  );
}
