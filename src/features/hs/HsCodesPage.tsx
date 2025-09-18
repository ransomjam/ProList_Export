// HS Codes Browser Page

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Search, FileBarChart, Plus } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { mockApi } from '@/mocks/api';
import { abbrHs } from '@/utils/hs';
import { HsDetailsDrawer } from './components/HsDetailsDrawer';
import { HsQuickPicker } from './components/HsQuickPicker';
import type { HsCode } from '@/mocks/seeds';

export const HsCodesPage = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedHs, setSelectedHs] = useState<HsCode | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isPickerOpen, setIsPickerOpen] = useState(false);

  const { data: hsCodes, isLoading } = useQuery({
    queryKey: ['hs-codes', searchQuery],
    queryFn: () => searchQuery ? mockApi.searchHs(searchQuery) : mockApi.listHs(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const handleDetailsClick = (hsCode: HsCode) => {
    setSelectedHs(hsCode);
    setIsDetailsOpen(true);
  };

  const handleUseInShipment = (hsCode: HsCode) => {
    setSelectedHs(hsCode);
    setIsPickerOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight">HS Codes</h1>
        <p className="text-muted-foreground mt-1">
          Browse and estimate duties for harmonised system codes
        </p>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search HS codes or descriptions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Results Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>HS Codes Database</CardTitle>
              <CardDescription>
                {hsCodes?.length ? `Found ${hsCodes.length} codes` : 'Loading...'}
              </CardDescription>
            </div>
            <Button 
              onClick={() => setIsPickerOpen(true)}
              size="sm"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add to Shipment
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>HS Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>UoM</TableHead>
                  <TableHead>Default Duty</TableHead>
                  <TableHead>Saved Duty</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hsCodes?.map((hsCode) => (
                  <HsCodeRow
                    key={hsCode.code}
                    hsCode={hsCode}
                    onDetailsClick={() => handleDetailsClick(hsCode)}
                    onUseInShipment={() => handleUseInShipment(hsCode)}
                  />
                ))}
                {!hsCodes?.length && !isLoading && (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No HS codes found matching your search.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Drawers */}
      <HsDetailsDrawer
        hsCode={selectedHs}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
        onAddAsProduct={() => {
          setIsDetailsOpen(false);
          setIsPickerOpen(true);
        }}
      />

      <HsQuickPicker
        prefilledHs={selectedHs}
        isOpen={isPickerOpen}
        onClose={() => {
          setIsPickerOpen(false);
          setSelectedHs(null);
        }}
        onProductCreated={(product) => {
          console.log('Product created:', product);
          setIsPickerOpen(false);
          setSelectedHs(null);
        }}
      />
    </div>
  );
};

const HsCodeRow = ({ 
  hsCode, 
  onDetailsClick, 
  onUseInShipment 
}: { 
  hsCode: HsCode;
  onDetailsClick: () => void;
  onUseInShipment: () => void;
}) => {
  const { data: savedRate } = useQuery({
    queryKey: ['saved-hs-rate', hsCode.code],
    queryFn: () => mockApi.getSavedHsRate(hsCode.code),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });

  return (
    <TableRow>
      <TableCell className="font-mono">
        {abbrHs(hsCode.code)}
      </TableCell>
      <TableCell className="max-w-xs">
        <div className="truncate" title={hsCode.description}>
          {hsCode.description}
        </div>
      </TableCell>
      <TableCell>
        <Badge variant="outline">{hsCode.uom}</Badge>
      </TableCell>
      <TableCell>
        {hsCode.defaultDutyRate}%
      </TableCell>
      <TableCell>
        {savedRate ? (
          <Badge variant="secondary">{savedRate.ratePct}%</Badge>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>
      <TableCell>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={onDetailsClick}
          >
            <FileBarChart className="mr-1 h-3 w-3" />
            Details
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={onUseInShipment}
          >
            <Plus className="mr-1 h-3 w-3" />
            Use
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
};