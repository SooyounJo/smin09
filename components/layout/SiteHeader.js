import Link from "next/link";
import styles from "@/styles/layouts/main.module.css";

const NAV = [
  { href: "/site", label: "CSS 사이트" },
  { href: "/canvas", label: "Canvas / WebGL" },
];

export default function SiteHeader({ activeSection }) {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        sotest_0924
      </Link>
      <nav className={styles.nav} aria-label="주요 메뉴">
        {NAV.map(({ href, label }) => {
          const isActive = activeSection === href;
          return (
            <Link
              key={href}
              href={href}
              className={isActive ? styles.navLinkActive : styles.navLink}
              aria-current={isActive ? "page" : undefined}
            >
              {label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
