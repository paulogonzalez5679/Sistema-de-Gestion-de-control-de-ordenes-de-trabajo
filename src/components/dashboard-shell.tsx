"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useState } from "react";
import type { ProfileRole } from "@/lib/types";
import { canManageAppSettings, canManageInventory, canManageServiceCatalog, canManageUsers } from "@/lib/roles";
import { ThemeToggle } from "@/components/theme-toggle";

const SIDEBAR_COLLAPSED_KEY = "luxe-sidebar-collapsed";

const catalogLink = { href: "/dashboard/services", label: "Catálogo", icon: "home_repair_service" };
const usersLink = { href: "/dashboard/users", label: "Usuarios", icon: "badge" };
const auditLink = { href: "/dashboard/audit", label: "Auditoría", icon: "fact_check" };
const settingsLink: NavLinkItem = { href: "/dashboard/settings", label: "Configuración", icon: "settings" };

type NavLinkItem = { href: string; label: string; icon: string };

const inventoryLink: NavLinkItem = { href: "/dashboard/inventory", label: "Inventario", icon: "inventory_2" };

const baseLinks: NavLinkItem[] = [
  { href: "/dashboard", label: "Panel", icon: "dashboard" },
  { href: "/dashboard/orders", label: "Órdenes", icon: "assignment" },
  { href: "/dashboard/clients", label: "Clientes", icon: "groups" },
  { href: "/dashboard/calendar", label: "Calendario", icon: "calendar_month" },
  { href: "/dashboard/notifications", label: "Notificaciones", icon: "notifications" }
];

const rewardsLink: NavLinkItem = { href: "/dashboard/rewards", label: "Recompensas", icon: "card_giftcard" };

function NavLinks({
  links,
  pathname,
  collapsed,
  onNavigate
}: {
  links: NavLinkItem[];
  pathname: string | null;
  collapsed: boolean;
  onNavigate?: () => void;
}) {
  return (
    <nav className="app-sidebar__nav" aria-label="Principal">
      {links.map((link) => {
        const isActive =
          pathname === link.href ||
          (link.href !== "/" &&
            link.href !== "/dashboard" &&
            pathname?.startsWith(`${link.href}/`));
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`app-sidebar__link ${isActive ? "app-sidebar__link--active" : ""}`}
            onClick={onNavigate}
            title={collapsed ? link.label : undefined}
          >
            <span className="material-symbols-outlined app-sidebar__icon" aria-hidden>
              {link.icon}
            </span>
            <span className={`app-sidebar__label ${collapsed ? "app-sidebar__label--collapsed" : ""}`}>
              {link.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}

export function DashboardShell({
  children,
  userRole,
  headerSlot
}: {
  children: React.ReactNode;
  userRole: ProfileRole | null;
  /** Contenido opcional a la derecha del título en la topbar (p. ej. cerrar sesión desde el layout). */
  headerSlot?: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  let links: NavLinkItem[] = [...baseLinks];
  if (canManageInventory(userRole)) links = [...links.slice(0, 3), inventoryLink, ...links.slice(3)];
  if (canManageServiceCatalog(userRole)) links = [...links, catalogLink];
  if (canManageUsers(userRole)) links = [...links, rewardsLink, usersLink, auditLink];
  if (canManageAppSettings(userRole)) links = [...links, settingsLink];

  useEffect(() => {
    setHydrated(true);
    try {
      const raw = window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
      if (raw === "1") setCollapsed(true);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  const toggleCollapsed = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!drawerOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setDrawerOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [drawerOpen]);

  useLayoutEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  const showCollapsed = hydrated && collapsed;

  return (
    <div className={`app-shell ${showCollapsed ? "app-shell--sidebar-collapsed" : ""}`}>
      <a href="#app-main-content" className="app-skip-link">
        Saltar al contenido
      </a>

      <aside
        className="app-sidebar app-sidebar--desktop"
        aria-label="Navegación lateral"
        data-collapsed={showCollapsed ? "true" : "false"}
      >
        <div className="app-sidebar__brand">
          <span className="app-sidebar__brand-mark">Kenzo</span>
          <span className="app-sidebar__brand-rest">Studio</span>
        </div>
        <p className={`app-sidebar__tagline ${showCollapsed ? "app-sidebar__tagline--hidden" : ""}`}>
          Centro de control
        </p>
        <NavLinks links={links} pathname={pathname} collapsed={showCollapsed} />
        <div className="app-sidebar__footer">
          <ThemeToggle />
          <button
            type="button"
            className="app-sidebar__collapse"
            onClick={toggleCollapsed}
            aria-expanded={!showCollapsed}
            aria-label={showCollapsed ? "Expandir barra lateral" : "Contraer barra lateral"}
          >
            <span className="material-symbols-outlined" aria-hidden>
              {showCollapsed ? "chevron_right" : "chevron_left"}
            </span>
          </button>
        </div>
      </aside>

      {drawerOpen ? (
        <button
          type="button"
          className="app-nav-drawer-backdrop"
          aria-label="Cerrar menú de navegación"
          onClick={() => setDrawerOpen(false)}
        />
      ) : null}

      <aside
        id="app-mobile-nav"
        className={`app-nav-drawer ${drawerOpen ? "app-nav-drawer--open" : ""}`}
        aria-hidden={!drawerOpen}
      >
        <div className="app-nav-drawer__head">
          <p className="app-nav-drawer__title">Menú</p>
          <button
            type="button"
            className="app-icon-btn"
            onClick={() => setDrawerOpen(false)}
            aria-label="Cerrar menú"
          >
            <span className="material-symbols-outlined" aria-hidden>
              close
            </span>
          </button>
        </div>
        <NavLinks
          links={links}
          pathname={pathname}
          collapsed={false}
          onNavigate={() => setDrawerOpen(false)}
        />
        <div className="app-nav-drawer__footer">
          <ThemeToggle />
        </div>
      </aside>

      <div className="app-shell__main-col">
        <header className="app-topbar">
          <div className="app-topbar__left">
            <button
              type="button"
              className="app-topbar__menu-btn app-icon-btn"
              aria-label="Abrir menú de navegación"
              aria-expanded={drawerOpen}
              aria-controls="app-mobile-nav"
              onClick={() => setDrawerOpen((o) => !o)}
            >
              <span className="material-symbols-outlined" aria-hidden>
                menu
              </span>
            </button>
            <button
              type="button"
              className="app-topbar__brand-btn"
              onClick={() => router.push("/dashboard")}
            >
              Kenzo Studio
            </button>
          </div>
          <div className="app-topbar__right">{headerSlot}</div>
        </header>

        <main id="app-main-content" className="app-main content" tabIndex={-1}>
          {children}
        </main>
      </div>
    </div>
  );
}
