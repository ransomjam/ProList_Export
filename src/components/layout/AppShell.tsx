// App shell with sidebar and header for authenticated pages

import { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { 
  Sidebar, 
  SidebarContent, 
  SidebarGroup, 
  SidebarGroupContent, 
  SidebarGroupLabel, 
  SidebarMenu, 
  SidebarMenuButton, 
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar 
} from '@/components/ui/sidebar';
import { 
  LayoutDashboard, 
  Package, 
  Hash, 
  FileText, 
  AlertTriangle, 
  BarChart3, 
  Settings, 
  Search,
  User,
  LogOut,
  Menu
} from 'lucide-react';
import { useAuthStore } from '@/stores/auth';
import { NavLink } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useQuery } from '@tanstack/react-query';
import { mockApi } from '@/mocks/api';

const sidebarItems = [
  { title: 'Dashboard', url: '/app', icon: LayoutDashboard, active: true },
  { title: 'Shipments', url: '/shipments', icon: Package, disabled: false },
  { title: 'HS Codes', url: '/hs', icon: Hash, disabled: false },
  { title: 'Documents', url: '/documents', icon: FileText, disabled: true },
  { title: 'Issues', url: '/issues', icon: AlertTriangle, disabled: true },
  { title: 'Reports', url: '/reports', icon: BarChart3, disabled: true },
  { title: 'Settings', url: '/settings', icon: Settings, disabled: false },
];

const AppSidebar = () => {
  const { state } = useSidebar();
  const location = useLocation();
  const collapsed = state === 'collapsed';
  const { data: orgSettings } = useQuery({
    queryKey: ['org-settings'],
    queryFn: () => mockApi.getOrgSettings(),
  });

  const isActive = (path: string) => location.pathname === path;

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className={collapsed ? "sr-only" : ""}>
            {orgSettings?.name ?? 'ProList'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {sidebarItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <SidebarMenuButton 
                          asChild={!item.disabled}
                          disabled={item.disabled}
                          className={`${isActive(item.url) ? 'bg-sidebar-accent text-sidebar-accent-foreground' : ''} ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-sidebar-hover'}`}
                        >
                          {item.disabled ? (
                            <div>
                              <item.icon className="mr-2 h-4 w-4" />
                              {!collapsed && <span>{item.title}</span>}
                            </div>
                          ) : (
                            <NavLink to={item.url} className="flex items-center">
                              <item.icon className="mr-2 h-4 w-4" />
                              {!collapsed && <span>{item.title}</span>}
                            </NavLink>
                          )}
                        </SidebarMenuButton>
                      </TooltipTrigger>
                      {item.disabled && (
                        <TooltipContent>
                          <p>Coming soon</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </TooltipProvider>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export const AppShell = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const { data: orgSettings } = useQuery({
    queryKey: ['org-settings'],
    queryFn: () => mockApi.getOrgSettings(),
  });

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // User is guaranteed to exist here because of ProtectedRoute wrapper
  if (!user) {
    return null; // Fallback safety check
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="h-14 flex items-center justify-between px-4 border-b border-border bg-background/95 backdrop-blur-sm">
            <div className="flex items-center gap-4">
              <SidebarTrigger />
              <div className="flex min-w-0 items-center gap-3">
                {orgSettings?.logoDataUrl && (
                  <img
                    src={orgSettings.logoDataUrl}
                    alt={`${orgSettings.name ?? 'Organisation'} logo`}
                    className="h-8 w-8 rounded-xl object-contain"
                  />
                )}
                <span className="max-w-[200px] truncate text-lg font-semibold text-foreground">
                  {orgSettings?.name ?? 'ProList'}
                </span>
              </div>

              {/* Search */}
              <div className="relative hidden md:block">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Quick search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 w-80"
                  disabled
                />
              </div>
            </div>

            {/* User Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary text-primary-foreground">
                      {user.name.split(' ').map(n => n[0]).join('')}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden md:block text-left">
                    <div className="text-sm font-medium">{user.name}</div>
                    <Badge variant="secondary" className="text-xs">
                      {user.role.replace('_', ' ')}
                    </Badge>
                  </div>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div>
                    <div>{user.name}</div>
                    <div className="text-xs text-muted-foreground">{user.email}</div>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem disabled>
                  <User className="mr-2 h-4 w-4" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuItem disabled>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </header>

          {/* Main Content */}
          <main className="flex-1 p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};