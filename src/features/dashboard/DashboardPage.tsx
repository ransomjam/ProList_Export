// Main dashboard page

import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { KpiCard } from '@/components/dashboard/KpiCard';
import { ShipmentsTable } from '@/components/dashboard/ShipmentsTable';
import { mockApi } from '@/mocks/api';
import { Plus, Upload, AlertTriangle, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useNavigate } from 'react-router-dom';

export const DashboardPage = () => {
  const navigate = useNavigate();
  // Fetch KPIs
  const { 
    data: kpis, 
    isLoading: kpisLoading, 
    error: kpisError,
    refetch: refetchKpis 
  } = useQuery({
    queryKey: ['kpis'],
    queryFn: mockApi.getKpis,
  });

  // Fetch shipments
  const { 
    data: shipments, 
    isLoading: shipmentsLoading, 
    error: shipmentsError,
    refetch: refetchShipments 
  } = useQuery({
    queryKey: ['shipments'],
    queryFn: () => mockApi.listShipments(),
  });

  const handleRefresh = () => {
    refetchKpis();
    refetchShipments();
  };

  const handleNewShipment = () => {
    navigate('/shipments/new');
  };

  const handleUploadDocument = () => {
    navigate('/documents');
  };

  const handleOpenIssues = () => {
    navigate('/issues');
  };

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Overview & recent activity</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleRefresh}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpisLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-20" />
                    <Skeleton className="h-8 w-16" />
                  </div>
                  <Skeleton className="h-12 w-12 rounded-2xl" />
                </div>
                <Skeleton className="h-6 w-24 mt-4" />
              </CardContent>
            </Card>
          ))
        ) : kpisError ? (
          <div className="col-span-full">
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Failed to load KPIs. Please try refreshing the page.
              </AlertDescription>
            </Alert>
          </div>
        ) : (
          kpis?.map((kpi) => (
            <KpiCard key={kpi.label} kpi={kpi} />
          ))
        )}
      </div>

      {/* Quick Actions */}
      <Card>
        <CardContent className="p-6">
          <h3 className="font-semibold text-foreground mb-4">Quick Actions</h3>
          <TooltipProvider>
            <div className="flex flex-wrap gap-3">
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button onClick={handleNewShipment} className="flex-1 sm:flex-none">
                    <Plus className="mr-2 h-4 w-4" />
                    New Shipment
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Start a new export shipment</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={handleUploadDocument}
                    className="flex-1 sm:flex-none"
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Document
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Jump to the documents workspace</p>
                </TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="outline"
                    onClick={handleOpenIssues}
                    className="flex-1 sm:flex-none"
                  >
                    <AlertTriangle className="mr-2 h-4 w-4" />
                    Open Issues
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Review outstanding compliance issues</p>
                </TooltipContent>
              </Tooltip>
            </div>
          </TooltipProvider>
        </CardContent>
      </Card>

      {/* Recent Shipments */}
      {shipmentsLoading ? (
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              <Skeleton className="h-8 w-48" />
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="flex items-center space-x-4">
                    <Skeleton className="h-12 w-full" />
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      ) : shipmentsError ? (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            Failed to load shipments. Please try refreshing the page.
          </AlertDescription>
        </Alert>
      ) : (
        <ShipmentsTable shipments={shipments || []} />
      )}
    </div>
  );
};