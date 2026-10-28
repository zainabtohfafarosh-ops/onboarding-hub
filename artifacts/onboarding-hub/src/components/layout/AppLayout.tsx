import { Link, useLocation } from "wouter";
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarProvider,
  SidebarRail,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { 
  LayoutDashboard, 
  CalendarDays, 
  Users, 
  Mail, 
  FileText, 
  CheckSquare,
  RefreshCw,
  Plane,
  AlertTriangle,
  CalendarClock,
} from "lucide-react";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  return (
    <SidebarProvider>
      <div className="flex min-h-[100dvh] w-full bg-background">
        <Sidebar>
          <SidebarHeader className="flex items-center px-4 pt-8 pb-5 border-b">
            <div className="flex items-center gap-3 font-bold text-sidebar-foreground tracking-tight">
              <div className="size-11 bg-sidebar-primary rounded-lg flex items-center justify-center shrink-0">
                <Plane className="size-6 text-white" />
              </div>
              <span className="leading-snug text-base">Global Onboarding<br />Tracker</span>
            </div>
          </SidebarHeader>
          <SidebarContent className="pt-4">
            <SidebarGroup>
              <SidebarGroupLabel className="text-sm font-bold text-sidebar-foreground/70 uppercase tracking-wider px-2 mb-1">Overview</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location === "/"} className="font-semibold">
                      <Link href="/">
                        <LayoutDashboard className="size-4" />
                        <span>Dashboard</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/orientations")} className="font-semibold">
                      <Link href="/orientations">
                        <CalendarDays className="size-4" />
                        <span>Orientations</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/hires")} className="font-semibold">
                      <Link href="/hires">
                        <Users className="size-4" />
                        <span>All Hires</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
            
            <SidebarGroup>
              <SidebarGroupLabel className="text-sm font-bold text-sidebar-foreground/70 uppercase tracking-wider px-2 mb-1">Operations</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/upcoming-orientation-schedule")} className="font-semibold">
                      <Link href="/upcoming-orientation-schedule">
                        <CalendarClock className="size-4" />
                        <span>Orientation Schedule</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/scheduled-comms")} className="font-semibold">
                      <Link href="/scheduled-comms">
                        <Mail className="size-4" />
                        <span>Communications</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/overdue-actions")} className="font-semibold">
                      <Link href="/overdue-actions">
                        <AlertTriangle className="size-4" />
                        <span>Overdue Actions</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupLabel className="text-sm font-bold text-sidebar-foreground/70 uppercase tracking-wider px-2 mb-1">Configuration</SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/comm-templates")} className="font-semibold">
                      <Link href="/comm-templates">
                        <FileText className="size-4" />
                        <span>Comm Templates</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/task-templates")} className="font-semibold">
                      <Link href="/task-templates">
                        <CheckSquare className="size-4" />
                        <span>Task Templates</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/orientation-schedules")} className="font-semibold">
                      <Link href="/orientation-schedules">
                        <CalendarClock className="size-4" />
                        <span>Orientation Templates</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                  <SidebarMenuItem>
                    <SidebarMenuButton asChild isActive={location.startsWith("/sync")} className="font-semibold">
                      <Link href="/sync">
                        <RefreshCw className="size-4" />
                        <span>Data Sync</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
          <SidebarRail />
        </Sidebar>
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
