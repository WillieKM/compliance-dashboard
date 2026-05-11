import "./globals.css";
import Sidebar from "./components/Sidebar";
import ConditionalSidebar from "./components/ConditionalSidebar";

export const metadata = {
  title: "CareCompliance",
  description: "Washington State care compliance dashboard",
  manifest: "/manifest.json",
  appleWebApp: { capable: true, statusBarStyle: "default", title: "CareCompliance" },
  other: { "mobile-web-app-capable": "yes" },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-100">
        <div className="flex min-h-screen">
          <ConditionalSidebar>
            <Sidebar />
          </ConditionalSidebar>
          <main className="flex-1 p-8 overflow-auto">{children}</main>
        </div>
      </body>
    </html>
  );
}
