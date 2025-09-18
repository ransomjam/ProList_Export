import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { mockApi } from '@/mocks/api';
import type { BrandSettings } from '@/mocks/types';
import { useToast } from '@/hooks/use-toast';

const colourKeys: Array<{ key: keyof BrandSettings; label: string; helper: string }> = [
  { key: 'primary', label: 'Primary', helper: 'Buttons and key highlights' },
  { key: 'accentBlue', label: 'Accent blue', helper: 'Alerts and badges' },
  { key: 'accentTeal', label: 'Accent teal', helper: 'Secondary accents' },
  { key: 'accentGreen', label: 'Accent green', helper: 'Approvals and success states' },
  { key: 'accentMint', label: 'Accent mint', helper: 'Soft backgrounds' },
];

const hexPattern = /^#([0-9a-fA-F]{6})$/;

const parseHex = (hex: string) => {
  const cleaned = hex.trim();
  return hexPattern.test(cleaned) ? cleaned.toUpperCase() : null;
};

const hexToRgb = (hex: string) => {
  const match = hex.replace('#', '');
  const bigint = Number.parseInt(match, 16);
  const r = (bigint >> 16) & 255;
  const g = (bigint >> 8) & 255;
  const b = bigint & 255;
  return [r / 255, g / 255, b / 255];
};

