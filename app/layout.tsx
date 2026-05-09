import "./globals.css";
import Sidebar from "./components/Sidebar";

export const metadata = {
  title: "CareCompliance",
  description: "Compliance dashboard platform",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="bg-slate-100">
        <div className="flex min-h-screen">

          <Sidebar />

          <main className="flex-1 p-8 overflow-auto">
            {children}
          </main>

        </div>
      </body>
    </html>
  );
}