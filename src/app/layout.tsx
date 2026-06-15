import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { GlobalProvider } from "@/context/GlobalContext";
import ClientLayout from "@/components/layout/ClientLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "POS Next - Sistema de Ventas",
  description: "Sistema de Punto de Venta Mobile-First con Next.js y Google Sheets",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-gray-950 text-white flex flex-col">
        <GlobalProvider>
          <ClientLayout>
            {children}
          </ClientLayout>
        </GlobalProvider>
      </body>
    </html>
  );
}