const luminance = (hex: string) => {
  const [r, g, b] = hexToRgb(hex).map(channel => {
    return channel <= 0.03928 ? channel / 12.92 : Math.pow((channel + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const contrastRatio = (hexA: string, hexB: string) => {
  const lumA = luminance(hexA);
  const lumB = luminance(hexB);
  const lighter = Math.max(lumA, lumB);
  const darker = Math.min(lumA, lumB);
  return (lighter + 0.05) / (darker + 0.05);
};

const readableTextColour = (hex: string) => {
  return luminance(hex) > 0.5 ? '#111827' : '#FFFFFF';
};

export const BrandingSettingsTab = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery({
    queryKey: ['brand-settings'],
    queryFn: () => mockApi.getBrandSettings(),
  });

  const [preview, setPreview] = useState<BrandSettings | null>(null);
  const [draft, setDraft] = useState<Record<keyof BrandSettings, string> | null>(null);

  useEffect(() => {
    if (data) {
      setPreview(data);
      setDraft({ ...data });
    }
  }, [data]);

  const saveMutation = useMutation({
    mutationFn: (payload: Partial<BrandSettings>) => mockApi.saveBrandSettings(payload),
    onSuccess: (updated) => {
      queryClient.setQueryData(['brand-settings'], updated);
      setPreview(updated);
      setDraft({ ...updated });
      toast({ title: 'Branding updated', description: 'Theme colours refreshed across the workspace.' });
    },
    onError: () => {
      toast({ title: 'Unable to save', description: 'Please check your colour values and try again.', variant: 'destructive' });
    },
  });

  const resetMutation = useMutation({
    mutationFn: () => mockApi.resetBrandSettings(),
    onSuccess: (defaults) => {
      queryClient.setQueryData(['brand-settings'], defaults);
      setPreview(defaults);
      setDraft({ ...defaults });
      toast({ title: 'Branding reset', description: 'Reverted to the original ProList palette.' });
    },
    onError: () => {
      toast({ title: 'Reset failed', description: 'We could not restore the defaults this time.', variant: 'destructive' });
    },
  });

  const handleHexChange = (key: keyof BrandSettings, value: string) => {
    if (!preview || !draft) return;
    const upper = value.startsWith('#') ? value.toUpperCase() : `#${value.toUpperCase()}`;
    if (upper.length > 7) {
      return;
    }
    const nextDraft = { ...draft, [key]: upper };
    setDraft(nextDraft);
    if (parseHex(upper)) {
      setPreview({ ...preview, [key]: upper });
    }
  };

  const handleColourPickerChange = (key: keyof BrandSettings, value: string) => {
    if (!preview || !draft) return;
    const next = value.toUpperCase();
    setPreview({ ...preview, [key]: next });
    setDraft({ ...draft, [key]: next });
  };

  const hasChanges = useMemo(() => {
    if (!preview || !data) return false;
    return JSON.stringify(preview) !== JSON.stringify(data);
  }, [preview, data]);

  const contrast = useMemo(() => {
    if (!preview) {
      return { ratio: 0, passes: false };
    }
    const ratio = contrastRatio(preview.primary, '#FFFFFF');
    return { ratio, passes: ratio >= 4.5 };
  }, [preview]);

  if (isLoading && !preview) {
    return (
      <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent>
            <Skeleton className="h-64 w-full" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <Skeleton className="h-6 w-48" />
          </CardHeader>
          <CardContent className="space-y-5">
            {colourKeys.map(({ key }) => (
              <div key={key} className="space-y-2">
                <Skeleton className="h-4 w-28" />
                <div className="flex gap-3">
                  <Skeleton className="h-10 w-24" />
                  <Skeleton className="h-10 flex-1" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!preview || !draft) {
    return null;
  }

  const textOnPrimary = readableTextColour(preview.primary);

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <Card>
        <CardHeader>
          <CardTitle>Theme preview</CardTitle>
          <CardDescription>Colours update instantly when you save. Use this preview to check contrast and tone.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-3xl border bg-gradient-to-br from-muted/60 to-background p-6 shadow-sm">
            <div className="mb-6 grid gap-4 md:grid-cols-2">
              <button
                type="button"
                style={{ backgroundColor: preview.primary, color: textOnPrimary }}
                className="rounded-2xl px-4 py-3 text-sm font-semibold shadow-md transition-colors"
              >
                Primary action
              </button>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: preview.accentBlue, color: preview.accentBlue }}>
                  Accent blue
                </span>
                <span className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: preview.accentTeal, color: preview.accentTeal }}>
                  Accent teal
                </span>
                <span className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: preview.accentGreen, color: preview.accentGreen }}>
                  Accent green
                </span>
                <span className="rounded-full border px-3 py-1 text-xs font-semibold" style={{ borderColor: preview.accentMint, color: preview.accentMint }}>
                  Accent mint
                </span>
              </div>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-2xl border bg-white/80 p-4 shadow-sm">
                <p className="text-sm font-semibold" style={{ color: preview.primary }}>Highlighted card</p>
                <p className="mt-2 text-sm text-muted-foreground">
                  Use cards to surface key shipment KPIs and tracking updates.
                </p>
              </div>
              <div className="rounded-2xl border bg-white/80 p-4 shadow-sm">
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full" style={{ backgroundColor: preview.accentGreen }} />
                  <p className="text-sm font-semibold">Status: Ready</p>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">Brand accents support alerts and secondary UI moments.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Colour controls</CardTitle>
          <CardDescription>Adjust the palette and save to push the new theme instantly.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-5">
            {colourKeys.map(({ key, label, helper }) => (
              <div key={key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">{label}</p>
                    <p className="text-xs text-muted-foreground">{helper}</p>
                  </div>
                  <Input
                    type="color"
                    value={preview[key]}
                    onChange={(event) => handleColourPickerChange(key, event.target.value)}
                    className="h-10 w-16 cursor-pointer border bg-transparent"
                    aria-label={`${label} colour picker`}
                  />
                </div>
                <Input
                  value={draft[key]}
                  onChange={(event) => handleHexChange(key, event.target.value)}
                  className="font-mono uppercase"
                  aria-label={`${label} hex value`}
                />
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <Badge variant={contrast.passes ? 'secondary' : 'destructive'} className="px-3 py-1 text-xs font-semibold">
              {contrast.passes ? 'AA pass' : 'Contrast fail'} · {contrast.ratio.toFixed(2)}:1
            </Badge>
            {!contrast.passes && (
              <p className="text-xs text-muted-foreground">Try a darker primary so white text remains legible.</p>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => resetMutation.mutate()}
              disabled={resetMutation.isPending}
            >
              {resetMutation.isPending ? 'Resetting…' : 'Reset to defaults'}
            </Button>
            <Button
              type="button"
              onClick={() => preview && saveMutation.mutate(preview)}
              disabled={!hasChanges || saveMutation.isPending}
            >
              {saveMutation.isPending ? 'Saving…' : 'Save theme'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
