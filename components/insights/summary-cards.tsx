import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface SummaryCardsProps {
  data?: {
    adherence?: number;
    totalMedications?: number;
    missedDoses?: number;
  };
  range?: {
    from: Date;
    to: Date;
  };
}

export function SummaryCards({ data, range }: SummaryCardsProps) {
  const { adherence = 0, totalMedications = 0, missedDoses = 0 } = data || {};

  const cards = [
    {
      description: "Medication compliance rate",
      title: "Overall Adherence",
      value: `${adherence}%`,
    },
    {
      description: "Currently prescribed",
      title: "Active Medications",
      value: totalMedications.toString(),
    },
    {
      description: "In the last 30 days",
      title: "Missed Doses",
      value: missedDoses.toString(),
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map((card, index) => (
        <Card key={index}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="font-medium text-sm">{card.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="font-bold text-2xl">{card.value}</div>
            <p className="text-muted-foreground text-xs">{card.description}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
