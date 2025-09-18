import { useMemo } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { mockApi } from '@/mocks/api';
import type { AppRole } from '@/mocks/types';
import { useToast } from '@/hooks/use-toast';
import { Check } from 'lucide-react';

const CAPABILITIES: Array<{ key: string; label: string }> = [
  { key: 'view_shipments', label: 'View shipments' },
  { key: 'manage_shipments', label: 'Create/Edit shipments' },
  { key: 'generate_docs', label: 'Generate docs' },
  { key: 'approve_docs', label: 'Approve docs' },
  { key: 'manage_costs', label: 'Manage costs' },
  { key: 'manage_issues', label: 'Manage issues' },
  { key: 'manage_settings', label: 'Manage settings' },
];

const ROLE_MATRIX: Record<AppRole, string[]> = {
  exporter_admin: CAPABILITIES.map(cap => cap.key),
  broker: ['view_shipments', 'manage_shipments', 'generate_docs', 'approve_docs', 'manage_issues'],
  finance: ['view_shipments', 'approve_docs', 'manage_costs'],
  viewer: ['view_shipments'],
};

const ROLE_LABELS: Record<AppRole, string> = {
  exporter_admin: 'Exporter admin',
  broker: 'Broker',
  finance: 'Finance',
  viewer: 'Viewer',
};

export const RolesUsersSettingsTab = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['app-users'],
    queryFn: () => mockApi.listUsers(),
  });

  const mutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: AppRole }) => mockApi.updateUserRole(userId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['app-users'] });
      toast({ title: 'Role updated', description: 'The change takes effect immediately.' });
    },
    onError: () => {
      toast({ title: 'Unable to update role', description: 'Please try again in a moment.', variant: 'destructive' });
    },
  });

  const roleOrder = useMemo(() => Object.keys(ROLE_MATRIX) as AppRole[], []);

  return (
    <div className="grid gap-6 lg:grid-cols-[3fr_2fr]">
      <Card>
        <CardHeader>
          <CardTitle>Role matrix</CardTitle>
          <CardDescription>Reference which responsibilities are enabled for each workspace role.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Capability</TableHead>
                  {roleOrder.map(role => (
                    <TableHead key={role}>{ROLE_LABELS[role]}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {CAPABILITIES.map(capability => (
                  <TableRow key={capability.key}>
                    <TableCell className="font-medium">{capability.label}</TableCell>
                    {roleOrder.map(role => (
                      <TableCell key={role} className="text-center">
                        {ROLE_MATRIX[role].includes(capability.key) ? (
                          <Check className="mx-auto h-4 w-4 text-[var(--brand-primary)]" aria-label="Allowed" />
                        ) : (
                          <span className="sr-only">Not allowed</span>
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Users</CardTitle>
          <CardDescription>Adjust roles to manage workspace responsibilities.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-10 w-36" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {users.map(user => (
                <div key={user.id} className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-3">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback className="bg-[var(--brand-primary)] text-[color:var(--brand-primary-contrast)]">
                        {user.name
                          .split(' ')
                          .map(part => part[0])
                          .join('')
                          .slice(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-semibold">{user.name}</p>
                      <p className="text-xs text-muted-foreground">{user.email}</p>
                      <Badge variant="secondary" className="mt-1 text-xs">
                        Joined {new Date(user.created_at).toLocaleDateString('en-GB')}
                      </Badge>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-medium text-muted-foreground" htmlFor={`role-${user.id}`}>
                      Role
                    </label>
                    <Select
                      value={user.role}
                      onValueChange={value => mutation.mutate({ userId: user.id, role: value as AppRole })}
                      disabled={mutation.isPending}
                    >
                      <SelectTrigger id={`role-${user.id}`} className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {roleOrder.map(role => (
                          <SelectItem key={role} value={role}>
                            {ROLE_LABELS[role]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
