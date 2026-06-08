import type { Metadata } from "next";
import { Open_Sans, Source_Sans_3, PT_Sans_Caption } from "next/font/google";
import "./globals.css";

const openSans = Open_Sans({
  subsets: ["latin"],
  variable: "--font-open-sans",
  weight: ["400", "600", "700"],
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  weight: ["400", "600", "700", "900"],
});

const ptSansCaption = PT_Sans_Caption({
  subsets: ["latin"],
  variable: "--font-pt-sans-caption",
  weight: ["400", "700"],
});

export const metadata: Metadata = {
  title: "uDefine — Requisito a Especificación SAP",
  description: "Asistente de especificaciones a pie de proyecto",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body
        className={`${openSans.variable} ${sourceSans.variable} ${ptSansCaption.variable}`}
        style={{ fontFamily: "var(--font-open-sans), system-ui, sans-serif" }}
      >
        {children}
      </body>
    </html>
  );
}
