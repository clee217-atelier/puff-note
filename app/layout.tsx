import type { Metadata } from "next";
import { Inter, Gaegu, Schoolbell} from "next/font/google";

import "./globals.css";

const gaegu = Gaegu({
  variable: "--font-gaegu",
  subsets: ["latin"],
  weight: "400",
});

const schoolbell = Schoolbell({
  variable: "--font-schoolbell",
  subsets: ["latin"],
  weight: "400",
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Puff Note",
  description: "A soft space for your mind to breathe.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${gaegu.variable} ${schoolbell.variable} `}
    >
      <body className="flex min-h-full flex-col font-sans">{children}</body>
    </html>
  );
}
