import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { Briefcase, FileText, User, MessageSquare, Target, Video, Sparkles } from "lucide-react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JobRight Clone",
  description: "AI Job Matcher",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} bg-[#f3f4f6] flex h-screen overflow-hidden text-gray-900`}>
        {/* Slim Sidebar */}
        <aside className="w-[84px] bg-white border-r border-gray-200 flex flex-col items-center py-6 space-y-8 z-10 shrink-0">
          <div className="w-12 h-12 bg-teal-400 rounded-xl flex items-center justify-center text-white font-bold text-2xl mb-2 shadow-sm">
            JR
          </div>
          <nav className="flex-1 flex flex-col items-center space-y-8 w-full">
            <Link href="/" className="flex flex-col items-center text-teal-600 hover:text-teal-700">
              <Briefcase className="w-6 h-6 mb-1.5" />
              <span className="text-[11px] font-semibold">Jobs</span>
            </Link>
            <Link href="/resume" className="flex flex-col items-center text-gray-400 hover:text-teal-600">
              <FileText className="w-6 h-6 mb-1.5" />
              <span className="text-[11px] font-semibold">Resume</span>
            </Link>
            <Link href="/profile" className="flex flex-col items-center text-gray-400 hover:text-teal-600">
              <User className="w-6 h-6 mb-1.5" />
              <span className="text-[11px] font-semibold">Profile</span>
            </Link>
            <Link href="/agent" className="flex flex-col items-center text-gray-400 hover:text-teal-600">
              <MessageSquare className="w-6 h-6 mb-1.5" />
              <span className="text-[11px] font-semibold">Agent</span>
            </Link>
          </nav>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col overflow-hidden relative">
          {children}

          {/* Floating Chat Bot */}
          <button className="absolute bottom-8 right-8 w-14 h-14 bg-white rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-gray-100 flex items-center justify-center text-teal-600 hover:scale-105 transition-transform z-50">
            <Sparkles className="w-6 h-6" />
          </button>
        </main>
      </body>
    </html>
  );
}
