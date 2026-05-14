"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ProfileRole } from "@/lib/types";
import { canManageInventory } from "@/lib/roles";
import { createSupabaseBrowserClient } from "@/lib/supabase";

const HEADER_AVATAR =
  "https://lh3.googleusercontent.com/aida-public/AB6AXuDQsNZ8UkLXXyft2QCdKqm8voAe9tk2dQYqZg27pnWNU4LBvA6a6d_N56fJ7PUvtgxbUMFkrKPz-FkrGS4XNoZaqf-X-jxITgnrbdC0vkW9SZXhZF7CC9-NBJrdbJImnChalBoM1ar3Z2CvlM5ebfi2JCnspK0WvljqHzFqclHSJyKEcSkLoYDlvY1x1MrCNc0_fbZNS9Ay9PG7iAVaxfvpQyR4nhb6cVaqhp2aF9rJgt38D_gZFM6Maq3phjzBwKonn_BJUZWO64Qt";

export function DashboardHeaderActions({
  displayName,
  email,
  userRole
}: {
  displayName: string;
  email: string;
  userRole: ProfileRole | null;
}) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/notifications?unreadOnly=true&page=1&pageSize=1")
      .then((r) => r.json())
      .then((d: { total?: number }) => {
        if (cancelled) return;
        setUnread(typeof d.total === "number" ? d.total : 0);
      })
      .catch(() => {
        if (cancelled) return;
        setUnread(0);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [menuOpen]);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointer = (e: MouseEvent | TouchEvent) => {
      const el = wrapRef.current;
      if (!el || el.contains(e.target as Node)) return;
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    document.addEventListener("touchstart", onPointer);
    return () => {
      document.removeEventListener("mousedown", onPointer);
      document.removeEventListener("touchstart", onPointer);
    };
  }, [menuOpen]);

  const signOut = useCallback(async () => {
    const supabase = createSupabaseBrowserClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }, [router]);

  return (
    <div className="app-topbar-actions" ref={wrapRef}>
      <Link href="/dashboard/notifications" className="app-topbar-icon-btn" aria-label="Notificaciones" title="Notificaciones">
        <span className="material-symbols-outlined" aria-hidden>
          notifications
        </span>
        {unread > 0 ? <span className="app-topbar-badge" aria-label={`${unread} sin leer`} /> : null}
      </Link>
      {canManageInventory(userRole) ? (
        <Link href="/dashboard/inventory" className="app-topbar-icon-btn" aria-label="Inventario" title="Inventario">
          <span className="material-symbols-outlined" aria-hidden>
            inventory_2
          </span>
        </Link>
      ) : null}
      <div className="app-topbar-user">
        <button
          type="button"
          className="app-topbar-avatar-btn"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label="Menú de cuenta"
          onClick={() => setMenuOpen((o) => !o)}
        >
          <img src={HEADER_AVATAR} alt="" width={40} height={40} className="app-topbar-avatar-img" />
        </button>
        {menuOpen ? (
          <div className="app-topbar-user-menu" role="menu">
            <p className="app-topbar-user-menu-name">{displayName}</p>
            <p className="app-topbar-user-menu-email">{email}</p>
            <button type="button" className="app-topbar-user-menu-item" role="menuitem" onClick={() => void signOut()}>
              Cerrar sesión
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
