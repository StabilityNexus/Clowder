import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { CatsProvider } from "@/hooks/CatsProvider";
import { ThemeProvider } from "@/hooks/ThemeProvider";
import { Toaster } from "react-hot-toast";
import { WalletProvider } from "@/hooks/WalletProvider";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});
const bebasNueue = localFont({
  src: "./fonts/BebasNeue-Regular.woff",
  variable: "--font-bebas-nueue",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Clowder - Contribution Accounting Tokens (CATs)",
  description:
    "Clowder helps you track contributions to your projects with Contribution Accounting Tokens (CATs). Secure, semi-transferable, and easy to mint.",
  keywords:
    "Clowder, Contribution Accounting Tokens, CATs, secure, mint tokens, projects, community, Stability Nexus",
  robots: "index, follow",
  openGraph: {
    type: "website",
    url: "https://clowder.stability.nexus/",
    title: "Clowder - Contribution Accounting Tokens (CATs)",
    description:
      "Track contributions to your projects with Contribution Accounting Tokens (CATs) on Clowder. Simple to mint, secure against inflation.",
    images: [
      {
        url: "https://stability.nexus/logos/clowder.png",
        width: 1200,
        height: 630,
        alt: "Clowder Logo",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@StabilityNexus",
    title: "Clowder - Contribution Accounting Tokens (CATs)",
    description:
      "Track contributions to your projects using Contribution Accounting Tokens (CATs) on Clowder. Simple to mint, secure against inflation.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${bebasNueue.variable} antialiased`}
      >
        <Toaster />
        <CatsProvider>
          <WalletProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
            >
              {children}
            </ThemeProvider>
          </WalletProvider>
        </CatsProvider>
      </body>
    </html>
  );
}
