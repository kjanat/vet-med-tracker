"use client"

import { Wifi } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

export default function OfflinePage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center">
            <Wifi className="h-6 w-6 text-orange-600" />
          </div>
          <CardTitle>You're Offline</CardTitle>
          <CardDescription>Check your internet connection and try again</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-muted-foreground space-y-2">
            <p>While offline, you can still:</p>
            <ul className="list-disc list-inside space-y-1 ml-4">
              <li>View cached medication history</li>
              <li>Record administrations (will sync later)</li>
              <li>Browse inventory items</li>
              <li>Access emergency information</li>
            </ul>
          </div>

          <Button className="w-full" onClick={() => window.location.reload()}>
            Try Again
          </Button>

          <Button variant="outline" className="w-full bg-transparent" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
