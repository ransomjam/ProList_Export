import { useCallback, useEffect, useMemo, useState, type ChangeEvent } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { mockApi } from "@/mocks/api";
import type { HsCode, Product, ShipmentWithItems } from "@/mocks/seeds";
import type { OrgSettings } from "@/mocks/types";
import { formatFcfa } from "@/utils/currency";

import {
  ArrowDownRight,
  ArrowUpRight,
  Calculator,
  CheckCircle2,
  Copy,
  Download,
  FileText,
  Loader2,
  Plane,
  Plus,
  Save,
  Ship,
  Trash2,
  Truck,
  X,
} from "lucide-react";

type TransportMode = "SEA" | "AIR" | "ROAD";

type CostComponentCategory = "freight" | "insurance" | "fees";

interface EstimatorCostComponent {
  id: string;
  label: string;
  amount: number;
  category: CostComponentCategory;
}

interface EstimatorScenario {
  id: string;
  key: string;
  name: string;
  origin: string;
  destination: string;
  mode: TransportMode;
  weightKg: number | null;
  volumeM3: number | null;
  packages: number | null;
  goodsValue: number | null;
  incoterm: string;
  hsCodes: HsCode[];
  components: EstimatorCostComponent[];
  dutyRate: number | null;
  taxRate: number | null;
  autoFillUsed: boolean;
  sensitivity: number;
  notes?: string;
  lastImportedFrom?: string | null;
}

interface ScenarioTotals {
  baseFreight: number;
  adjustedFreight: number;
  insurance: number;
  fees: number;
  duty: number;
  tax: number;
  componentTotal: number;
  total: number;
}

const VAT_DEFAULT = 18;
const INSURANCE_RATE = 0.006;
const SENSITIVITY_MIN = -10;
const SENSITIVITY_MAX = 10;

const freightRates: Record<TransportMode, number> = {
  SEA: 120,
  AIR: 2850,
  ROAD: 340,
};

const incoterms = ["FOB", "CIF", "CIP", "DAP", "EXW"];

