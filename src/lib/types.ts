export type DbUuid = string;

export type ProfileRole = "admin" | "manager" | "operator" | "detailer";
export type WorkOrderStatus =
  | "draft"
  | "assigned"
  | "in_progress"
  | "paused"
  | "pending_invoice"
  | "invoiced"
  | "cancelled";
export type WorkOrderPriority = "low" | "normal" | "high" | "urgent";
export type WorkOrderServiceStatus = "pending" | "in_progress" | "completed" | "skipped";
export type NotificationSeverity = "info" | "warning" | "error" | "success";
export type InventoryMovementType = "receive" | "issue" | "adjustment";

export type LoyaltyPointReason =
  | "order_completed"
  | "appointment_booked"
  | "admin_adjustment"
  | "redemption"
  | "catalog_redemption";

export interface Profile {
  id: DbUuid;
  full_name: string;
  email: string;
  role: ProfileRole;
  created_at: string;
  updated_at: string;
}

export interface Client {
  id: DbUuid;
  full_name: string;
  email: string | null;
  phone: string;
  /** Documento tal como lo ingresó el usuario; la unicidad se valida con `cedula_norm` en base de datos. */
  cedula: string | null;
  /** Solo lectura: dígitos normalizados (columna generada en Postgres). */
  cedula_norm?: string | null;
  is_verified: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Vehicle {
  id: DbUuid;
  client_id: DbUuid;
  make: string;
  model: string;
  year: number | null;
  color: string | null;
  plate: string;
  vin: string | null;
  mileage: number | null;
  car_registration_photo: string | null;
  created_at: string;
  updated_at: string;
}

export interface Service {
  id: DbUuid;
  name: string;
  description: string | null;
  base_price: number;
  estimated_minutes: number;
  is_bundle: boolean;
  is_active: boolean;
  /** Puntos de recompensa que aporta este servicio al completar una orden (sumados con el resto de líneas). */
  reward_points: number;
  created_at: string;
  updated_at: string;
}

export interface WorkOrder {
  id: DbUuid;
  order_number: string;
  client_id: DbUuid;
  vehicle_id: DbUuid;
  assigned_to: DbUuid | null;
  status: WorkOrderStatus;
  priority: WorkOrderPriority;
  scheduled_start: string | null;
  scheduled_end: string | null;
  check_in_at: string | null;
  completed_at: string | null;
  total_amount: number;
  discount_amount: number;
  notes: string | null;
  intake_condition_notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface WorkOrderService {
  id: DbUuid;
  work_order_id: DbUuid;
  service_id: DbUuid;
  price: number;
  status: WorkOrderServiceStatus;
  created_at: string;
  updated_at: string;
}

export interface WorkOrderProduct {
  id: DbUuid;
  work_order_id: DbUuid;
  item_id: DbUuid;
  quantity: number;
  unit_price: number;
  created_at: string;
  updated_at: string;
}

export interface Appointment {
  id: DbUuid;
  work_order_id: DbUuid;
  starts_at: string;
  ends_at: string;
  bay: string | null;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: DbUuid;
  work_order_id: DbUuid | null;
  user_id: DbUuid | null;
  title: string;
  body: string;
  severity: NotificationSeverity;
  is_read: boolean;
  created_at: string;
}

export interface WorkOrderUpdate {
  id: DbUuid;
  work_order_id: DbUuid;
  service_id: DbUuid | null;
  user_id: DbUuid | null;
  message: string;
  created_at: string;
}

export interface OrderImage {
  id: DbUuid;
  work_order_id: DbUuid;
  base64_data: string;
  caption: string | null;
  uploaded_by: DbUuid | null;
  created_at: string;
}

export interface AuditEvent {
  id: DbUuid;
  created_at: string;
  actor_id: DbUuid | null;
  action: string;
  entity_type: string | null;
  entity_id: DbUuid | null;
  work_order_id: DbUuid | null;
  summary: string;
  metadata: Record<string, unknown> | null;
}

export interface InventoryItem {
  id: DbUuid;
  name: string;
  sku: string;
  category: string;
  supplier: string;
  unit_cost: number;
  quantity: number;
  reorder_point: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface InventoryMovement {
  id: DbUuid;
  item_id: DbUuid;
  work_order_id: DbUuid | null;
  movement_type: InventoryMovementType;
  quantity_delta: number;
  reason: string | null;
  created_by: DbUuid | null;
  created_at: string;
}

export interface LoyaltyReward {
  id: DbUuid;
  title: string;
  description: string | null;
  points_required: number;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

/** Prioridad del modal en nueva orden: servicio gratis (500) antes que catálogo. */
export type PendingRewardModalPayload = { kind: "free_service" } | { kind: "catalog"; reward: LoyaltyReward };

export interface ClientRedemptionStatus {
  balance: number;
  lastRedemptionAt: string | null;
  canRedeemToday: boolean;
  redeemableCatalog: LoyaltyReward[];
  pendingModal: PendingRewardModalPayload | null;
}

export interface ClientLoyalty {
  client_id: DbUuid;
  points: number;
  /** Último canje (servicio gratis o catálogo); máximo un canje por día (zona America/Guayaquil). */
  last_redemption_at: string | null;
  updated_at: string;
}

export interface LoyaltyPointEvent {
  id: DbUuid;
  client_id: DbUuid;
  points_delta: number;
  reason: LoyaltyPointReason;
  idempotency_key: string;
  work_order_id: DbUuid | null;
  appointment_id: DbUuid | null;
  metadata: Record<string, unknown>;
  created_at: string;
}
