import { AppHeader } from "@/components/AppHeader";
import { Sidebar } from "@/components/Sidebar";
import { StorageNotice } from "@/components/StorageNotice";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-control focus:bg-ink focus:px-4 focus:py-3 focus:text-paper"
      >
        Skip to content
      </a>
      <Sidebar />
      <div className="lg:pl-64">
        <AppHeader />
        <StorageNotice />
        {/* page-main is a size container so page covers can bleed to its edges. */}
        <div className="page-main">
          <main id="main" className="safe-bottom mx-auto w-full max-w-5xl px-4 pb-32 sm:px-8 md:pb-16 lg:px-12">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
