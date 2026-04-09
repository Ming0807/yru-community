import type { Metadata } from "next";
import { Inter, Noto_Sans_Thai } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const notoSansThai = Noto_Sans_Thai({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-noto-thai",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "YRU Community — ศูนย์กลางชุมชนนักศึกษา มรย.",
    template: "%s | YRU Community",
  },
  description:
    "เว็บบอร์ดสำหรับนักศึกษามหาวิทยาลัยราชภัฏยะลา แลกเปลี่ยนความรู้ รีวิววิชา ซื้อขาย หาหอพัก และสร้างเครือข่าย",
  keywords: [
    "YRU",
    "มหาวิทยาลัยราชภัฏยะลา",
    "นักศึกษา",
    "community",
    "เว็บบอร์ด",
    "รีวิววิชา",
    "ชีทสรุป",
  ],
  authors: [{ name: "YRU Community Team" }],
  openGraph: {
    type: "website",
    locale: "th_TH",
    siteName: "YRU Community",
    title: "YRU Community — ศูนย์กลางชุมชนนักศึกษา มรย.",
    description:
      "เว็บบอร์ดสำหรับนักศึกษามหาวิทยาลัยราชภัฏยะลา แลกเปลี่ยนความรู้ รีวิววิชา ซื้อขาย หาหอพัก และสร้างเครือข่าย",
  },
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "YRU",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning data-scroll-behavior="smooth">
      <body className={`${inter.variable} ${notoSansThai.variable} font-sans antialiased bg-background text-foreground selection:bg-[var(--color-yru-pink)]/20`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-center" richColors />
        </ThemeProvider>
      </body>
    </html>
  );
}
