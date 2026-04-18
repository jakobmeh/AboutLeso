import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { SiteNavbar } from "./components/site-navbar";

export const metadata: Metadata = {
  title: "Leso",
  description: "Sodobna spletna trgovina za modo Leso.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col" suppressHydrationWarning>
        <SiteNavbar />
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
