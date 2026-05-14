import {
  AdminMissionDashboard,
  type AdminMissionArrival,
  type AdminMissionBayJob
} from "@/components/admin-mission-dashboard";
import { OperatorDashboardPanel } from "@/components/operator-dashboard-panel";
import { getAllInventory } from "@/modules/inventory/inventory.service";
import { getProfileByUserId, getAllProfiles } from "@/modules/profiles/profile.service";
import { getAllOrders, getOrderServices, listAppointments } from "@/modules/orders/order.service";
import { getAllServices } from "@/modules/services/service.service";
import { getAllVehicles } from "@/modules/vehicles/vehicle.service";
import { countsTowardCompletionRate } from "@/lib/order-workflow";
import { canManageInventory, isManagementRole } from "@/lib/roles";
import type { Vehicle, WorkOrder, WorkOrderService } from "@/lib/types";
import { createSupabaseServerClient } from "@/lib/supabase-server";

function isSameLocalDay(iso: string | null, ref: Date): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  return (
    d.getFullYear() === ref.getFullYear() &&
    d.getMonth() === ref.getMonth() &&
    d.getDate() === ref.getDate()
  );
}

function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

const ACCENTS: AdminMissionBayJob["accent"][] = ["purple", "cyan", "lime"];

export default async function DashboardPage() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const profile = user ? await getProfileByUserId(user.id) : null;

  const orders = await (async (): Promise<WorkOrder[]> => {
    if (!profile) return [];
    if (profile.role === "admin") return getAllOrders();
    return getAllOrders(undefined, undefined, { assigneeUserId: profile.id });
  })();

  if (!profile) {
    return (
      <OperatorDashboardPanel
        displayName=""
        activeInBayCount={0}
        assignedQueueCount={0}
        completionRate={0}
        assignedOrdersPreview={[]}
      />
    );
  }

  const administrative = isManagementRole(profile.role);

  const activeInBayCount = orders.filter((order) => order.status === "in_progress").length;
  const assignedQueueCount = orders.filter((order) => order.status === "assigned").length;
  const assignedOrdersPreview = orders.filter((order) => order.status === "assigned").slice(0, 8);
  const completionRate = orders.length
    ? Math.round((orders.filter((order) => countsTowardCompletionRate(order.status)).length / orders.length) * 100)
    : 0;

  if (!administrative) {
    return (
      <OperatorDashboardPanel
        displayName={profile.full_name}
        activeInBayCount={activeInBayCount}
        assignedQueueCount={assignedQueueCount}
        completionRate={completionRate}
        assignedOrdersPreview={assignedOrdersPreview}
      />
    );
  }

  const vehicles = await getAllVehicles();

  const now = new Date();
  const yesterday = addDays(now, -1);

  const completedToday = orders.filter(
    (o) => countsTowardCompletionRate(o.status) && isSameLocalDay(o.completed_at, now)
  );
  const completedYesterday = orders.filter(
    (o) => countsTowardCompletionRate(o.status) && isSameLocalDay(o.completed_at, yesterday)
  );

  const todayRevenue = completedToday.reduce((acc, o) => acc + Number(o.total_amount ?? 0), 0);
  const yesterdayRevenue = completedYesterday.reduce((acc, o) => acc + Number(o.total_amount ?? 0), 0);
  const revenueDeltaPct =
    yesterdayRevenue > 0 ? Math.round(((todayRevenue - yesterdayRevenue) / yesterdayRevenue) * 100) : null;

  const vehiclesCompletedToday = completedToday.length;
  const queuedAssigned = orders.filter((o) => o.status === "assigned").length;

  const appointments = await listAppointments(
    undefined,
    undefined,
    profile.role === "admin" ? undefined : { assigneeUserId: profile.id }
  );
  const activeAppointmentsNow = appointments.filter((a) => {
    const s = new Date(a.starts_at);
    const e = new Date(a.ends_at);
    return now >= s && now <= e;
  }).length;

  const appointmentsTodayTotal = appointments.filter((a) => isSameLocalDay(a.starts_at, now)).length;
  const inBayNow = orders.filter((o) => o.status === "in_progress").length;

  const inventoryAdmin = Boolean(profile?.role && canManageInventory(profile.role));
  const lowStockItems = inventoryAdmin ? (await getAllInventory({ stockStatus: "low_stock" })).slice(0, 6) : [];

  const upcomingSorted = appointments
    .filter((a) => new Date(a.starts_at) > now)
    .sort((a, b) => new Date(a.starts_at).getTime() - new Date(b.starts_at).getTime())
    .slice(0, 4);

  const vehicleMap = new Map(vehicles.map((v) => [v.id, v]));
  const [services, profiles] = await Promise.all([getAllServices(), getAllProfiles()]);
  const serviceMap = new Map(services.map((s) => [s.id, s.name]));

  function vehicleTitle(v: Vehicle): string {
    const y = v.year ? `${v.year} ` : "";
    return `${y}${v.make} ${v.model}`.trim();
  }

  const nextArrivals: AdminMissionArrival[] = upcomingSorted.map((a, i) => {
    const order = orders.find((o) => o.id === a.work_order_id);
    const v = order ? vehicleMap.get(order.vehicle_id) : undefined;
    const time = new Date(a.starts_at).toLocaleTimeString("es", { hour: "2-digit", minute: "2-digit" });
    const title = v ? `${time} — ${vehicleTitle(v)}` : `${time} — Orden`;
    const subtitle = order?.order_number ? `Orden ${order.order_number}` : "Cita programada";
    return {
      id: a.id,
      label: title,
      subtitle,
      dotClass: i === 0 ? "cyan" : "muted"
    };
  });

  const inProgressOrders = orders.filter((o) => o.status === "in_progress").slice(0, 4);
  const profilesMap = new Map(profiles.map((p) => [p.id, p.full_name]));

  const servicesByOrder = await Promise.all(
    inProgressOrders.map(async (order) => {
      const list = await getOrderServices(order.id);
      return { order, services: list };
    })
  );

  const bayJobs: AdminMissionBayJob[] = servicesByOrder.map(({ order, services: wos }, idx) => {
    const v = vehicleMap.get(order.vehicle_id);
    const appt = appointments.find((a) => a.work_order_id === order.id);
    const bay = appt?.bay?.trim();
    const bayLabel = bay ? `BAHÍA ${bay}` : "TALLER";

    const pending = wos.filter((s: WorkOrderService) => s.status !== "completed");
    const nextSvc = pending[0];
    const stageLabel = nextSvc ? serviceMap.get(nextSvc.service_id) ?? "Servicios" : "Finalizando";

    const total = wos.length || 1;
    const done = wos.filter((s: WorkOrderService) => s.status === "completed").length;
    const progressPct = Math.min(100, Math.round((done / total) * 100));

    const techName = order.assigned_to ? profilesMap.get(order.assigned_to) ?? "Equipo" : "Sin asignar";

    return {
      orderId: order.id,
      orderNumber: order.order_number,
      vehicleTitle: v ? vehicleTitle(v) : "Vehículo",
      plate: v?.plate ?? "—",
      bayLabel,
      stageLabel,
      progressPct,
      techLabel: `Téc.: ${techName}`,
      estFinish: order.scheduled_end,
      accent: ACCENTS[idx % ACCENTS.length]
    };
  });

  return (
    <AdminMissionDashboard
      todayRevenue={todayRevenue}
      revenueDeltaPct={revenueDeltaPct}
      activeAppointmentsNow={activeAppointmentsNow}
      appointmentsTodayTotal={appointmentsTodayTotal}
      inBayNow={inBayNow}
      vehiclesCompletedToday={vehiclesCompletedToday}
      awaitingPickup={queuedAssigned}
      showInventoryPanel={inventoryAdmin}
      lowStockItems={lowStockItems}
      nextArrivals={nextArrivals}
      bayJobs={bayJobs}
    />
  );
}
