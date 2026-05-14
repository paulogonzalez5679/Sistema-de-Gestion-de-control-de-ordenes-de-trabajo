import type { DashboardSearchResponse } from "@/lib/dashboard-search-contract";
import { NextRequest } from "next/server";
import { internalError, ok } from "@/lib/api-response";
import { sanitizePostgrestSearchToken } from "@/lib/postgrest-search";
import { requirePermission } from "@/lib/permissions";
import { canManageInventory } from "@/lib/roles";
import { listClientsPage } from "@/modules/clients/client.service";
import { listInventoryPage } from "@/modules/inventory/inventory.service";
import { getOrdersEnrichedPage } from "@/modules/orders/order.service";
import { listProfilesPage } from "@/modules/profiles/profile.service";
import { listServicesMatching } from "@/modules/services/service.service";

const LIMIT = 8;

export async function GET(request: NextRequest) {
  try {
    const auth = await requirePermission("dashboard.global_search");
    if ("denied" in auth) return auth.denied;

    const raw = request.nextUrl.searchParams.get("q") ?? "";
    const safe = sanitizePostgrestSearchToken(raw);
    const empty: DashboardSearchResponse = {
      orders: [],
      clients: [],
      inventory: [],
      services: [],
      profiles: []
    };
    if (!safe) return ok(empty);

    const canInventory = canManageInventory(auth.profile.role);

    const [orderResult, clientsPage, invPage, svcRows, profilesPage] = await Promise.all([
      getOrdersEnrichedPage({
        limit: LIMIT,
        offset: 0,
        search: safe,
        assigneeUserId: auth.profile.role === "admin" ? undefined : auth.profile.id
      }),
      listClientsPage({ limit: LIMIT, offset: 0, search: safe }),
      canInventory
        ? listInventoryPage({ search: safe }, { limit: LIMIT, offset: 0 })
        : Promise.resolve({ items: [] as Awaited<ReturnType<typeof listInventoryPage>>["items"], total: 0 }),
      listServicesMatching(safe, LIMIT),
      listProfilesPage({ limit: LIMIT, offset: 0, search: safe })
    ]);

    const { rows: orderRows } = orderResult;
    const { clients } = clientsPage;
    const { profiles } = profilesPage;

    const payload: DashboardSearchResponse = {
      orders: orderRows.map((o) => ({
        id: o.id,
        order_number: o.order_number,
        subtitle: [o.client_name, o.vehicle_label].filter(Boolean).join(" · ") || "—"
      })),
      clients: clients.map((c) => ({
        id: c.id,
        full_name: c.full_name,
        subtitle: c.phone ?? c.email ?? null
      })),
      inventory: invPage.items.map((it) => ({
        id: it.id,
        name: it.name,
        sku: it.sku,
        subtitle: it.category ?? null
      })),
      services: svcRows.map((s) => ({ id: s.id, name: s.name })),
      profiles: profiles.map((p) => ({
        id: p.id,
        full_name: p.full_name,
        role: p.role
      }))
    };

    return ok(payload);
  } catch (error) {
    return internalError(error);
  }
}
