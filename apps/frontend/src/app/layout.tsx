import type { Metadata } from "next";
import { Unbounded, DM_Sans, Geist } from "next/font/google";
import "./globals.css";
import { Header } from "@/domains/user/components/Header";
import { GoogleProvider } from "@/domains/user/components/GoogleProvider";
import { isAuthenticated } from "@/domains/user/user.actions";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { cn } from "@/lib/utils";
import { ServiceWorkerRegister } from "@/components/ServiceWorkerRegister";

const geist = Geist({ subsets: ["latin"], variable: "--font-sans" });

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
  manifest: "/manifest.json",
  themeColor: "#799eff",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const authenticated = await isAuthenticated();
  return (
    <html lang="pt-BR" className={cn("font-sans", geist.variable)}>
      <body className={`${unbounded.variable} ${dmSans.variable} antialiased`}>
        <GoogleProvider>
          <Header authenticated={authenticated} />
          {children}
          <SpeedInsights />
          <Analytics />
          <ServiceWorkerRegister />
        </GoogleProvider>
      </body>
    </html>
  );
}
