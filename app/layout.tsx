import type { Metadata } from 'next'
import { AppProvider } from '@/context/AppContext'
import { Layout } from '@/components/Layout'
import { AuthGuard } from '@/components/auth/AuthGuard'
import './globals.css'

export const metadata: Metadata = {
  title: 'SlopeSync',
  description: 'Your effortless path to a flawless Bluebird Day trip.',
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <AuthGuard>
          <AppProvider>
            <Layout>
              {children}
            </Layout>
          </AppProvider>
        </AuthGuard>
      </body>
    </html>
  )
}

