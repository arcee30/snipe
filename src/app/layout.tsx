import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Auction House",
  description: "A fake-money auction marketplace MVP"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
