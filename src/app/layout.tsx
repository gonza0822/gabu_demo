import type { Metadata } from "next";
import ReduxProvider from "@/store/ReduxProvider";
import { Rubik } from "next/font/google";
import './globals.css';

const rubik = Rubik({
  subsets: ['latin'],
  variable: '--font-rubik',
});

export const metadata: Metadata = {
  title: "G.A.B.U Demo",
  description: "fixed assets management system",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={rubik.variable}>
      <body>
        <ReduxProvider>
          {children}
        </ReduxProvider>
      </body>
    </html>
  );
}
