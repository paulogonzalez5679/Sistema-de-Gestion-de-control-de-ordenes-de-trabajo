import type { ProfileRole, Service, WorkOrderService } from "@/lib/types";
import { canViewServicePricing } from "@/lib/roles";
import { getServiceById } from "@/modules/services/service.service";

export { canViewServicePricing };

export function redactServicePricing<T extends Pick<Service, "base_price">>(
  service: T,
  role: ProfileRole | null | undefined
): Omit<T, "base_price"> {
  if (canViewServicePricing(role)) return service;
  const { base_price: _removed, ...rest } = service;
  return rest;
}

export function redactServicesPricing(services: Service[], role: ProfileRole | null | undefined): Service[] {
  if (canViewServicePricing(role)) return services;
  return services.map((service) => redactServicePricing(service, role) as Service);
}

export function redactWorkOrderServicePricing<T extends Pick<WorkOrderService, "price">>(
  line: T,
  role: ProfileRole | null | undefined
): Omit<T, "price"> {
  if (canViewServicePricing(role)) return line;
  const { price: _removed, ...rest } = line;
  return rest;
}

/**
 * Persiste montos de servicios desde el catálogo (base_price), sin confiar en el cliente.
 * Manager, operador y detailer no ven precios en UI, pero la orden queda con los valores
 * reales para que el admin facture después.
 */
export async function resolveServiceLinePricesFromCatalog(
  lines: Array<{ service_id: string; price?: number }>
): Promise<Array<{ service_id: string; price: number }>> {
  const resolved: Array<{ service_id: string; price: number }> = [];
  for (const line of lines) {
    const service = await getServiceById(line.service_id);
    if (!service) {
      throw new Error(`Servicio no encontrado: ${line.service_id}`);
    }
    resolved.push({ service_id: line.service_id, price: Number(service.base_price ?? 0) });
  }
  return resolved;
}

export function stripServicePricingFromPayload(
  body: Record<string, unknown>,
  role: ProfileRole
): Record<string, unknown> {
  if (canViewServicePricing(role)) return body;
  const next = { ...body };
  delete next.base_price;
  return next;
}
