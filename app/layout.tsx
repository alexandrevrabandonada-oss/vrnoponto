import type { Metadata } from "next";
import { cookies } from "next/headers";
import { Geist, Geist_Mono, Staatliches, Inter } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const staatliches = Staatliches({
  weight: "400",
  variable: "--font-staatliches",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VR no Ponto",
  description: "App colaborativo de ônibus para Volta Redonda.",
  manifest: "/manifest.json"
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const cookieStore = await cookies();
  const uiMode = cookieStore.get("vrnp_ui")?.value || "default";
  const density = cookieStore.get("vrnp_density")?.value || "comfort";

  return (
    <html lang="pt-BR" data-ui={uiMode} data-density={density}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${staatliches.variable} ${inter.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
