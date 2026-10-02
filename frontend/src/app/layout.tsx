import type { Metadata } from "next";
import { BriefcaseBusiness, Compass, FileText } from "lucide-react";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Job Hunt — Personal Job Intelligence",
  description: "Resume-aware job discovery and career intelligence.",
};

const navItems = [
  { href: "/", label: "Jobs", icon: BriefcaseBusiness },
  { href: "/resume", label: "Resume", icon: FileText },
  { href: "/explore", label: "To Explore", icon: Compass },
];

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div className="app-shell">
          <aside className="app-sidebar">
            <div className="app-brand" title="Job Hunt">
              JH
            </div>

            <nav className="app-nav" aria-label="Primary navigation">
              {navItems.map(({ href, label, icon: Icon }) => (
                <Link key={href} href={href} className="app-nav-link">
                  <Icon size={18} />
                  <span>{label}</span>
                </Link>
              ))}
            </nav>
          </aside>

          <main className="app-main">{children}</main>

        </div>
      </body>
    </html>
  );
}
