// Coming soon page for placeholder routes

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Construction } from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';

const pageDescriptions: Record<string, { title: string; description: string }> = {
  '/shipments': {
    title: 'Shipments Management',
    description: 'Create, track, and manage your export shipments with automated compliance checking and document generation.',
  },
  '/hs': {
    title: 'HS Code Classification',
    description: 'Search and classify products using HS codes with automated tariff and duty calculations.',
  },
  '/documents': {
    title: 'Documents Center',
    description: 'Generate, manage, and track all your export compliance documents including invoices, certificates, and permits.',
  },
  '/issues': {
    title: 'Issues & Alerts',
    description: 'Monitor compliance issues, missing documents, and regulatory alerts across all your shipments.',
  },
  '/reports': {
    title: 'Reports & Analytics',
    description: 'Comprehensive reporting on export performance, compliance metrics, and cost analysis.',
  },
  '/settings': {
    title: 'Settings & Configuration',
    description: 'Configure your account, manage users, set up compliance rules, and customize your workspace.',
  },
};

export const ComingSoonPage = () => {
  const location = useLocation();
  const pageInfo = pageDescriptions[location.pathname] || {
    title: 'Feature',
    description: 'This feature is currently under development.',
  };

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 p-3 bg-muted rounded-2xl w-fit">
            <Construction className="h-8 w-8 text-muted-foreground" />
          </div>
          <CardTitle className="text-2xl">{pageInfo.title}</CardTitle>
          <CardDescription className="text-center">
            Coming soon
          </CardDescription>
        </CardHeader>
        <CardContent className="text-center space-y-4">
          <p className="text-muted-foreground">
            {pageInfo.description}
          </p>
          <p className="text-sm text-muted-foreground">
            This feature is currently under development and will be available soon.
          </p>
          <Button asChild className="w-full">
            <Link to="/app">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Dashboard
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};