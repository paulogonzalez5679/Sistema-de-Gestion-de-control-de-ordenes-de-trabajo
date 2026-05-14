import { Suspense } from "react";
import { OrderIdentificationForm } from "@/components/order-identification-form";

export default function NewOrderIdentificationPage() {
  return (
    <div className="row">
      <h1 style={{ margin: 0 }}>Nueva orden</h1>
      <Suspense fallback={<p style={{ color: "#b9accf" }}>Cargando…</p>}>
        <OrderIdentificationForm />
      </Suspense>
    </div>
  );
}
