import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Provider } from "../components/ui/provider";
import { Web3Provider } from '../context/Web3Context';
import { Toaster } from 'react-hot-toast';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Digimon NFT Marketplace",
  description: "Trade and collect your favorite Digimon as NFTs",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Web3Provider>
          <Provider>
            {children}
            <Toaster position="bottom-right" />
          </Provider>
        </Web3Provider>
      </body>
    </html>
  );
}
