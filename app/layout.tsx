import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { AppProvider } from "@/components/providers/app-provider"
import { GlobalLayout } from "@/components/layout/global-layout"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "VetMed Tracker",
  description: "Veterinary medication management system",
    generator: 'v0.dev'
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppProvider>
          <GlobalLayout>{children}</GlobalLayout>
        </AppProvider>
      </body>
    </html>
  )
}
