import OverviewNavigation from "@/components/OverviewNavigation";
import "../shared-account.css";

/* Same sign-in card as Books (one account for both). */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="notes-overview-shell flex min-h-screen flex-col">
      <OverviewNavigation />
      <main className="shared-account">
        <section>{children}</section>
      </main>
    </div>
  );
}
