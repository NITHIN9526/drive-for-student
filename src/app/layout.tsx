import type { Metadata } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });
const jakarta = Plus_Jakarta_Sans({ variable: "--font-plus-jakarta", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "drive. — Share. Learn. Succeed together.",
  description: "A shared study shelf for college students.",
  icons: {
    icon: "/icon.svg",
    shortcut: "/icon.svg",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body className={`${inter.variable} ${jakarta.variable}`}>{children}</body></html>;
}
