"use client"

// import { useParams } from "next/navigation"
import { Printer, Calendar, Pill, TrendingUp, AlertTriangle } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { AnimalAvatar } from "@/components/ui/animal-avatar"
import { format, subDays } from "date-fns"

// Mock data - replace with tRPC
const mockAnimal = {
  id: "1",
  name: "Buddy",
  species: "Dog",
  breed: "Golden Retriever",
  weightKg: 32,
  avatar: "/placeholder.svg?height=40&width=40",
}

const mockComplianceData = {
  adherencePct: 92,
  scheduled: 60,
  completed: 55,
  missed: 3,
  late: 2,
  veryLate: 0,
  streak: 5, // days without missed doses
}

const mockRegimens = [
  {
    medicationName: "Rimadyl",
    strength: "75mg",
    route: "Oral",
    schedule: "8:00 AM, 8:00 PM",
    adherence: 95,
    notes: "Give with food",
  },
  {
    medicationName: "Joint Supplement",
    strength: "1 tablet",
    route: "Oral",
    schedule: "Daily with breakfast",
    adherence: 88,
    notes: "Glucosamine/Chondroitin",
  },
]

const mockNotableEvents = [
  {
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    medication: "Rimadyl",
    note: "Took with food as recommended",
    tags: ["Normal"],
  },
  {
    date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    medication: "Joint Supplement",
    note: "Slight improvement in mobility",
    tags: ["Improved"],
  },
]

export default function AnimalReportPage() {
  // const params = useParams()
  // const animalId = params.id as string

  const handlePrint = () => {
    window.print()
  }

  const reportDate = new Date()
  const reportPeriod = {
    from: subDays(reportDate, 30),
    to: reportDate,
  }

  return (
    <div className="min-h-screen bg-white">
      {/* Print Button - hidden when printing */}
      <div className="no-print p-4 border-b">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold">Compliance Report - {mockAnimal.name}</h1>
          <Button onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print Report
          </Button>
        </div>
      </div>

      {/* Report Content */}
      <div className="max-w-4xl mx-auto p-8 print:p-4">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold mb-2">Medication Compliance Report</h1>
          <p className="text-lg text-muted-foreground">
            {format(reportPeriod.from, "MMMM d")} - {format(reportPeriod.to, "MMMM d, yyyy")}
          </p>
        </div>

        {/* Animal Info */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-3">
              <AnimalAvatar animal={mockAnimal} size="lg" />
              <div>
                <div className="text-2xl">{mockAnimal.name}</div>
                <div className="text-lg text-muted-foreground">
                  {mockAnimal.breed} {mockAnimal.species} • {mockAnimal.weightKg}kg
                </div>
              </div>
            </CardTitle>
          </CardHeader>
        </Card>

        {/* Compliance Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Overall Adherence
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{mockComplianceData.adherencePct}%</div>
              <p className="text-sm text-muted-foreground">
                {mockComplianceData.completed} of {mockComplianceData.scheduled} doses
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                Current Streak
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{mockComplianceData.streak}</div>
              <p className="text-sm text-muted-foreground">days without missed doses</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Late Doses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{mockComplianceData.late}</div>
              <p className="text-sm text-muted-foreground">within cutoff window</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Missed Doses
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{mockComplianceData.missed}</div>
              <p className="text-sm text-muted-foreground">beyond cutoff window</p>
            </CardContent>
          </Card>
        </div>

        {/* Current Medications */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Pill className="h-5 w-5" />
              Current Medications
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {mockRegimens.map((regimen, index) => (
                <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1">
                    <div className="font-medium text-lg">{regimen.medicationName}</div>
                    <div className="text-muted-foreground">
                      {regimen.strength} • {regimen.route} • {regimen.schedule}
                    </div>
                    {regimen.notes && (
                      <div className="text-sm text-muted-foreground mt-1">
                        <span className="font-medium">Notes:</span> {regimen.notes}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">{regimen.adherence}%</div>
                    <div className="text-sm text-muted-foreground">adherence</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Notable Events */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Notable Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {mockNotableEvents.map((event, index) => (
                <div key={index} className="p-3 border rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <div className="font-medium">{event.medication}</div>
                    <div className="text-sm text-muted-foreground">{format(event.date, "MMM d, yyyy")}</div>
                  </div>
                  <div className="text-sm text-muted-foreground mb-2">{event.note}</div>
                  <div className="flex gap-1">
                    {event.tags.map((tag) => (
                      <Badge key={tag} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground border-t pt-4">
          <p>Report generated on {format(reportDate, "MMMM d, yyyy 'at' h:mm a")}</p>
          <p className="mt-2">
            This report covers the period from {format(reportPeriod.from, "MMMM d")} to{" "}
            {format(reportPeriod.to, "MMMM d, yyyy")}
          </p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .no-print {
            display: none !important;
          }
          
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          @page {
            margin: 0.5in;
          }
        }
      `}</style>
    </div>
  )
}
