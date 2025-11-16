import type { Metadata } from "next";
import ReduxProvider from "@/store/ReduxProvider";
import './globals.css';

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
    <html lang="en">
      <body>
        <ReduxProvider>
          {children}
        </ReduxProvider>
      </body>
    </html>
  );
}
