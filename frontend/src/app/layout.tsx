import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

import { NotificationInitializer } from "@/components/NotificationInitializer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Freedom Speech | Anonymous Unfiltered Discussions",
  description: "A real-time, location-based anonymous opinion sharing platform. Speak your mind freely and securely.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} antialiased selection:bg-primary/30`} suppressHydrationWarning>
        <NotificationInitializer />
        {children}
      </body>
    </html>
  );
}

