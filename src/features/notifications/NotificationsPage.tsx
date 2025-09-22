import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import type { NotificationItem } from "@/mocks/types";
import {
  NOTIFICATION_FILTERS,
  NOTIFICATION_TYPE_META,
  READ_FILTERS,
  SEVERITY_FILTERS,
  TIME_FILTERS,
  VIEW_MODES,
  type NotificationFilterKey,
} from "./constants";
import {
  filterNotifications,
  formatRelativeTime,
  resolveNotificationDestination,
  sortNotifications,
  type NotificationFilterState,
  type ReadFilterValue,
  type SeverityFilterValue,
  type TimeFilterValue,
} from "./utils";
import { NotificationCard, NotificationCardAction } from "./components/NotificationCard";
import { useNotifications } from "./hooks/useNotifications";
import {
  ArrowRight,
  CheckSquare,
  LayoutGrid,
  Loader2,
  Search,
  Table2,
  Trash2,
} from "lucide-react";

const PAGE_SIZE_CARDS = 6;
const PAGE_SIZE_TABLE = 8;

export const NotificationsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { notifications, isLoading, markRead, deleteNotifications, preferences, isDeleting } =
    useNotifications();

  const [typeFilter, setTypeFilter] = useState<NotificationFilterKey>("all");
  const [readFilter, setReadFilter] = useState<ReadFilterValue>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilterValue>("any");
  const [severityFilter, setSeverityFilter] = useState<SeverityFilterValue>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<(typeof VIEW_MODES)[number]["value"]>("cards");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [isMarkingSelected, setIsMarkingSelected] = useState(false);
  const [page, setPage] = useState(1);

  const highPriorityTypes = useMemo(
    () => preferences?.highPriority ?? [],
    [preferences?.highPriority],
  );

  const sortedNotifications = useMemo(
    () => sortNotifications(notifications, highPriorityTypes),
    [notifications, highPriorityTypes],
  );

  const filterState = useMemo<NotificationFilterState>(
    () => ({
      search: searchTerm,
      filter: typeFilter,
      read: readFilter,
      time: timeFilter,
      severity: severityFilter,
    }),
    [searchTerm, typeFilter, readFilter, timeFilter, severityFilter],
  );

  const filteredNotifications = useMemo(
    () => filterNotifications(sortedNotifications, filterState),
    [sortedNotifications, filterState],
  );

  const pageSize = viewMode === "cards" ? PAGE_SIZE_CARDS : PAGE_SIZE_TABLE;
  const totalPages = Math.max(1, Math.ceil(filteredNotifications.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageSliceStart = (currentPage - 1) * pageSize;
  const pageSliceEnd = pageSliceStart + pageSize;
  const paginatedNotifications = filteredNotifications.slice(pageSliceStart, pageSliceEnd);

  useEffect(() => {
    setPage(1);
  }, [typeFilter, readFilter, timeFilter, severityFilter, searchTerm, viewMode]);

  useEffect(() => {
    setSelectedIds(previous =>
      previous.filter(id => filteredNotifications.some(notification => notification.id === id)),
    );
  }, [filteredNotifications]);

  const toggleSelect = (notification: NotificationItem) => {
    setSelectedIds(previous =>
      previous.includes(notification.id)
        ? previous.filter(id => id !== notification.id)
        : [...previous, notification.id],
    );
  };

  const toggleSelectPage = () => {
    const pageIds = paginatedNotifications.map(notification => notification.id);
    const hasAll = pageIds.every(id => selectedIds.includes(id));

    setSelectedIds(previous => {
      if (hasAll) {
        return previous.filter(id => !pageIds.includes(id));
      }
      const merged = new Set([...previous, ...pageIds]);
      return Array.from(merged);
    });
  };

  const handleMarkSelected = async () => {
    if (!selectedIds.length) return;
    setIsMarkingSelected(true);
    try {
      await Promise.all(selectedIds.map(id => markRead({ id, read: true })));
      toast({
        title: "Marked as read",
        description: `${selectedIds.length} notification${selectedIds.length > 1 ? "s" : ""} updated.`,
      });
      setSelectedIds([]);
    } finally {
      setIsMarkingSelected(false);
    }
  };

  const handleDeleteSelected = async () => {
    if (!selectedIds.length) return;
    await deleteNotifications(selectedIds);
    toast({
      title: "Notifications removed",
      description: "The selected updates won’t appear in your feed anymore.",
    });
    setSelectedIds([]);
    setDeleteDialogOpen(false);
  };

  const handleOpenNotification = async (notification: NotificationItem) => {
    if (notification.unread) {
      await markRead({ id: notification.id, read: true });
    }
    const destination = resolveNotificationDestination(notification);
    if (destination) {
      navigate(destination);
    } else {
      toast({
        title: "Workspace link coming soon",
        description: "We’ll open this notification in its workspace shortly.",
      });
    }
  };

  const handleViewPreferences = () => {
    navigate("/settings?tab=notifications");
  };

  const startItem = filteredNotifications.length === 0 ? 0 : pageSliceStart + 1;
  const endItem = Math.min(filteredNotifications.length, pageSliceEnd);
  const allSelectedOnPage =
    paginatedNotifications.length > 0 &&
    paginatedNotifications.every(notification => selectedIds.includes(notification.id));

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Notifications</h1>
            <p className="text-muted-foreground">
              Review and manage updates across your workspace.
            </p>
          </div>
          <Button variant="outline" onClick={handleViewPreferences}>
            Tune preferences
          </Button>
        </div>
        <div className="text-sm text-muted-foreground">
          {filteredNotifications.length} notifications · {selectedIds.length} selected
        </div>
      </header>

      <section className="rounded-2xl border bg-card/80 p-4 shadow-sm">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-md">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={searchTerm}
                onChange={event => setSearchTerm(event.target.value)}
                placeholder="Search by title or reference"
                className="pl-9"
              />
            </div>
            <ToggleGroup
              type="single"
              value={viewMode}
              onValueChange={value => value && setViewMode(value as (typeof VIEW_MODES)[number]["value"])}
              className="self-start rounded-full border bg-background/80 p-1"
            >
              <ToggleGroupItem
                value="cards"
                className="rounded-full px-3 py-1 text-sm data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
              >
                <LayoutGrid className="mr-2 h-4 w-4" /> Cards
              </ToggleGroupItem>
              <ToggleGroupItem
                value="table"
                className="rounded-full px-3 py-1 text-sm data-[state=on]:bg-primary/10 data-[state=on]:text-primary"
              >
                <Table2 className="mr-2 h-4 w-4" /> Table
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Select value={typeFilter} onValueChange={value => setTypeFilter(value as NotificationFilterKey)}>
              <SelectTrigger className="rounded-xl border-muted bg-background/80">
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                {NOTIFICATION_FILTERS.map(filter => (
                  <SelectItem key={filter.key} value={filter.key}>
                    {filter.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={readFilter} onValueChange={value => setReadFilter(value as ReadFilterValue)}>
              <SelectTrigger className="rounded-xl border-muted bg-background/80">
                <SelectValue placeholder="Read status" />
              </SelectTrigger>
              <SelectContent>
                {READ_FILTERS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={timeFilter} onValueChange={value => setTimeFilter(value as TimeFilterValue)}>
              <SelectTrigger className="rounded-xl border-muted bg-background/80">
                <SelectValue placeholder="Time" />
              </SelectTrigger>
              <SelectContent>
                {TIME_FILTERS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={severityFilter} onValueChange={value => setSeverityFilter(value as SeverityFilterValue)}>
              <SelectTrigger className="rounded-xl border-muted bg-background/80">
                <SelectValue placeholder="Severity" />
              </SelectTrigger>
              <SelectContent>
                {SEVERITY_FILTERS.map(option => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={toggleSelectPage}
              disabled={paginatedNotifications.length === 0}
            >
              <CheckSquare className="mr-2 h-4 w-4" />
              {allSelectedOnPage ? "Clear page" : "Select page"}
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleMarkSelected}
              disabled={!selectedIds.length || isMarkingSelected}
            >
              {isMarkingSelected ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <ArrowRight className="mr-2 h-4 w-4" />
              )}
              Mark selected as read
            </Button>
            <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <AlertDialogTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  disabled={!selectedIds.length || isDeleting}
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Delete selected
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete notifications?</AlertDialogTitle>
                  <AlertDialogDescription>
                    We’ll remove {selectedIds.length} notification
                    {selectedIds.length === 1 ? "" : "s"}. This action can’t be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={handleDeleteSelected} disabled={isDeleting}>
                    {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={`loading-${index}`} className="rounded-2xl border bg-card/70">
                <CardContent className="space-y-3 p-5">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-5/6" />
                  <Skeleton className="h-3 w-1/2" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredNotifications.length === 0 ? (
          <Card className="rounded-2xl border-dashed bg-muted/40">
            <CardContent className="flex flex-col items-center justify-center space-y-2 p-10 text-center">
              <h3 className="text-lg font-semibold">All clear for now</h3>
              <p className="text-sm text-muted-foreground">
                Adjust your filters or check back later for new activity.
              </p>
            </CardContent>
          </Card>
        ) : viewMode === "cards" ? (
          <div className="grid gap-4 md:grid-cols-2">
            {paginatedNotifications.map(notification => (
              <NotificationCard
                key={notification.id}
                notification={notification}
                highPriority={notification.unread && highPriorityTypes.includes(notification.type)}
                onClick={() => handleOpenNotification(notification)}
                padding="comfortable"
                selectionControl={
                  <Checkbox
                    checked={selectedIds.includes(notification.id)}
                    onCheckedChange={() => toggleSelect(notification)}
                  />
                }
                actionSlot={
                  <NotificationCardAction onClick={() => handleOpenNotification(notification)}>
                    Go to
                  </NotificationCardAction>
                }
              />
            ))}
          </div>
        ) : (
          <Card className="rounded-2xl border bg-card/80">
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="border-b">
                    <TableHead className="w-12">
                      <Checkbox checked={allSelectedOnPage} onCheckedChange={toggleSelectPage} />
                    </TableHead>
                    <TableHead className="min-w-[120px]">Type</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Context</TableHead>
                    <TableHead className="w-[120px]">Time</TableHead>
                    <TableHead className="w-[90px]">Status</TableHead>
                    <TableHead className="w-[110px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedNotifications.map(notification => {
                    const typeMeta = NOTIFICATION_TYPE_META[notification.type];
                    const isSelected = selectedIds.includes(notification.id);
                    const highPriority = notification.unread && highPriorityTypes.includes(notification.type);

                    return (
                      <TableRow
                        key={notification.id}
                        className={cn(
                          notification.unread ? "bg-muted/40" : "",
                          isSelected && "ring-1 ring-primary/40",
                        )}
                      >
                        <TableCell>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelect(notification)}
                          />
                        </TableCell>
                        <TableCell>
                          <span
                            className={cn(
                              "inline-flex items-center gap-2 rounded-full px-2 py-1 text-xs font-medium",
                              typeMeta.badgeClass,
                            )}
                          >
                            <typeMeta.icon className="h-3.5 w-3.5" />
                            {typeMeta.label}
                          </span>
                        </TableCell>
                        <TableCell className="font-medium text-foreground">
                          {notification.title}
                          {highPriority ? (
                            <Badge variant="destructive" className="ml-2 rounded-full text-[10px] uppercase">
                              High priority
                            </Badge>
                          ) : null}
                        </TableCell>
                        <TableCell className="max-w-[280px] text-sm text-muted-foreground">
                          {notification.context}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {formatRelativeTime(notification.occurredAt)}
                        </TableCell>
                        <TableCell>
                          {notification.unread ? (
                            <Badge variant="secondary" className="rounded-full text-[10px] uppercase">
                              New
                            </Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">Read</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-primary"
                            onClick={() => handleOpenNotification(notification)}
                          >
                            Open <ArrowRight className="ml-1 h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </section>

      <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-sm text-muted-foreground">
          Showing {startItem}-{endItem} of {filteredNotifications.length} updates
        </div>
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                href="#"
                onClick={event => {
                  event.preventDefault();
                  setPage(currentPage === 1 ? currentPage : currentPage - 1);
                }}
                className={cn(currentPage === 1 && "pointer-events-none opacity-50")}
              />
            </PaginationItem>
            {Array.from({ length: totalPages }).map((_, index) => {
              const pageNumber = index + 1;
              return (
                <PaginationItem key={`page-${pageNumber}`}>
                  <PaginationLink
                    href="#"
                    isActive={pageNumber === currentPage}
                    onClick={event => {
                      event.preventDefault();
                      setPage(pageNumber);
                    }}
                  >
                    {pageNumber}
                  </PaginationLink>
                </PaginationItem>
              );
            })}
            <PaginationItem>
              <PaginationNext
                href="#"
                onClick={event => {
                  event.preventDefault();
                  setPage(currentPage === totalPages ? currentPage : currentPage + 1);
                }}
                className={cn(currentPage === totalPages && "pointer-events-none opacity-50")}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      </div>
    </div>
  );
};
