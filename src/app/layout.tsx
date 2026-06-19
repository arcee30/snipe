import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Snipe",
  description: "A fake-money auction marketplace for limited luxury lots"
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
