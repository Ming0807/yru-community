import type { Metadata } from "next";
import { Prompt } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import "./globals.css";

const prompt = Prompt({
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-prompt",
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="th" suppressHydrationWarning>
      <body className={`${prompt.variable} font-sans antialiased bg-background text-foreground`}>
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
