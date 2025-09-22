import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { mockApi } from "@/mocks/api";
import type { NotificationItem, NotificationPreferences } from "@/mocks/types";

interface MarkReadPayload {
  id: string;
  read: boolean;
}

export const useNotifications = () => {
  const queryClient = useQueryClient();

  const notificationsQuery = useQuery<NotificationItem[]>({
    queryKey: ["notifications"],
    queryFn: () => mockApi.getNotifications(),
  });

  const preferencesQuery = useQuery<NotificationPreferences>({
    queryKey: ["notification-preferences"],
    queryFn: () => mockApi.getNotificationPreferences(),
  });

  const markReadMutation = useMutation({
    mutationFn: ({ id, read }: MarkReadPayload) => mockApi.markNotificationRead(id, read),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const markAllMutation = useMutation({
    mutationFn: () => mockApi.markAllNotificationsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (ids: string[]) => mockApi.deleteNotifications(ids),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: (preferences: NotificationPreferences) => mockApi.updateNotificationPreferences(preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });

  const unreadCount = useMemo(
    () => (notificationsQuery.data ?? []).filter(notification => notification.unread).length,
    [notificationsQuery.data],
  );

  return {
    notifications: notificationsQuery.data ?? [],
    isLoading: notificationsQuery.isLoading,
    preferences: preferencesQuery.data,
    preferencesLoading: preferencesQuery.isLoading,
    unreadCount,
    markRead: markReadMutation.mutateAsync,
    markAllRead: markAllMutation.mutateAsync,
    deleteNotifications: deleteMutation.mutateAsync,
    updatePreferences: updatePreferencesMutation.mutateAsync,
    isMarkingAll: markAllMutation.isPending,
    isMarking: markReadMutation.isPending,
    isDeleting: deleteMutation.isPending,
    isUpdatingPreferences: updatePreferencesMutation.isPending,
  };
};
