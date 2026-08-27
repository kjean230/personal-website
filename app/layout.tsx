import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import Link from "next/link";
import { HOME_HREF, RESUME_HREF } from "@/lib/routes/table";
import "../design/tokens/tokens.css";
import "./app.css";
import styles from "./site.module.css";

// Inter (UI) and JetBrains Mono (code, terminal), both OFL. next/font downloads
// and self-hosts the files at build time — no font binaries are committed
// (DESIGN.md). The OFL licence texts ship from public/fonts/. The variables are
// bridged onto the token stacks (--font-sans / --font-mono) in app.css.
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jbmono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Kerwyn Jean",
  description: "Personal site of Kerwyn Jean.",
};

// The site header is the route table's "one action from anywhere" (brief
// §2.2): every page, in either renderer, carries a plain link to /resume.
export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body>
        <header className={styles.header}>
          <nav aria-label="Site" className={styles.siteNav}>
            <Link href={HOME_HREF} className={styles.siteLink}>
              Kerwyn Jean
            </Link>
            <Link href={RESUME_HREF} className={styles.siteLink}>
              Resume
            </Link>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
