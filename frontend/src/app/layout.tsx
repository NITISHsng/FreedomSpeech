import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";


const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Freedom Speech | Anonymous Unfiltered Discussions",
  description: "A real-time, location-based anonymous opinion sharing platform. Speak your mind freely and securely.",
  keywords: ["anonymous chatting", "ghost chat", "unfiltered discussion", "secure messaging", "freedom speech", "real-time chat"],
  authors: [{ name: "FreedomSpeech Team" }],
  openGraph: {
    title: "Freedom Speech | Anonymous Unfiltered Discussions",
    description: "A real-time, location-based anonymous opinion sharing platform. Speak your mind freely and securely.",
    url: "https://freedomspeech.com",
    siteName: "FreedomSpeech",
    images: [
      {
        url: "/logo.png",
        width: 800,
        height: 600,
        alt: "Freedom Speech Logo",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Freedom Speech | Anonymous Unfiltered Discussions",
    description: "Speak your mind freely and securely on our anonymous platform.",
    images: ["/logo.png"],
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className={`${inter.className} antialiased selection:bg-primary/30`} suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}

