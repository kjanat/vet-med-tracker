import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Viewport Tester | VetMed Tracker Dev",
  description: "Test responsive design across multiple device viewports",
};

export default function ViewportLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
