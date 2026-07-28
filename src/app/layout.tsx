import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Script from "next/script";
import AuthProvider from "@/components/AuthProvider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "WellX AI — ChatGiZa",
  description:
    "WellX AI is an AI company building ChatGiZa, a conversational assistant, along with an API for developers.",
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
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">
          {`(function(){try{var t=localStorage.getItem("chatgiza:theme");if(t==="light"||t==="dark"){document.documentElement.setAttribute("data-theme",t);}var f=localStorage.getItem("chatgiza:font-size");if(f==="small"||f==="medium"||f==="large"||f==="xlarge"){document.documentElement.setAttribute("data-font-size",f);}var a=localStorage.getItem("chatgiza:assistant-color");if(a==="warm"){document.documentElement.setAttribute("data-assistant-color",a);}}catch(e){}})();`}
        </Script>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
