// src/components/dashboard/layout/DashboardSidebar.tsx
"use client";

import { cn } from "@/lib/utils";
import {
  BookOpen, Box, ChevronRight,
  FolderTree, Home, Mail, Shield, TrendingUp
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

type Role = "SUPER_ADMIN" | "ADMIN" | "USER";

interface NavItem {
  href:  string;
  label: string;
  icon:  React.ReactNode;
  roles: Role[];
  group: "common" | "admin" | "superadmin";
}

const NAV_ITEMS: NavItem[] = [
  // ── Common ───────────────────────────────────────────────────────────────
  {
    href:  "/dashboard",
    label: "Overview",
    icon:  <Home className="h-5 w-5" />,
    roles: ["USER", "ADMIN", "SUPER_ADMIN"],
    group: "common",
  },

  // ── Admin only (SUPER_ADMIN manages via superadmin routes instead) ────────
  {
    href:  "/dashboard/admin/content",
    label: "Content",
    icon:  <BookOpen className="h-5 w-5" />,
    roles: ["ADMIN"],
    group: "admin",
  },
  // {
  //   href:  "/dashboard/admin/resources",
  //   label: "Resources",
  //   icon:  <FileText className="h-5 w-5" />,
  //   roles: ["ADMIN"],
  //   group: "admin",
  // },
  {
    href:  "/dashboard/admin/categories",
    label: "Categories",
    icon:  <FolderTree className="h-5 w-5" />,
    roles: ["ADMIN"],
    group: "admin",
  },
  {
    href:  "/dashboard/admin/story-submissions",
    label: "Story Submissions",
    icon:  <TrendingUp className="h-5 w-5" />,
    roles: ["ADMIN"],
    group: "admin",
  },
  {
    href:  "/dashboard/admin/contact-submissions",
    label: "Contact Messages",
    icon:  <Mail className="h-5 w-5" />,
    roles: ["ADMIN"],
    group: "admin",
  },

    {
    href:  "/dashboard/admin/banner",
    label: "Banner",
    icon:  <Box className="h-5 w-5" />,
    roles: ["ADMIN"],
    group: "admin",
  },

  // ── Super Admin ───────────────────────────────────────────────────────────
  {
    href:  "/dashboard/superadmin/admins",
    label: "Admin Management",
    icon:  <Shield className="h-5 w-5" />,
    roles: ["SUPER_ADMIN"],
    group: "superadmin",
  },
  // {
  //   href:  "/dashboard/superadmin/users",
  //   label: "User Management",
  //   icon:  <Users className="h-5 w-5" />,
  //   roles: ["SUPER_ADMIN"],
  //   group: "superadmin",
  // },
  // {
  //   href:  "/dashboard/superadmin/analytics",
  //   label: "Analytics",
  //   icon:  <BarChart3 className="h-5 w-5" />,
  //   roles: ["SUPER_ADMIN"],
  //   group: "superadmin",
  // },
];

const GROUP_LABELS: Record<string, string> = {
  common:     "",
  admin:      "Administration",
  superadmin: "Super Admin",
};

const ROLE_PANEL: Record<Role, { title: string; description: string }> = {
  SUPER_ADMIN: {
    title:       "Super Admin Panel",
    description: "Full platform control: users, admins, content, and system config.",
  },
  ADMIN: {
    title:       "Administration",
    description: "Manage content, categories, and review community submissions.",
  },
  USER: {
    title:       "User Panel",
    description: "Access your dashboard, profile, and settings.",
  },
};

interface DashboardSidebarProps {
  role: string;
}

export default function DashboardSidebar({ role }: DashboardSidebarProps) {
  const pathname = usePathname();

  const filtered = NAV_ITEMS.filter((item) => item.roles.includes(role as Role));

  const groups = (["common", "admin", "superadmin"] as const)
    .map((g) => ({ name: g, items: filtered.filter((i) => i.group === g) }))
    .filter((g) => g.items.length > 0);

  const panel = ROLE_PANEL[role as Role] ?? ROLE_PANEL.USER;

  return (
    <aside className="w-64 bg-card border-r border-border min-h-[calc(100vh-4rem)] flex flex-col">
      <nav className="p-4 flex-1 space-y-5">
        {groups.map(({ name, items }) => (
          <div key={name}>
            {/* Group label */}
            {GROUP_LABELS[name] && (
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-widest px-3 mb-1">
                {GROUP_LABELS[name]}
              </p>
            )}
            <div className="space-y-1">
              {items.map((item) => {
                const isActive =
                  item.href === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname === item.href || pathname.startsWith(item.href + "/");

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cn(
                      "group flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-all duration-200",
                      isActive
                        ? "bg-gradient-to-r from-primary/10 to-primary/5 text-primary border-l-4 border-primary"
                        : "text-muted-foreground hover:bg-secondary/20 hover:text-foreground hover:border-l-4 hover:border-secondary"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <span className={cn(
                        "transition-colors",
                        isActive ? "text-primary" : "group-hover:text-foreground"
                      )}>
                        {item.icon}
                      </span>
                      <span className="text-sm font-medium">{item.label}</span>
                    </div>
                    <ChevronRight className={cn(
                      "h-4 w-4 transition-all duration-200",
                      isActive
                        ? "text-primary translate-x-1 opacity-100"
                        : "opacity-0 group-hover:opacity-100"
                    )} />
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* Role info panel */}
      <div className="mx-4 mb-4 p-4 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-xl border border-border">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
          {panel.title}
        </p>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {panel.description}
        </p>
      </div>
    </aside>
  );
}