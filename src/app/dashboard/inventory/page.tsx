import Link from "next/link";
import { InventoryList } from "@/components/inventory-list";

export default function InventoryPage() {
  return (
    <div className="row inventory-page">
      <div className="inventory-page-head">
        <h1 className="inventory-page-title">Inventario — Resumen de existencias</h1>
        <Link className="button inventory-page-cta" href="/dashboard/inventory/new">
          Añadir artículo
        </Link>
      </div>
      <InventoryList />
    </div>
  );
}
