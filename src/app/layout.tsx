import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "One2Infinite — Internal Business Management",
  description: "Private internal system for One2Infinite Recruitment Solutions.",
  robots: { index: false, follow: false }, // private app — never index
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full font-sans antialiased">{children}</body>
    </html>
  );
}
