import type { Metadata } from "next";
import { Unbounded, DM_Sans } from "next/font/google";
import "./globals.css";
import { Header } from "@/components/Header";
import { GoogleProvider } from "@/components/GoogleProvider";
import { isAuthenticated } from "./actions";
import { SpeedInsights } from "@vercel/speed-insights/next";

const unbounded = Unbounded({
  variable: "--font-unbounded",
  subsets: ["latin"],
  weight: ["400", "700", "900"],
});

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: "Fila Digital",
  description:
    "Gerencie filas do seu comércio ou entre em uma fila de qualquer lugar.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authenticated = await isAuthenticated();
  return (
    <html lang="pt-BR">
      <body className={`${unbounded.variable} ${dmSans.variable} antialiased`}>
        <GoogleProvider>
          <Header authenticated={authenticated} />
          {children}
          <SpeedInsights />
        </GoogleProvider>
      </body>
    </html>
  );
}
