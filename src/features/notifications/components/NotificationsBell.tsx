import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetTrigger } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { BELL_ICON } from "../constants";
import { useNotifications } from "../hooks/useNotifications";
import { NotificationsPanel } from "./NotificationsPanel";

export const NotificationsBell = () => {
  const [open, setOpen] = useState(false);
  const { unreadCount } = useNotifications();
  const BellIcon = BELL_ICON;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative rounded-full text-muted-foreground hover:text-foreground"
        >
          <BellIcon className="h-5 w-5" />
          {unreadCount > 0 ? (
            <span
              className={cn(
                "absolute -right-0.5 -top-0.5 flex min-h-[1.1rem] min-w-[1.1rem] items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground shadow-sm",
                unreadCount > 9 && "px-1.5",
              )}
            >
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          ) : null}
        </Button>
      </SheetTrigger>
      <NotificationsPanel onClose={() => setOpen(false)} />
    </Sheet>
  );
};
