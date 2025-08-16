import { Wifi, WifiOff } from "lucide-react";

interface StatusBarProps {
  photoUpload: {
    isOnline: boolean;
    stats: {
      pending: number;
    };
  };
}

export function StatusBar({ photoUpload }: StatusBarProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="font-medium text-sm">Photo</div>

      <div className="flex items-center gap-1 text-xs">
        {photoUpload.isOnline ? (
          <>
            <Wifi className="h-3 w-3 text-green-500" />
            <span className="text-muted-foreground">Online</span>
          </>
        ) : (
          <>
            <WifiOff className="h-3 w-3 text-orange-500" />
            <span className="text-muted-foreground">Offline</span>
          </>
        )}

        {photoUpload.stats.pending > 0 && (
          <span className="ml-2 text-orange-500">
            ({photoUpload.stats.pending} pending)
          </span>
        )}
      </div>
    </div>
  );
}
