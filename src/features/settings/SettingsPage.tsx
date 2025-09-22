import { useEffect, useMemo, useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { OrganisationSettingsTab } from './components/OrganisationSettingsTab';
import { BrandingSettingsTab } from './components/BrandingSettingsTab';
import { TemplatesSettingsTab } from './components/TemplatesSettingsTab';
import { RolesUsersSettingsTab } from './components/RolesUsersSettingsTab';
import { WorkspaceSettingsTab } from './components/WorkspaceSettingsTab';
import { NotificationsSettingsTab } from './components/NotificationsSettingsTab';
import { useSearchParams } from 'react-router-dom';

const SETTINGS_TABS = [
  { value: 'organisation', label: 'Organisation' },
  { value: 'branding', label: 'Branding' },
  { value: 'templates', label: 'Templates' },
  { value: 'roles', label: 'Roles & Users' },
  { value: 'workspace', label: 'Workspace' },
  { value: 'notifications', label: 'Notifications' },
] as const;

type SettingsTabValue = (typeof SETTINGS_TABS)[number]['value'];

export const SettingsPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = useMemo(() => {
    const param = searchParams.get('tab');
    return SETTINGS_TABS.some(tab => tab.value === param)
      ? (param as SettingsTabValue)
      : 'organisation';
  }, [searchParams]);
  const [activeTab, setActiveTab] = useState<SettingsTabValue>(initialTab);

  useEffect(() => {
    setActiveTab(initialTab);
  }, [initialTab]);

  const handleTabChange = (value: SettingsTabValue) => {
    setActiveTab(value);
    setSearchParams({ tab: value });
  };

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage organisation, branding, templates, and workspace.
        </p>
      </header>

      <Tabs value={activeTab} onValueChange={value => handleTabChange(value as SettingsTabValue)}>
        <TabsList className="flex flex-wrap justify-start gap-2 rounded-full bg-muted/60 p-1">
          {SETTINGS_TABS.map(tab => (
            <TabsTrigger
              key={tab.value}
              value={tab.value}
              className="rounded-full px-4 py-2 text-sm font-medium data-[state=active]:bg-background data-[state=active]:text-foreground"
            >
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="organisation" className="mt-6">
          <OrganisationSettingsTab />
        </TabsContent>
        <TabsContent value="branding" className="mt-6">
          <BrandingSettingsTab />
        </TabsContent>
        <TabsContent value="templates" className="mt-6">
          <TemplatesSettingsTab />
        </TabsContent>
        <TabsContent value="roles" className="mt-6">
          <RolesUsersSettingsTab />
        </TabsContent>
        <TabsContent value="workspace" className="mt-6">
          <WorkspaceSettingsTab />
        </TabsContent>
        <TabsContent value="notifications" className="mt-6">
          <NotificationsSettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
};