const generateId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 10)}`;

const scenarioKeyForIndex = (index: number): string => String.fromCharCode(65 + index);

const baseComponentTemplates: Array<Omit<EstimatorCostComponent, "id">> = [
  { label: "Freight", amount: 2850000, category: "freight" },
  { label: "Insurance", amount: 180000, category: "insurance" },
  { label: "Handling / Port fees", amount: 420000, category: "fees" },
  { label: "Broker fee", amount: 320000, category: "fees" },
  { label: "Documentation", amount: 150000, category: "fees" },
  { label: "Other", amount: 90000, category: "fees" },
];

const createComponentSet = (): EstimatorCostComponent[] =>
  baseComponentTemplates.map(template => ({ ...template, id: generateId("component") }));

const normalizeScenarioKeys = (scenarios: EstimatorScenario[]): EstimatorScenario[] =>
  scenarios.map((scenario, index) => ({
    ...scenario,
    key: scenarioKeyForIndex(index),
  }));

const createScenario = (key: string, overrides: Partial<EstimatorScenario> = {}): EstimatorScenario => ({
  id: generateId("scenario"),
  key,
  name: `Scenario ${key}`,
  origin: "Douala, CM",
  destination: "Le Havre, FR",
  mode: "SEA",
  weightKg: 11800,
  volumeM3: 28,
  packages: 420,
  goodsValue: 54000000,
  incoterm: "FOB",
  hsCodes: [],
  components: createComponentSet(),
  dutyRate: 2.5,
  taxRate: VAT_DEFAULT,
  autoFillUsed: false,
  sensitivity: 0,
  notes: "Weekly sailing via Douala with port handling included.",
  lastImportedFrom: null,
  ...overrides,
});

const SCENARIO_STORAGE_KEY = "prolist_estimator_scenarios_v1";

const restoreStoredScenarios = (): EstimatorScenario[] | null => {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SCENARIO_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as EstimatorScenario[];
    if (!Array.isArray(parsed) || parsed.length === 0) return null;

    return normalizeScenarioKeys(
      parsed.map(stored => ({
        ...stored,
        id: stored.id || generateId("scenario"),
        components: (stored.components || []).map(component => ({
          ...component,
          id: component.id || generateId("component"),
        })),
        hsCodes: stored.hsCodes || [],
        autoFillUsed: Boolean(stored.autoFillUsed),
        sensitivity: stored.sensitivity ?? 0,
        lastImportedFrom: stored.lastImportedFrom ?? null,
      }))
    );
  } catch (error) {
    console.error("Failed to restore estimator scenarios", error);
    return null;
  }
};

const persistScenarios = (scenarios: EstimatorScenario[]) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      SCENARIO_STORAGE_KEY,
      JSON.stringify(
        scenarios.map(scenario => ({
          ...scenario,
          components: scenario.components.map(component => ({
            ...component,
            id: component.id,
          })),
        }))
      )
    );
  } catch (error) {
    console.error("Failed to persist estimator scenarios", error);
  }
};

const defaultScenarios = normalizeScenarioKeys([createScenario("A")]);

const parseNumberInput = (value: string): number | null => {
  if (value === "" || value === undefined) {
    return null;
  }
  const parsed = Number(value);
  return Number.isNaN(parsed) ? null : parsed;
};

const clampSensitivity = (value: number) =>
  Math.min(SENSITIVITY_MAX, Math.max(SENSITIVITY_MIN, value));

const computeDutyRateFromHs = (codes: HsCode[]): number | null => {
  if (!codes.length) return null;
  const total = codes.reduce((sum, hs) => sum + (hs.defaultDutyRate ?? 0), 0);
  return Number((total / codes.length).toFixed(2));
};

const deriveVolumeFromWeight = (weightKg: number | null) => {
  if (!weightKg) return null;
  return Number((weightKg / 320).toFixed(1));
};

const formatPercent = (value: number | null | undefined) => {
  if (value === null || value === undefined) return "0%";
  return `${value % 1 === 0 ? value.toFixed(0) : value.toFixed(1)}%`;
};

const calculateScenarioTotals = (scenario: EstimatorScenario): ScenarioTotals => {
  const goodsValue = scenario.goodsValue ?? 0;
  const components = scenario.components;
  const baseFreight = components
    .filter(component => component.category === "freight")
    .reduce((sum, component) => sum + component.amount, 0);
  const insurance = components
    .filter(component => component.category === "insurance")
    .reduce((sum, component) => sum + component.amount, 0);
  const fees = components
    .filter(component => component.category === "fees")
    .reduce((sum, component) => sum + component.amount, 0);

  const componentTotal = components.reduce((sum, component) => sum + component.amount, 0);
  const adjustedFreight = baseFreight * (1 + (scenario.sensitivity / 100));
  const adjustedComponentTotal = componentTotal - baseFreight + adjustedFreight;

  const duty = goodsValue * ((scenario.dutyRate ?? 0) / 100);
  const tax = (goodsValue + duty) * ((scenario.taxRate ?? 0) / 100);

  const total = adjustedComponentTotal + duty + tax;

  return {
    baseFreight,
    adjustedFreight,
    insurance,
    fees,
    duty,
    tax,
    componentTotal: adjustedComponentTotal,
    total,
  };
};
const computeFreightFromMode = (
  mode: TransportMode,
  weightKg: number | null,
  fallback: number
): number => {
  if (!weightKg || weightKg <= 0) {
    return fallback;
  }
  const rate = freightRates[mode];
  const estimate = Math.round(weightKg * rate);
  return Math.max(Math.round(fallback * 0.6), estimate);
};

const roundToNearestThousand = (value: number) => Math.round(value / 1000) * 1000;

const routePresets: Record<string, { origin: string; destination: string }> = {
  "CM → FR": { origin: "Douala, CM", destination: "Le Havre, FR" },
  "CM → SE": { origin: "Douala, CM", destination: "Stockholm, SE" },
  "CM → IT": { origin: "Douala, CM", destination: "Genoa, IT" },
  "CM → UK": { origin: "Douala, CM", destination: "Tilbury, UK" },
  "CM → DE": { origin: "Douala, CM", destination: "Hamburg, DE" },
};

const deriveRoute = (
  route: string | undefined,
  fallback: { origin: string; destination: string }
): { origin: string; destination: string } => {
  if (!route) return fallback;
  if (routePresets[route]) {
    return routePresets[route];
  }
  const [originRaw, destinationRaw] = route.split("→").map(part => part?.trim());
  return {
    origin: originRaw && originRaw.length > 0 ? originRaw : fallback.origin,
    destination: destinationRaw && destinationRaw.length > 0 ? destinationRaw : fallback.destination,
  };
};

const LoadingState = () => (
  <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
    <div className="space-y-4">
      <Skeleton className="h-11 w-60" />
      <Skeleton className="h-[340px] w-full rounded-xl" />
      <Skeleton className="h-[280px] w-full rounded-xl" />
    </div>
    <div className="space-y-4">
      <Skeleton className="h-40 w-full rounded-xl" />
      <Skeleton className="h-48 w-full rounded-xl" />
      <Skeleton className="h-24 w-full rounded-xl" />
    </div>
  </div>
);

interface EmptyStateProps {
  onCreate: () => void;
  onImport: () => void;
  openImportDisabled?: boolean;
}

const EmptyState = ({ onCreate, onImport, openImportDisabled }: EmptyStateProps) => (
  <Card className="border-dashed">
    <CardContent className="flex flex-col items-center justify-center gap-4 py-16 text-center">
      <div className="rounded-full border border-dashed border-primary/40 p-4">
        <Calculator className="h-8 w-8 text-primary" />
      </div>
      <div className="space-y-1">
        <h2 className="text-xl font-semibold">Start planning a new scenario</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          Start a new scenario or import an existing shipment to pre-fill the route, cargo, and goods value.
        </p>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button onClick={onCreate}>New scenario</Button>
        <Button variant="outline" onClick={onImport} disabled={openImportDisabled}>
          Import from shipment
        </Button>
      </div>
    </CardContent>
  </Card>
);
export const EstimatorPage = () => {
  const [searchParams] = useSearchParams();
  const inboundShipmentId = searchParams.get("shipmentId");

  const [scenariosState, setScenariosState] = useState<EstimatorScenario[]>(defaultScenarios);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(null);
  const [chosenScenarioId, setChosenScenarioId] = useState<string | null>(null);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isSaveDialogOpen, setIsSaveDialogOpen] = useState(false);
  const [isQuoteOpen, setIsQuoteOpen] = useState(false);
  const [importSearch, setImportSearch] = useState("");
  const [selectedShipmentId, setSelectedShipmentId] = useState<string | null>(null);
  const [mobileStep, setMobileStep] = useState<"inputs" | "results" | "actions">("inputs");
  const [initializing, setInitializing] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [hasAppliedInbound, setHasAppliedInbound] = useState(false);
  const [hsPopoverOpen, setHsPopoverOpen] = useState(false);

  const { data: hsOptions = [], isLoading: isLoadingHs } = useQuery({
    queryKey: ["hs-codes"],
    queryFn: () => mockApi.listHs(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: products = [] } = useQuery({
    queryKey: ["products"],
    queryFn: () => mockApi.listProducts(),
    staleTime: 10 * 60 * 1000,
  });

  const { data: orgSettings } = useQuery<OrgSettings>({
    queryKey: ["org-settings"],
    queryFn: () => mockApi.getOrgSettings(),
    staleTime: 10 * 60 * 1000,
  });

  const inboundShipmentQuery = useQuery({
    queryKey: ["estimator-shipment", inboundShipmentId],
    queryFn: () => mockApi.getShipment(inboundShipmentId!),
    enabled: !!inboundShipmentId,
  });

  const shipmentsQuery = useQuery({
    queryKey: ["estimator-shipments", (isImportDialogOpen ? importSearch : "")],
    queryFn: ({ queryKey }) => mockApi.listShipments(queryKey[1] as string),
    enabled: isImportDialogOpen || isSaveDialogOpen,
  });

  const shipments = useMemo(() => shipmentsQuery.data ?? [], [shipmentsQuery.data]);

  const productsMap = useMemo(() => {
    const map = new Map<string, Product>();
    products.forEach(product => {
      map.set(product.id, product);
    });
    return map;
  }, [products]);

  const hsCodeMap = useMemo(() => {
    const map = new Map<string, HsCode>();
    hsOptions.forEach(hs => map.set(hs.code, hs));
    return map;
  }, [hsOptions]);

  const setScenarios = useCallback(
    (updater: (prev: EstimatorScenario[]) => EstimatorScenario[]) => {
      setScenariosState(prev => normalizeScenarioKeys(updater(prev)));
    },
    [setScenariosState]
  );

  const updateScenario = useCallback(
    (scenarioId: string, updater: (scenario: EstimatorScenario) => EstimatorScenario) => {
      setScenarios(prev => prev.map(scenario => (scenario.id === scenarioId ? updater(scenario) : scenario)));
    },
    [setScenarios]
  );

  const updateScenarioPartial = (scenarioId: string, patch: Partial<EstimatorScenario>) => {
    updateScenario(scenarioId, scenario => ({ ...scenario, ...patch }));
  };

  useEffect(() => {
    const timer = window.setTimeout(() => setInitializing(false), 450);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!activeScenarioId && scenariosState.length > 0) {
      const initialId = scenariosState[0].id;
      setActiveScenarioId(initialId);
      setChosenScenarioId(prev => prev ?? initialId);
    }
  }, [activeScenarioId, scenariosState]);

  useEffect(() => {
    const restored = restoreStoredScenarios();
    if (restored && restored.length) {
      setScenariosState(restored);
      setActiveScenarioId(restored[0]?.id ?? null);
      setChosenScenarioId(restored[0]?.id ?? null);
    }
  }, []);

  useEffect(() => {
    if (inboundShipmentQuery.isError) {
      setLoadError("Failed to load shipment context");
      setInitializing(false);
    }
  }, [inboundShipmentQuery.isError]);

  useEffect(() => {
    if (!inboundShipmentId) return;
    if (!inboundShipmentQuery.isPending && inboundShipmentQuery.data === null) {
      setLoadError("Shipment not found");
      setInitializing(false);
    }
  }, [inboundShipmentId, inboundShipmentQuery.data, inboundShipmentQuery.isPending]);

  const applyShipmentToScenario = useCallback(
    (shipment: ShipmentWithItems) => {
      const targetScenarioId = activeScenarioId ?? scenariosState[0]?.id;
      if (!targetScenarioId) {
        return;
      }

      const shipmentProducts = shipment.items.map(item => ({
      item,
      product: productsMap.get(item.product_id),
    }));

    const totalWeight = shipmentProducts.reduce((sum, { item, product }) => {
      const weight = product?.weight_kg ?? 0;
      return sum + weight * item.quantity;
    }, 0);

    const totalPackages = shipment.items.reduce((sum, item) => sum + item.quantity, 0);
    const derivedVolume = deriveVolumeFromWeight(totalWeight);

    const uniqueHsCodes = Array.from(
      new Set(
        shipmentProducts
          .map(entry => entry.product?.hs_code)
          .filter((code): code is string => Boolean(code))
      )
    ).map(code => hsCodeMap.get(code) ?? { code, description: `HS ${code}`, uom: "UN", defaultDutyRate: 0 });

    const dutyRate = computeDutyRateFromHs(uniqueHsCodes) ?? 0;
    const insuranceAmount = roundToNearestThousand((shipment.value_fcfa ?? 0) * INSURANCE_RATE);

    updateScenario(targetScenarioId, scenario => {
      const { origin, destination } = deriveRoute(shipment.route, {
        origin: scenario.origin,
        destination: scenario.destination,
      });

      const baseFreightComponent = scenario.components.find(component => component.category === "freight");
      const freightFallback = baseFreightComponent?.amount ?? 0;
      const computedFreight = roundToNearestThousand(
        computeFreightFromMode(shipment.mode, totalWeight, freightFallback)
      );

      return {
        ...scenario,
        name: scenario.name.startsWith("Scenario") ? `${scenario.name.split(" ")[0]} ${scenario.key}` : scenario.name,
        mode: shipment.mode,
        origin,
        destination,
        incoterm: shipment.incoterm,
        goodsValue: shipment.value_fcfa ?? scenario.goodsValue,
        weightKg: totalWeight || null,
        volumeM3: derivedVolume,
        packages: totalPackages || null,
        hsCodes: uniqueHsCodes,
        dutyRate,
        taxRate: scenario.taxRate ?? VAT_DEFAULT,
        autoFillUsed: uniqueHsCodes.length > 0,
        sensitivity: 0,
        lastImportedFrom: shipment.reference,
        components: scenario.components.map(component => {
          if (component.category === "freight") {
            return { ...component, amount: computedFreight };
          }
          if (component.category === "insurance") {
            return { ...component, amount: insuranceAmount };
          }
          return component;
        }),
      };
    });

    setLoadError(null);
    setInitializing(false);
    setHasAppliedInbound(true);
    setMobileStep("inputs");
    setHsPopoverOpen(false);
  }, [activeScenarioId, scenariosState, productsMap, hsCodeMap, updateScenario]);

  useEffect(() => {
    if (inboundShipmentQuery.data && !hasAppliedInbound) {
      applyShipmentToScenario(inboundShipmentQuery.data);
      toast.success(
        `Loaded ${inboundShipmentQuery.data.reference} into Scenario ${
          scenariosState[0]?.key ?? "A"
        }`
      );
    }
  }, [inboundShipmentQuery.data, hasAppliedInbound, applyShipmentToScenario, scenariosState]);

  const scenarios = scenariosState;
  const activeScenario = useMemo(
    () => scenarios.find(scenario => scenario.id === activeScenarioId) ?? null,
    [scenarios, activeScenarioId]
  );

  const totalsByScenario = useMemo(
    () => scenarios.map(scenario => ({ scenario, totals: calculateScenarioTotals(scenario) })),
    [scenarios]
  );

  const activeTotals = totalsByScenario.find(entry => entry.scenario.id === activeScenarioId)?.totals;
  const comparisonBaseline = totalsByScenario[0]?.totals.total ?? 0;

  const handleScenarioNameChange = (event: ChangeEvent<HTMLInputElement>) => {
    if (!activeScenarioId) return;
    updateScenarioPartial(activeScenarioId, { name: event.target.value });
  };

  const handleModeChange = (mode: TransportMode) => {
    if (!activeScenarioId) return;
    const scenario = scenarios.find(s => s.id === activeScenarioId);
    if (!scenario) return;

    const weight = scenario.weightKg;
    const freightComponent = scenario.components.find(component => component.category === "freight");
    const fallback = freightComponent?.amount ?? 0;
    const adjustedFreight = roundToNearestThousand(computeFreightFromMode(mode, weight ?? null, fallback));

    updateScenario(activeScenarioId, current => ({
      ...current,
      mode,
      components: current.components.map(component =>
        component.category === "freight" ? { ...component, amount: adjustedFreight } : component
      ),
    }));
  };

  const handleScenarioNumberChange = (
    field: "weightKg" | "volumeM3" | "packages" | "goodsValue" | "dutyRate" | "taxRate"
  ) =>
    (event: ChangeEvent<HTMLInputElement>) => {
      if (!activeScenarioId) return;
      const numeric = parseNumberInput(event.target.value);
      updateScenarioPartial(activeScenarioId, { [field]: numeric } as Partial<EstimatorScenario>);
    };

  const handleComponentLabelChange = (componentId: string, value: string) => {
    if (!activeScenarioId) return;
    updateScenario(activeScenarioId, scenario => ({
      ...scenario,
      components: scenario.components.map(component =>
        component.id === componentId ? { ...component, label: value } : component
      ),
    }));
  };

  const handleComponentAmountChange = (componentId: string, value: string) => {
    if (!activeScenarioId) return;
    const numeric = parseNumberInput(value);
    updateScenario(activeScenarioId, scenario => ({
      ...scenario,
      components: scenario.components.map(component =>
        component.id === componentId
          ? { ...component, amount: Math.max(0, roundToNearestThousand(numeric ?? 0)) }
          : component
      ),
    }));
  };

  const handleAddComponent = () => {
    if (!activeScenarioId) return;
    updateScenario(activeScenarioId, scenario => ({
      ...scenario,
      components: [
        ...scenario.components,
        {
          id: generateId("component"),
          label: `Additional fee ${scenario.components.length - baseComponentTemplates.length + 1}`,
          amount: 0,
          category: "fees",
        },
      ],
    }));
  };

  const handleRemoveComponent = (componentId: string, category: CostComponentCategory) => {
    if (!activeScenarioId) return;
    if (category === "freight" || category === "insurance") {
      toast.info("Freight and insurance stay in every estimate.");
      return;
    }
    updateScenario(activeScenarioId, scenario => ({
      ...scenario,
      components: scenario.components.filter(component => component.id !== componentId),
    }));
  };

  const handleAutoFill = () => {
    if (!activeScenarioId) return;
    const scenario = scenarios.find(s => s.id === activeScenarioId);
    if (!scenario) return;
    if (!scenario.hsCodes.length) {
      toast.info("Add at least one HS code to auto-fill duty and VAT.");
      return;
    }

    const dutyRate = computeDutyRateFromHs(scenario.hsCodes) ?? scenario.dutyRate ?? 0;
    const goodsValue = scenario.goodsValue ?? 0;
    const insuranceAmount = roundToNearestThousand(goodsValue * INSURANCE_RATE);

    updateScenario(activeScenarioId, current => ({
      ...current,
      dutyRate,
      taxRate: VAT_DEFAULT,
      autoFillUsed: true,
      components: current.components.map(component =>
        component.category === "insurance" ? { ...component, amount: insuranceAmount } : component
      ),
    }));

    toast.success("Duty and VAT populated from HS defaults.");
  };

  const handleHsAdd = (code: HsCode) => {
    if (!activeScenarioId) return;
    updateScenario(activeScenarioId, scenario => {
      if (scenario.hsCodes.some(existing => existing.code === code.code)) {
        return scenario;
      }
      return {
        ...scenario,
        hsCodes: [...scenario.hsCodes, code],
      };
    });
    setHsPopoverOpen(false);
  };

  const handleHsRemove = (code: string) => {
    if (!activeScenarioId) return;
    updateScenario(activeScenarioId, scenario => ({
      ...scenario,
      hsCodes: scenario.hsCodes.filter(existing => existing.code !== code),
      autoFillUsed: scenario.autoFillUsed && scenario.hsCodes.length > 1,
    }));
  };

  const handleSensitivityChange = (value: number[]) => {
    if (!activeScenarioId) return;
    updateScenarioPartial(activeScenarioId, { sensitivity: clampSensitivity(value[0] ?? 0) });
  };

  const handleAddScenario = () => {
    const nextKey = scenarioKeyForIndex(scenarios.length);
    const newScenario = createScenario(nextKey);
    setScenarios(prev => [...prev, newScenario]);
    setActiveScenarioId(newScenario.id);
    setMobileStep("inputs");
  };

  const handleDuplicateScenario = (scenarioId: string) => {
    const source = scenarios.find(scenario => scenario.id === scenarioId);
    if (!source) return;
    const nextKey = scenarioKeyForIndex(scenarios.length);
    const duplicate: EstimatorScenario = {
      ...source,
      id: generateId("scenario"),
      key: nextKey,
      name: `${source.name} copy`,
      components: source.components.map(component => ({
        ...component,
        id: generateId("component"),
      })),
      autoFillUsed: source.autoFillUsed,
      lastImportedFrom: source.lastImportedFrom,
    };
    setScenarios(prev => [...prev, duplicate]);
    setActiveScenarioId(duplicate.id);
    setMobileStep("inputs");
  };

  const handleDeleteScenario = (scenarioId: string) => {
    const filtered = scenarios.filter(scenario => scenario.id !== scenarioId);
    setScenarios(() => filtered);

    if (filtered.length === 0) {
      setActiveScenarioId(null);
      setChosenScenarioId(null);
      return;
    }

    if (activeScenarioId === scenarioId) {
      setActiveScenarioId(filtered[0].id);
    }
    if (chosenScenarioId === scenarioId) {
      setChosenScenarioId(filtered[0].id);
      toast.info("Chosen scenario updated to the next available option.");
    }
  };

  const handleScenarioChosen = () => {
    if (!activeScenario) return;
    setChosenScenarioId(activeScenario.id);
    toast.success(`${activeScenario.name} marked as the scenario to push to shipments.`);
  };

  const handleSaveScenario = () => {
    persistScenarios(scenarios);
    toast.success("Scenario saved locally on this browser.");
  };

  const handleExportCsv = () => {
    if (!activeScenario || !activeTotals) return;
    const rows = [
      ["Component", "Amount (FCFA)"],
      ...activeScenario.components.map(component => [component.label, Math.round(component.amount).toString()]),
      ["Duty", Math.round(activeTotals.duty).toString()],
      ["VAT/Tax", Math.round(activeTotals.tax).toString()],
      ["Estimated Total", Math.round(activeTotals.total).toString()],
    ];
    const csv = rows
      .map(row => row.map(value => `"${value.replace(/"/g, '""')}"`).join(","))
      .join("\n");

    if (typeof window !== "undefined") {
      const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${activeScenario.name.replace(/\s+/g, "-").toLowerCase()}-estimate.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast.success("CSV breakdown exported");
    }
  };

  const handleExportPdf = () => {
    toast.info("Quote sheet PDF export is available from the preview drawer in this demo.");
  };

  const handleSaveToShipment = () => {
    if (!activeScenario || !activeTotals || !selectedShipmentId) return;
    const shipment = shipments.find(item => item.id === selectedShipmentId);
    toast.success(
      shipment
        ? `Pushed ${activeScenario.name} to ${shipment.reference}.`
        : `${activeScenario.name} prepared for shipment costs.`
    );
    setIsSaveDialogOpen(false);
  };

  const handleRetry = () => {
    setLoadError(null);
    setInitializing(true);
    setTimeout(() => setInitializing(false), 400);
    if (inboundShipmentId) {
      inboundShipmentQuery.refetch();
    }
  };

  useEffect(() => {
    if (!isImportDialogOpen) {
      setImportSearch("");
    }
  }, [isImportDialogOpen]);

  useEffect(() => {
    if (!isSaveDialogOpen) {
      setSelectedShipmentId(null);
    } else if (!selectedShipmentId && shipments.length > 0) {
      setSelectedShipmentId(shipments[0].id);
    }
  }, [isSaveDialogOpen, selectedShipmentId, shipments]);

  const mobileStepLabel = mobileStep === "inputs" ? "Review estimate" : mobileStep === "results" ? "Next: Actions" : "Back to inputs";
  const mobileNextStep = mobileStep === "inputs" ? "results" : mobileStep === "results" ? "actions" : "inputs";

  const assumptionBadges = activeScenario
    ? [
        `Duty ${formatPercent(activeScenario.dutyRate)}`,
        `VAT ${formatPercent(activeScenario.taxRate)}`,
        `${activeScenario.mode} mode`,
        activeScenario.incoterm,
      ]
    : [];

  const insuranceRateBadge = activeScenario && activeScenario.goodsValue
    ? `${((
        (activeScenario.components.find(component => component.category === "insurance")?.amount ?? 0) /
        activeScenario.goodsValue
      ) * 100).toFixed(1)}% insurance`
    : null;

  return (
    <div className="space-y-6 pb-24">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Cost Estimator</h1>
          <p className="text-muted-foreground">
            Plan costs, compare options, and save to a shipment.
          </p>
          <p className="text-sm text-muted-foreground">Estimates are indicative and may vary.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleAddScenario}>
            <Plus className="mr-2 h-4 w-4" />
            New scenario
          </Button>
          <Button
            variant="link"
            className="text-primary"
            onClick={() => setIsImportDialogOpen(true)}
          >
            Import from shipment
          </Button>
        </div>
      </header>

      {loadError && (
        <Alert variant="destructive" className="flex items-start justify-between gap-4">
          <div>
            <AlertTitle>Something went wrong</AlertTitle>
            <AlertDescription>{loadError}</AlertDescription>
          </div>
          <Button variant="outline" size="sm" onClick={handleRetry}>
            Retry
          </Button>
        </Alert>
      )}

      <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Import from shipment</DialogTitle>
            <DialogDescription>
              Pull route, cargo, and values from an existing shipment to jump-start your estimate.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Search by buyer or reference"
              value={importSearch}
              onChange={event => setImportSearch(event.target.value)}
            />
            <div className="rounded-lg border">
              {shipmentsQuery.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : shipments.length > 0 ? (
                <ScrollArea className="h-72">
                  <div className="divide-y">
                    {shipments.map(shipment => (
                      <button
                        key={shipment.id}
                        type="button"
                        onClick={() => {
                          applyShipmentToScenario(shipment);
                          toast.success(`Imported ${shipment.reference} into active scenario.`);
                          setIsImportDialogOpen(false);
                        }}
                        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left transition hover:bg-muted"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{shipment.reference}</span>
                            <Badge variant="outline" className="uppercase">
                              {shipment.mode}
                            </Badge>
                            <Badge variant="secondary" className="uppercase">
                              {shipment.incoterm}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{shipment.buyer}</p>
                          <p className="text-xs text-muted-foreground">{shipment.route}</p>
                        </div>
                        <div className="text-sm font-medium">{formatFcfa(shipment.value_fcfa)}</div>
                      </button>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No matching shipments right now.
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsImportDialogOpen(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isSaveDialogOpen} onOpenChange={setIsSaveDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Save to shipment</DialogTitle>
            <DialogDescription>
              Write this estimate into a shipment’s costs tab as editable lines.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="shipment-select">Shipment</Label>
              <Select
                value={selectedShipmentId ?? ""}
                onValueChange={value => setSelectedShipmentId(value)}
              >
                <SelectTrigger id="shipment-select">
                  <SelectValue placeholder="Select a shipment" />
                </SelectTrigger>
                <SelectContent>
                  {shipments.map(shipment => (
                    <SelectItem key={shipment.id} value={shipment.id}>
                      {shipment.reference} · {shipment.buyer}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Save to shipment to turn this into editable cost lines.
              </p>
            </div>
            <Card className="bg-muted/30">
              <CardContent className="space-y-1 py-3">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>{activeScenario?.name ?? "Scenario"}</span>
                  <span>{formatFcfa(activeTotals?.total ?? 0)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Freight {formatFcfa(activeTotals?.adjustedFreight ?? 0)} · Duty {formatFcfa(activeTotals?.duty ?? 0)} · VAT {formatFcfa(activeTotals?.tax ?? 0)}
                </p>
              </CardContent>
            </Card>
          </div>
          <DialogFooter className="flex items-center justify-between">
            <Button variant="outline" onClick={() => setIsSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveToShipment} disabled={!selectedShipmentId || !activeScenario}>
              Push to shipment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Drawer open={isQuoteOpen} onOpenChange={setIsQuoteOpen}>
        <DrawerContent>
          <DrawerHeader className="space-y-1">
            <DrawerTitle>Quote sheet preview</DrawerTitle>
            <DrawerDescription>Indicative estimate for planning</DrawerDescription>
          </DrawerHeader>
          <div className="px-6 pb-4 space-y-4">
            <div className="flex flex-col gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-medium">{orgSettings?.name ?? "ProList"}</span>
                <Badge variant="secondary">{activeScenario?.name}</Badge>
              </div>
              <div className="text-muted-foreground">
                <p>
                  {activeScenario?.origin} → {activeScenario?.destination}
                </p>
                <p>
                  Mode {activeScenario?.mode ?? "—"} · Incoterm {activeScenario?.incoterm ?? "—"}
                </p>
              </div>
              {activeScenario?.hsCodes.length ? (
                <div className="flex flex-wrap gap-2">
                  {activeScenario.hsCodes.map(code => (
                    <Badge key={code.code} variant="outline" className="font-mono text-xs">
                      {code.code}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Component</TableHead>
                  <TableHead className="text-right">Amount (FCFA)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeScenario && activeTotals && (
                  <>
                    {activeScenario.components.map(component => {
                      const amount = component.category === "freight" ? activeTotals.adjustedFreight : component.amount;
                      return (
                        <TableRow key={component.id}>
                          <TableCell>{component.label}</TableCell>
                          <TableCell className="text-right">{formatFcfa(amount)}</TableCell>
                        </TableRow>
                      );
                    })}
                    <TableRow>
                      <TableCell>Duty</TableCell>
                      <TableCell className="text-right">{formatFcfa(activeTotals?.duty ?? 0)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>VAT / Tax</TableCell>
                      <TableCell className="text-right">{formatFcfa(activeTotals?.tax ?? 0)}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell className="font-semibold">Estimated total</TableCell>
                      <TableCell className="text-right font-semibold">
                        {formatFcfa(activeTotals?.total ?? 0)}
                      </TableCell>
                    </TableRow>
                  </>
                )}
              </TableBody>
            </Table>
          </div>
          <DrawerFooter>
            <p className="text-xs text-muted-foreground text-center">
              Indicative estimate for planning. Save to shipment to turn this into editable cost lines.
            </p>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {initializing ? (
        <LoadingState />
      ) : scenarios.length === 0 ? (
        <EmptyState
          onCreate={handleAddScenario}
          onImport={() => setIsImportDialogOpen(true)}
          openImportDisabled={isLoadingHs}
        />
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-2">
            {scenarios.map(scenario => {
              const isActive = scenario.id === activeScenarioId;
              const isChosen = scenario.id === chosenScenarioId;
              return (
                <div
                  key={scenario.id}
                  className={cn(
                    "flex items-center gap-1 rounded-full border bg-muted/40 pr-1 shadow-sm transition",
                    isActive && "border-primary bg-primary/10 text-primary"
                  )}
                >
                  <button
                    type="button"
                    className="flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium"
                    onClick={() => {
                      setActiveScenarioId(scenario.id);
                      setMobileStep("inputs");
                    }}
                  >
                    <span>Scenario {scenario.key}</span>
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {scenario.name}
                    </span>
                    {isChosen && (
                      <Badge variant="outline" className="ml-1 border-primary/50 text-primary">
                        Chosen
                      </Badge>
                    )}
                  </button>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDuplicateScenario(scenario.id)}
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDeleteScenario(scenario.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              );
            })}
            <Button variant="outline" size="sm" onClick={handleAddScenario}>
              <Plus className="mr-2 h-4 w-4" /> Add scenario
            </Button>
          </div>

          <div className="lg:hidden">
            <div className="flex items-center justify-between rounded-lg border bg-muted/40 px-3 py-2 text-xs font-medium">
              <span className="uppercase tracking-wide text-muted-foreground">{mobileStep}</span>
              <button
                type="button"
                className="text-primary"
                onClick={() => setMobileStep(mobileNextStep)}
              >
                {mobileStepLabel}
              </button>
            </div>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
            <div className={cn("space-y-6", mobileStep !== "inputs" ? "hidden lg:block" : "")}> 
              {activeScenario && (
                <>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Scenario details</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <Label htmlFor="scenario-name">Scenario name</Label>
                        <Input
                          id="scenario-name"
                          value={activeScenario.name}
                          onChange={handleScenarioNameChange}
                          placeholder="Enter a memorable scenario name"
                        />
                      </div>
                      {activeScenario.lastImportedFrom && (
                        <Badge variant="outline" className="text-xs">
                          Imported from {activeScenario.lastImportedFrom}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Route &amp; mode</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="origin">Origin</Label>
                        <Input
                          id="origin"
                          value={activeScenario.origin}
                          onChange={event => updateScenarioPartial(activeScenario.id, { origin: event.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="destination">Destination</Label>
                        <Input
                          id="destination"
                          value={activeScenario.destination}
                          onChange={event => updateScenarioPartial(activeScenario.id, { destination: event.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Mode</Label>
                        <Select value={activeScenario.mode} onValueChange={value => handleModeChange(value as TransportMode)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SEA">
                              <div className="flex items-center gap-2">
                                <Ship className="h-4 w-4" /> Sea
                              </div>
                            </SelectItem>
                            <SelectItem value="AIR">
                              <div className="flex items-center gap-2">
                                <Plane className="h-4 w-4" /> Air
                              </div>
                            </SelectItem>
                            <SelectItem value="ROAD">
                              <div className="flex items-center gap-2">
                                <Truck className="h-4 w-4" /> Road
                              </div>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Cargo</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-3">
                      <div className="space-y-2">
                        <Label htmlFor="weight">Weight (kg)</Label>
                        <Input
                          id="weight"
                          type="number"
                          value={activeScenario.weightKg ?? ""}
                          onChange={handleScenarioNumberChange("weightKg")}
                          min="0"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="volume">Volume (m³)</Label>
                        <Input
                          id="volume"
                          type="number"
                          value={activeScenario.volumeM3 ?? ""}
                          onChange={handleScenarioNumberChange("volumeM3")}
                          min="0"
                          step="0.1"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="packages">Packages</Label>
                        <Input
                          id="packages"
                          type="number"
                          value={activeScenario.packages ?? ""}
                          onChange={handleScenarioNumberChange("packages")}
                          min="0"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Goods value &amp; terms</CardTitle>
                    </CardHeader>
                    <CardContent className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="goods-value">Goods value (FCFA)</Label>
                        <Input
                          id="goods-value"
                          type="number"
                          value={activeScenario.goodsValue ?? ""}
                          onChange={handleScenarioNumberChange("goodsValue")}
                          min="0"
                          step="1000"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Incoterm</Label>
                        <Select value={activeScenario.incoterm} onValueChange={value => updateScenarioPartial(activeScenario.id, { incoterm: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {incoterms.map(option => (
                              <SelectItem key={option} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">HS codes</CardTitle>
                        <Popover open={hsPopoverOpen} onOpenChange={setHsPopoverOpen}>
                          <PopoverTrigger asChild>
                            <Button variant="outline" size="sm">
                              Add HS code
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="p-0" align="end">
                            <Command>
                              <CommandInput placeholder="Search HS codes" />
                              <CommandList>
                                <CommandEmpty>No codes found</CommandEmpty>
                                <CommandGroup>
                                  {hsOptions.map(code => (
                                    <CommandItem
                                      key={code.code}
                                      onSelect={() => handleHsAdd(code)}
                                    >
                                      <div>
                                        <div className="font-mono text-sm">{code.code}</div>
                                        <div className="text-xs text-muted-foreground">
                                          {code.description}
                                        </div>
                                      </div>
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        Optional, but improves duty accuracy.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {activeScenario.hsCodes.length ? (
                          activeScenario.hsCodes.map(code => (
                            <Badge key={code.code} variant="secondary" className="flex items-center gap-1">
                              <span className="font-mono text-xs">{code.code}</span>
                              <button
                                type="button"
                                onClick={() => handleHsRemove(code.code)}
                                className="rounded-full p-0.5 hover:bg-primary/10"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))
                        ) : (
                          <p className="text-xs text-muted-foreground">No HS codes added yet.</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-base">Cost components</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="rounded-lg border">
                        {activeScenario.components.map(component => (
                          <div
                            key={component.id}
                            className="flex flex-wrap items-center gap-3 border-b px-4 py-3 last:border-b-0"
                          >
                            <div className="flex-1 space-y-2">
                              <Label className="text-xs text-muted-foreground">Label</Label>
                              <Input
                                value={component.label}
                                onChange={event => handleComponentLabelChange(component.id, event.target.value)}
                              />
                            </div>
                            <div className="flex-1 space-y-2">
                              <Label className="text-xs text-muted-foreground">Amount (FCFA)</Label>
                              <Input
                                type="number"
                                value={component.amount}
                                onChange={event => handleComponentAmountChange(component.id, event.target.value)}
                                min="0"
                                step="1000"
                              />
                            </div>
                            <Badge variant="outline" className="uppercase text-xs">
                              {component.category}
                            </Badge>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => handleRemoveComponent(component.id, component.category)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </span>
                              </TooltipTrigger>
                              <TooltipContent>
                                Remove component
                              </TooltipContent>
                            </Tooltip>
                          </div>
                        ))}
                      </div>
                      <Button variant="outline" size="sm" onClick={handleAddComponent}>
                        <Plus className="mr-2 h-4 w-4" /> Add component
                      </Button>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">Duties &amp; taxes</CardTitle>
                        <Badge variant="outline" className="text-xs uppercase">
                          Duty model used
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="duty-rate">Duty rate (%)</Label>
                          <Input
                            id="duty-rate"
                            type="number"
                            value={activeScenario.dutyRate ?? ""}
                            onChange={handleScenarioNumberChange("dutyRate")}
                            min="0"
                            step="0.1"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="tax-rate">VAT / Tax (%)</Label>
                          <Input
                            id="tax-rate"
                            type="number"
                            value={activeScenario.taxRate ?? ""}
                            onChange={handleScenarioNumberChange("taxRate")}
                            min="0"
                            step="0.1"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <Button onClick={handleAutoFill} disabled={isLoadingHs}>
                          Auto-fill
                        </Button>
                        <p className="text-sm text-muted-foreground">
                          Auto-fill uses your saved rates or defaults.
                        </p>
                        {activeScenario.autoFillUsed && (
                          <Badge variant="outline" className="flex items-center gap-1 text-xs">
                            <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                            Auto-filled
                          </Badge>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            <div className={cn("space-y-6", mobileStep !== "results" ? "hidden lg:block" : "")}> 
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">Estimated total</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-semibold">
                      {formatFcfa(activeTotals?.total ?? 0)}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {assumptionBadges.map(badge => (
                      <Badge key={badge} variant="secondary" className="text-xs">
                        {badge}
                      </Badge>
                    ))}
                    {insuranceRateBadge && (
                      <Badge variant="outline" className="text-xs">
                        {insuranceRateBadge}
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm text-muted-foreground">Breakdown</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span>Freight</span>
                    <span className="font-medium">{formatFcfa(activeTotals?.adjustedFreight ?? 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Insurance</span>
                    <span className="font-medium">{formatFcfa(activeTotals?.insurance ?? 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Fees</span>
                    <span className="font-medium">{formatFcfa(activeTotals?.fees ?? 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>Duty</span>
                    <span className="font-medium">{formatFcfa(activeTotals?.duty ?? 0)}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>VAT / Tax</span>
                    <span className="font-medium">{formatFcfa(activeTotals?.tax ?? 0)}</span>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-sm text-muted-foreground">Sensitivity</CardTitle>
                  <Badge variant="outline" className="text-xs uppercase">
                    ±10% freight
                  </Badge>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-xs text-muted-foreground">
                    Shift freight up or down to see total impact instantly.
                  </p>
                  <Slider
                    min={SENSITIVITY_MIN}
                    max={SENSITIVITY_MAX}
                    step={1}
                    value={[activeScenario?.sensitivity ?? 0]}
                    onValueChange={handleSensitivityChange}
                  />
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{activeScenario?.sensitivity ?? 0}%</span>
                    <span>{formatFcfa(activeTotals?.adjustedFreight ?? 0)}</span>
                  </div>
                </CardContent>
              </Card>

              {scenarios.length > 1 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="text-sm text-muted-foreground">Scenario comparison</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-4">
                      {totalsByScenario.map(({ scenario, totals }, index) => {
                        const diff = totals.total - comparisonBaseline;
                        return (
                          <div
                            key={scenario.id}
                            className={cn(
                              "flex flex-col gap-1 rounded-lg border p-3 text-sm",
                              scenario.id === chosenScenarioId && "border-primary"
                            )}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant="outline">Scenario {scenario.key}</Badge>
                                {scenario.id === chosenScenarioId && (
                                  <Badge variant="secondary" className="text-xs">
                                    Chosen
                                  </Badge>
                                )}
                              </div>
                              <span className="font-medium">{formatFcfa(totals.total)}</span>
                            </div>
                            {index > 0 && (
                              <div
                                className={cn(
                                  "flex items-center gap-1 text-xs",
                                  diff > 0 ? "text-red-500" : diff < 0 ? "text-emerald-500" : "text-muted-foreground"
                                )}
                              >
                                {diff === 0 ? (
                                  <span>Even with Scenario {totalsByScenario[0].scenario.key}</span>
                                ) : diff > 0 ? (
                                  <>
                                    <ArrowUpRight className="h-3 w-3" /> +{formatFcfa(Math.abs(diff))} vs base
                                  </>
                                ) : (
                                  <>
                                    <ArrowDownRight className="h-3 w-3" /> -{formatFcfa(Math.abs(diff))} vs base
                                  </>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              )}

              <Button
                variant={activeScenario?.id === chosenScenarioId ? "secondary" : "outline"}
                className="w-full"
                onClick={handleScenarioChosen}
              >
                Set {activeScenario?.name ?? "scenario"} as chosen
              </Button>
            </div>
          </div>

          <div className={cn("space-y-4", mobileStep !== "actions" ? "hidden lg:block" : "")}> 
            <Card>
              <CardContent className="flex flex-wrap items-center gap-2 py-4">
                <Button onClick={() => setIsSaveDialogOpen(true)}>Save to shipment…</Button>
                <Button variant="outline" onClick={handleExportCsv}>
                  <Download className="mr-2 h-4 w-4" /> CSV
                </Button>
                <Button variant="outline" onClick={handleExportPdf}>
                  <FileText className="mr-2 h-4 w-4" /> PDF
                </Button>
                <Button variant="outline" onClick={handleSaveScenario}>
                  <Save className="mr-2 h-4 w-4" /> Save scenario
                </Button>
                <Button variant="outline" onClick={() => setIsQuoteOpen(true)}>
                  Quote sheet preview
                </Button>
                <p className="text-xs text-muted-foreground">
                  Save to shipment to turn this into editable cost lines.
                </p>
              </CardContent>
            </Card>
          </div>
        </>
      )}

      {!initializing && scenarios.length > 0 && (
        <div className="fixed inset-x-4 bottom-4 lg:hidden">
          <Button className="w-full" onClick={() => setMobileStep(mobileNextStep)}>
            {mobileStepLabel}
          </Button>
        </div>
      )}
    </div>
  );
};
