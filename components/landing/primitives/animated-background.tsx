import { cn } from "@/lib/utils/general";

interface AnimatedBackgroundProps {
  className?: string;
  variant?: "default" | "subtle" | "intense";
}

const variants = {
  default: [
    {
      color: "bg-primary/20",
      delay: 0,
      position: "-top-40 -right-40",
      size: "h-80 w-80",
    },
    {
      color: "bg-primary/20",
      delay: 1000,
      position: "top-[60vh] -left-40",
      size: "h-80 w-80",
    },
    {
      color: "bg-primary/10",
      delay: 500,
      position: "top-1/3 left-1/3",
      size: "h-96 w-96",
    },
  ],
  intense: [
    {
      color: "bg-primary/30",
      delay: 0,
      position: "-top-48 -right-48",
      size: "h-96 w-96",
    },
    {
      color: "bg-primary/30",
      delay: 500,
      position: "top-1/2 -left-48",
      size: "h-96 w-96",
    },
    {
      color: "bg-primary/20",
      delay: 250,
      position: "top-1/4 left-1/4",
      size: "h-[32rem] w-[32rem]",
    },
    {
      color: "bg-primary/15",
      delay: 750,
      position: "bottom-20 right-1/3",
      size: "h-80 w-80",
    },
  ],
  subtle: [
    {
      color: "bg-primary/10",
      delay: 0,
      position: "top-20 right-20",
      size: "h-64 w-64",
    },
    {
      color: "bg-primary/10",
      delay: 750,
      position: "bottom-20 left-20",
      size: "h-72 w-72",
    },
  ],
};

export function AnimatedBackground({
  className,
  variant = "default",
}: AnimatedBackgroundProps) {
  const orbs = variants[variant];

  return (
    <div
      aria-hidden="true"
      className={cn(
        "pointer-events-none fixed inset-0 z-0 overflow-hidden",
        className,
      )}
    >
      {orbs.map((orb, index) => (
        <div
          className={cn(
            "absolute rounded-full blur-3xl transition-all duration-[2000ms]",
            orb.size,
            orb.position,
            orb.color,
            "animate-pulse",
          )}
          key={`orb-${variant}-${orb.position}-${orb.delay}`}
          style={{
            animationDelay: `${orb.delay}ms`,
            animationDuration: `${4 + index}s`,
          }}
        />
      ))}
    </div>
  );
}
