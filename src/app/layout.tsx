import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible, Bricolage_Grotesque } from "next/font/google";
import "./globals.css";
import { StudentProvider } from "@/components/StudentProvider";
import { AppShell } from "@/components/AppShell";

const display = Bricolage_Grotesque({ subsets: ["latin"], variable: "--font-display", weight: ["500", "600", "700", "800"] });
const body = Atkinson_Hyperlegible({ subsets: ["latin"], variable: "--font-body", weight: ["400", "700"] });

export const metadata: Metadata = {
  title: "Progress Diary",
  description: "Follow your child's test results, subject by subject.",
};

export const viewport: Viewport = { themeColor: "#1E2A4A", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        <StudentProvider>
          <AppShell>{children}</AppShell>
        </StudentProvider>
      </body>
    </html>
  );
}
