import type { Metadata, Viewport } from "next";

// El panel se instala como una app aparte («VIORA Panel»), que abre directo en /admin.
export const metadata: Metadata = {
  manifest: "/admin.webmanifest",
  appleWebApp: { capable: true, title: "VIORA Panel", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#1b2a4a" };

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
