import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

// Geist Sans doubles as both our display and UI face — used at heavy
// weight + tight tracking for headlines/scores, regular weight for body.
const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-sans",
  weight: "100 900",
});

// Geist Mono powers the scoreboard ticker numerals — tabular digits
// that read like a real stadium LED display / broadcast lower-third.
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-mono",
  weight: "100 900",
});

export const metadata: Metadata = {
  title: "Local Cricket Scoreboard",
  description: "Live ball-by-ball cricket scoring and leaderboards.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
