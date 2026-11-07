import OverviewNavigation from "@/components/OverviewNavigation";
import "./admin.css";

export const metadata = { title: "Admin" };

// The whole site locks html/body scrolling (the story canvas scrolls inside itself), so admin
// pages must scroll inside their own <main>, under the normal site header.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="notes-overview-shell admin-shell">
      <OverviewNavigation />
      <main className="admin-main">{children}</main>
    </div>
  );
}
