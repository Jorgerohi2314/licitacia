import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "next-themes";
import { ThemeToggle } from "@/components/themeToggle";
import { Providers } from "./providers";
const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LicitacIA",
  description: "Recibe avisos de licitaciones públicas en España personalizados segun tus inteereses.",
  keywords: ["licitaciones públicas",
              "contratación pública España",
              "alertas licitaciones",
              "subvenciones",
              "plataforma de contratación",
              "boletín oficial"
            ],
  authors: [{ name: "Jorge Rodriguez" }],
  openGraph: {
    title: "LicitacIA - Encuentra licitaciones públicas en España",
    description: "Recibe avisos de licitaciones públicas en España personalizados segun tus inteereses.",
    url: "https://licitacia.com", // Reemplazar cuando tenga dominio 
    siteName: "LicitacIA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "LicitacIA - Encuentra licitaciones públicas en España",
    description: "Recibe avisos de licitaciones públicas en España personalizados segun tus inteereses.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body>
        <Providers>
          {/* Puedes colocar el botón en un header, navbar o sidebar */}
          <header className="p-4 flex justify-end">
            <ThemeToggle />
          </header>
          
          {children}
        </Providers>
      </body>
    </html>
  );
}