import type { Metadata, Viewport } from "next";
import { Atkinson_Hyperlegible_Next, Bricolage_Grotesque, Fraunces, Nunito } from "next/font/google";
import { ServiceWorker } from "@/components/ServiceWorker";
import { LOOK_BOOT_SCRIPT } from "@/lib/look";
import "./globals.css";

// Body text. Atkinson Hyperlegible was designed for low-vision readability. It
// keeps I / l / 1 and 0 / O distinct, which matters when reading dosages.
const atkinson = Atkinson_Hyperlegible_Next({
  variable: "--font-atkinson",
  subsets: ["latin"],
  display: "swap",
  // Next has no metrics for this face yet; fall back to the system stack in globals.css.
  adjustFontFallback: false,
});

// Heading faces she can choose between in Settings (like Notion's page font).
// Modern is the default: a grotesque with some warmth in its curves.
const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
  display: "swap",
});

// "Soft serif": the original PNLE Buddy heading face.
const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  display: "swap",
  axes: ["SOFT", "WONK", "opsz"],
  preload: false,
});

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
  weight: ["700", "800"],
  preload: false,
});

export const metadata: Metadata = {
  title: { default: "PNLE Buddy", template: "%s · PNLE Buddy" },
  description: "A calm study companion for the Philippine Nursing Licensure Examination.",
  applicationName: "PNLE Buddy",
  appleWebApp: {
    capable: true,
    title: "PNLE Buddy",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#faf5f3",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // The boot script sets data-theme / data-font before React hydrates.
    <html
      lang="en"
      data-theme="rosewater"
      data-font="modern"
      suppressHydrationWarning
      className={`${atkinson.variable} ${bricolage.variable} ${fraunces.variable} ${nunito.variable} antialiased`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: LOOK_BOOT_SCRIPT }} />
      </head>
      <body className="min-h-dvh">
        {children}
        <ServiceWorker />
      </body>
    </html>
  );
}
