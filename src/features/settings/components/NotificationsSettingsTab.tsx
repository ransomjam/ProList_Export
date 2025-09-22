import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  RadioGroup,
  RadioGroupItem,
} from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import type {
  NotificationPreferences,
  NotificationType,
} from "@/mocks/types";
import { NOTIFICATION_TYPE_META } from "@/features/notifications/constants";
import { buildQuietHoursLabel } from "@/features/notifications/utils";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";

const TYPE_DESCRIPTIONS: Record<NotificationType, string> = {
  documents: "Generated or approved documents.",
  issues: "When an issue opens, changes status, or gets a comment.",
  shipments: "Shipment created, submitted, or cleared events.",
  payments: "Payments captured against a shipment.",
  system: "System notices and digest summaries.",
};

const DIGEST_LABELS = {
  daily: "Daily",
  weekly: "Weekly",
  off: "Off",
};

export const NotificationsSettingsTab = () => {
  const { toast } = useToast();
  const { preferences, preferencesLoading, updatePreferences, isUpdatingPreferences } = useNotifications();
  const [draft, setDraft] = useState<NotificationPreferences | null>(null);

  useEffect(() => {
    if (preferences) {
      setDraft(preferences);
    }
  }, [preferences]);

  const enabledTypes = useMemo(
    () =>
      draft
        ? (Object.entries(draft.enabled) as Array<[NotificationType, boolean]>).filter(([, enabled]) => enabled)
        : [],
    [draft],
  );

  const previewLine = useMemo(() => {
    if (!draft) return "";

    const enabledSummary = enabledTypes
      .map(([type]) => {
        const label = NOTIFICATION_TYPE_META[type].label;
        return draft.highPriority.includes(type) ? `${label} (high)` : label;
      })
      .join(", ");

    const digestLabel = draft.digest === "off" ? "Digest off" : `${DIGEST_LABELS[draft.digest]} digest`;

    return [enabledSummary || "No types enabled", digestLabel, buildQuietHoursLabel(draft)].join(" · ");
  }, [draft, enabledTypes]);

  const toggleType = (type: NotificationType, next: boolean) => {
    setDraft(current =>
      current
        ? {
            ...current,
            enabled: {
              ...current.enabled,
              [type]: next,
            },
            highPriority: next
              ? current.highPriority
              : current.highPriority.filter(priorityType => priorityType !== type),
          }
        : current,
    );
  };

  const toggleHighPriority = (type: NotificationType) => {
    setDraft(current =>
      current
        ? {
            ...current,
            highPriority: current.highPriority.includes(type)
              ? current.highPriority.filter(priorityType => priorityType !== type)
              : [...current.highPriority, type],
          }
        : current,
    );
  };

  const updateQuietHours = (field: "start" | "end", value: string) => {
    setDraft(current =>
      current
        ? {
            ...current,
            quietHours: {
              ...current.quietHours,
              [field]: value,
            },
          }
        : current,
    );
  };

  const handleDigestChange = (value: string) => {
    setDraft(current =>
      current
        ? {
            ...current,
            digest: value as NotificationPreferences["digest"],
          }
        : current,
    );
  };

  const toggleQuietHours = (enabled: boolean) => {
    setDraft(current =>
      current
        ? {
            ...current,
            quietHours: {
              ...current.quietHours,
              enabled,
            },
          }
        : current,
    );
  };

  const handleSave = async () => {
    if (!draft) return;
    const updated = await updatePreferences(draft);
    setDraft(updated);
    toast({
      title: "Preferences saved",
      description: previewLine,
    });
  };

  if (preferencesLoading || !draft) {
    return (
      <Card className="rounded-2xl border bg-card/80">
        <CardContent className="space-y-4 p-6">
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={`pref-skeleton-${index}`} className="h-12 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border bg-card/80">
        <CardHeader>
          <CardTitle>Types you want to see</CardTitle>
          <p className="text-sm text-muted-foreground">
            Pick the updates that should appear in your bell and daily digest.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          {(Object.keys(draft.enabled) as NotificationType[]).map(type => {
            const meta = NOTIFICATION_TYPE_META[type];
            const enabled = draft.enabled[type];
            return (
              <div
                key={type}
                className="flex items-start justify-between gap-4 rounded-xl border bg-background/80 p-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                      <meta.icon className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-medium">{meta.label}</p>
                      <p className="text-sm text-muted-foreground">{TYPE_DESCRIPTIONS[type]}</p>
                    </div>
                  </div>
                </div>
                <Switch checked={enabled} onCheckedChange={next => toggleType(type, Boolean(next))} />
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border bg-card/80">
        <CardHeader>
          <CardTitle>Urgency</CardTitle>
          <p className="text-sm text-muted-foreground">
            Choose which types stay pinned with a red dot until you read them.
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          {(Object.keys(draft.enabled) as NotificationType[]).map(type => {
            if (!draft.enabled[type]) return null;
            const meta = NOTIFICATION_TYPE_META[type];
            const isHighPriority = draft.highPriority.includes(type);
            return (
              <button
                key={`priority-${type}`}
                type="button"
                onClick={() => toggleHighPriority(type)}
                className={cn(
                  "flex w-full items-center justify-between rounded-xl border px-4 py-3 text-left transition",
                  isHighPriority
                    ? "border-destructive bg-destructive/5 text-destructive"
                    : "bg-background/70 hover:bg-muted/60",
                )}
              >
                <div className="flex items-center gap-3">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                    <meta.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-medium">{meta.label}</p>
                    <p className="text-xs text-muted-foreground">High priority cards stay at the top.</p>
                  </div>
                </div>
                <Badge
                  variant={isHighPriority ? "destructive" : "outline"}
                  className="rounded-full text-[10px] uppercase"
                >
                  {isHighPriority ? "High" : "Normal"}
                </Badge>
              </button>
            );
          })}
        </CardContent>
      </Card>

      <Card className="rounded-2xl border bg-card/80">
        <CardHeader>
          <CardTitle>Digest</CardTitle>
          <p className="text-sm text-muted-foreground">
            Get a single summary instead of many alerts.
          </p>
        </CardHeader>
        <CardContent>
          <RadioGroup value={draft.digest} onValueChange={handleDigestChange} className="space-y-3">
            {Object.entries(DIGEST_LABELS).map(([value, label]) => (
              <Label
                key={value}
                className={cn(
                  "flex cursor-pointer items-center justify-between rounded-xl border px-4 py-3",
                  draft.digest === value
                    ? "border-primary bg-primary/5"
                    : "bg-background/70 hover:bg-muted/50",
                )}
              >
                <div>
                  <p className="font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">
                    {value === "off"
                      ? "Show every notification individually."
                      : `We'll bundle low priority updates into a ${label.toLowerCase()} summary.`}
                  </p>
                </div>
                <RadioGroupItem value={value} />
              </Label>
            ))}
          </RadioGroup>
        </CardContent>
      </Card>

      <Card className="rounded-2xl border bg-card/80">
        <CardHeader>
          <CardTitle>Quiet hours</CardTitle>
          <p className="text-sm text-muted-foreground">
            We’ll still save them — just no pings.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between rounded-xl border bg-background/80 px-4 py-3">
            <div>
              <p className="font-medium">Quiet hours</p>
              <p className="text-xs text-muted-foreground">Hold notifications outside your working window.</p>
            </div>
            <Switch checked={draft.quietHours.enabled} onCheckedChange={toggleQuietHours} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Label className="space-y-2 text-sm font-medium">
              Start
              <Input
                type="time"
                value={draft.quietHours.start}
                onChange={event => updateQuietHours("start", event.target.value)}
                disabled={!draft.quietHours.enabled}
              />
            </Label>
            <Label className="space-y-2 text-sm font-medium">
              End
              <Input
                type="time"
                value={draft.quietHours.end}
                onChange={event => updateQuietHours("end", event.target.value)}
                disabled={!draft.quietHours.enabled}
              />
            </Label>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col gap-4 rounded-2xl border bg-card/80 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1 text-sm text-muted-foreground">
          <p className="font-medium text-foreground">Preview</p>
          <p>{previewLine}</p>
        </div>
        <Button onClick={handleSave} disabled={isUpdatingPreferences}>
          {isUpdatingPreferences ? <span className="flex items-center gap-2"><span className="h-2 w-2 animate-ping rounded-full bg-white" />Saving…</span> : "Save preferences"}
        </Button>
      </div>
    </div>
  );
};
