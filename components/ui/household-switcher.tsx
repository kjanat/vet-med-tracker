"use client";

import { Check, ChevronsUpDown, Home } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { getAvatarColor } from "@/lib/utils/avatar-utils";
import { cn } from "@/lib/utils/general";
import { useApp } from "../providers/app-provider-consolidated";

export function HouseholdSwitcher() {
  const { selectedHousehold, setSelectedHousehold, households } = useApp();
  const { isMobile } = useSidebar();

  // Handle no household selected
  if (!selectedHousehold) {
    return (
      <SidebarMenu>
        <SidebarMenuItem>
          <SidebarMenuButton size="lg" disabled>
            <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
              <Home className="size-4" />
            </div>
            <div className="grid flex-1 text-left text-sm leading-tight">
              <span className="truncate font-medium">No household</span>
              <span className="truncate text-xs">Select household</span>
            </div>
          </SidebarMenuButton>
        </SidebarMenuItem>
      </SidebarMenu>
    );
  }

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <SidebarMenuButton
              size="lg"
              className="cursor-pointer data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
              aria-label={`Switch household. Current: ${selectedHousehold.name}`}
            >
              <Avatar className="h-8 w-8 rounded-lg">
                {selectedHousehold.avatar && (
                  <AvatarImage src={selectedHousehold.avatar} />
                )}
                <AvatarFallback
                  className={cn(
                    getAvatarColor(selectedHousehold.name),
                    "rounded-lg font-medium text-white",
                  )}
                >
                  {selectedHousehold.name[0]}
                </AvatarFallback>
              </Avatar>
              <div className="grid flex-1 text-left text-sm leading-tight">
                <span className="truncate font-medium">
                  {selectedHousehold.name}
                </span>
                <span className="truncate text-xs">Household</span>
              </div>
              <ChevronsUpDown className="ml-auto" />
            </SidebarMenuButton>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            className="w-(--radix-dropdown-menu-trigger-width) min-w-56 rounded-lg"
            align="start"
            side={isMobile ? "bottom" : "right"}
            sideOffset={4}
          >
            <DropdownMenuLabel className="cursor-default text-muted-foreground text-xs">
              Households
            </DropdownMenuLabel>
            {households.map((household) => (
              <DropdownMenuItem
                key={household.id}
                onClick={() => setSelectedHousehold(household)}
                className="cursor-pointer gap-2 p-2"
              >
                <Avatar className="h-6 w-6 rounded-md">
                  {household.avatar && <AvatarImage src={household.avatar} />}
                  <AvatarFallback
                    className={cn(
                      getAvatarColor(household.name),
                      "rounded-md font-medium text-white text-xs",
                    )}
                  >
                    {household.name[0]}
                  </AvatarFallback>
                </Avatar>
                {household.name}
                <Check
                  className={cn(
                    "ml-auto h-4 w-4",
                    selectedHousehold?.id === household.id
                      ? "opacity-100"
                      : "opacity-0",
                  )}
                />
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem className="cursor-pointer gap-2 p-2">
              <div className="flex size-6 items-center justify-center rounded-md border bg-transparent">
                <Home className="size-4" />
              </div>
              <div className="font-medium text-muted-foreground">
                Add household
              </div>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </SidebarMenuItem>
    </SidebarMenu>
  );
}
