/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/src/components/ProductsPage.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchJSON } from "../lib/api";
import { getOrCreateUserId } from "../lib/user";
import { useReservationTimer } from "../hooks/useReservationTimer";

type Product = {
  id: string;
  name: string;
  price: string;
  availableStock: number;
};

type ReservationStatus = "ACTIVE" | "COMPLETED" | "EXPIRED";

type Reservation = {
  id: string;
  productId: string;
  quantity: number;
  status: ReservationStatus;
  expiresAt: string;
  createdAt: string;
  product?: Product;
};

type ToastType = "success" | "error" | "info";

type Toast = {
  id: number;
  type: ToastType;
  message: string;
};

type PaymentModalProps = {
  reservation: Reservation | null;
  onClose: () => void;
  onConfirm: () => void;
  loading: boolean;
};

function PaymentModal({
  reservation,
  onClose,
  onConfirm,
  loading,
}: PaymentModalProps) {
  if (!reservation) return null;
  const product = reservation.product;

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl p-5 sm:p-6">
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-semibold">Confirm your purchase</h3>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">
              This is a mock payment step – completing will finalize your
              reservation and keep the stock assigned to you.
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 text-xl leading-none"
          >
            ×
          </button>
        </div>

        <div className="rounded-xl bg-pink-50 border border-pink-100 p-3 mb-4">
          <div className="flex justify-between text-sm">
            <span className="font-medium">{product?.name ?? "Product"}</span>
            <span className="font-semibold">${product?.price ?? "0.00"}</span>
          </div>
          <div className="mt-1 text-xs text-slate-600 flex justify-between">
            <span>Quantity: {reservation.quantity}</span>
            <span>
              Status: <span className="font-medium">{reservation.status}</span>
            </span>
          </div>
        </div>

        <div className="space-y-2 text-xs text-slate-500 mb-4">
          <p>
            By confirming, you acknowledge this is a demo checkout. No real
            payment is processed, but the reservation will be marked as
            completed.
          </p>
          <p>
            If the reservation expired on the backend while this modal was open,
            the completion may fail and your stock will be released back to
            inventory.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 justify-end">
          <button
            onClick={onClose}
            disabled={loading}
            className="w-full sm:w-auto rounded-full border border-slate-300 px-4 py-2 text-xs sm:text-sm font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="w-full sm:w-auto rounded-full bg-rose-500 px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow hover:bg-rose-600 disabled:opacity-50"
          >
            {loading ? "Completing…" : "Confirm purchase"}
          </button>
        </div>
      </div>
    </div>
  );
}

function ToastContainer({ toasts }: { toasts: Toast[] }) {
  if (toasts.length === 0) return null;
  return (
    <div className="fixed z-50 inset-x-0 bottom-4 sm:top-4 sm:bottom-auto flex justify-center sm:justify-end px-4 pointer-events-none">
      <div className="w-full max-w-sm space-y-2 pointer-events-auto">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={[
              "rounded-xl px-3 py-2 text-xs sm:text-sm shadow-md border flex items-start gap-2 bg-white",
              t.type === "success"
                ? "border-emerald-200 text-emerald-700"
                : t.type === "error"
                ? "border-red-200 text-red-700"
                : "border-slate-200 text-slate-700",
            ].join(" ")}
          >
            <span className="mt-[2px] text-lg leading-none">
              {t.type === "success" ? "✓" : t.type === "error" ? "⚠" : "ℹ"}
            </span>
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loadingReservations, setLoadingReservations] = useState(true);

  const [selectedProductId, setSelectedProductId] = useState<string | null>(
    null
  );
  const [quantity, setQuantity] = useState(1);

  const [submitting, setSubmitting] = useState(false);
  const [paymentModalReservation, setPaymentModalReservation] =
    useState<Reservation | null>(null);
  const [completing, setCompleting] = useState(false);

  const [toasts, setToasts] = useState<Toast[]>([]);
  const [toastCounter, setToastCounter] = useState(0);

  const userId = typeof window !== "undefined" ? getOrCreateUserId() : "";

  const addToast = useCallback(
    (type: ToastType, message: string) => {
      setToastCounter((id) => id + 1);
      const newId = toastCounter + 1;
      const toast: Toast = { id: newId, type, message };
      setToasts((prev) => [...prev, toast]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== newId));
      }, 3000);
    },
    [toastCounter]
  );

  // Load products
  useEffect(() => {
    const loadProducts = async () => {
      try {
        const data = await fetchJSON<Product[]>("/products");
        setProducts(data);
      } catch (e) {
        console.error(e);
        addToast("error", "Failed to load products.");
      } finally {
        setLoadingProducts(false);
      }
    };
    loadProducts();
  }, [addToast]);

  // Load reservations for this user
  const loadReservations = useCallback(async () => {
    if (!userId) return;
    setLoadingReservations(true);
    try {
      const data = await fetchJSON<Reservation[]>(
        `/reservations/user/${userId}`
      );
      setReservations(data);
    } catch (e) {
      console.error(e);
      addToast("error", "Failed to load reservations.");
    } finally {
      setLoadingReservations(false);
    }
  }, [userId, addToast]);

  useEffect(() => {
    if (!userId) return;
    loadReservations();
  }, [userId, loadReservations]);

  // Periodic sync for reservations
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => {
      loadReservations();
    }, 10000);
    return () => clearInterval(interval);
  }, [userId, loadReservations]);

  // When timer (next expiration) elapses: refresh and show note
  const handleTimerElapsed = useCallback(async () => {
    await loadReservations();
    await (async () => {
      try {
        const data = await fetchJSON<Product[]>("/products");
        setProducts(data);
      } catch (e) {
        console.error(e);
      }
    })();
    addToast("info", "One or more reservations may have expired.");
  }, [loadReservations, addToast]);

  // Compute active reservations & next expiration time
  const activeReservations = useMemo(
    () => reservations.filter((r) => r.status === "ACTIVE"),
    [reservations]
  );

  const nextExpirationIso = useMemo(() => {
    if (activeReservations.length === 0) return undefined;
    const minTime = Math.min(
      ...activeReservations.map((r) => new Date(r.expiresAt).getTime())
    );
    return new Date(minTime).toISOString();
  }, [activeReservations]);

  const { mm, ss } = useReservationTimer(nextExpirationIso, handleTimerElapsed);

  const refreshProducts = useCallback(async () => {
    try {
      const data = await fetchJSON<Product[]>("/products");
      setProducts(data);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Reserve product
  const handleReserve = async () => {
    if (!selectedProductId) {
      addToast("error", "Please select a product first.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetchJSON<Reservation>("/reservations", {
        method: "POST",
        body: JSON.stringify({
          productId: selectedProductId,
          quantity,
          userId,
        }),
      });

      addToast(
        "success",
        `Reserved ${res.quantity} × ${
          products.find((p) => p.id === res.productId)?.name ?? "product"
        } for 2 minutes.`
      );
      await loadReservations();
      await refreshProducts();
    } catch (e: any) {
      const msg =
        typeof e?.message === "string"
          ? e.message
          : "Failed to create reservation.";
      if (msg.includes("Not enough stock")) {
        addToast("error", "Cannot reserve more than available stock.");
      } else {
        addToast("error", msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Open modal for specific reservation
  const openPaymentModal = (r: Reservation) => {
    if (r.status !== "ACTIVE") return;
    setPaymentModalReservation(r);
  };

  // Confirm completion from modal
  const handleConfirmPayment = async () => {
    if (!paymentModalReservation) return;
    setCompleting(true);
    try {
      const res = await fetchJSON<Reservation>(
        `/reservations/${paymentModalReservation.id}/complete`,
        { method: "POST" }
      );
      addToast(
        "success",
        `Purchase completed for ${res.quantity} × ${
          res.product?.name ??
          products.find((p) => p.id === res.productId)?.name ??
          "product"
        }.`
      );
      setPaymentModalReservation(null);
      await loadReservations();
      await refreshProducts();
    } catch (e: any) {
      const msg =
        typeof e?.message === "string"
          ? e.message
          : "Failed to complete purchase.";
      if (msg.includes("already expired")) {
        addToast(
          "error",
          "Reservation already expired – stock has been released."
        );
      } else {
        addToast("error", msg);
      }
    } finally {
      setCompleting(false);
    }
  };

  // UI states
  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const hasAnyReservations = reservations.length > 0;

  return (
    <>
      <ToastContainer toasts={toasts} />

      <PaymentModal
        reservation={paymentModalReservation}
        onClose={() => setPaymentModalReservation(null)}
        onConfirm={handleConfirmPayment}
        loading={completing}
      />

      <main className="space-y-6 sm:space-y-8">
        {/* Hero + global timer / active holds */}
        <section className="rounded-3xl bg-white/80 backdrop-blur border border-rose-100 shadow-sm p-4 sm:p-6 flex flex-col md:flex-row gap-5 md:items-center">
          <div className="flex-1 space-y-2">
            <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
              <span className="h-1 w-8 rounded-full bg-rose-400" />
              Flash Sale · Cosmetics
            </p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-semibold leading-tight">
              Glow now,
              <span className="text-rose-500 ml-2">reserve in 2 minutes</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600">
              Lock in your favorite LuxeGlow products while we safely hold the
              stock. If you don&apos;t complete payment in time, we
              automatically release it back for other beauty lovers.
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Payment is mocked for this demo – the backend transactionally
              enforces stock limits and time-based expiration.
            </p>
          </div>

          <div className="w-full md:w-72 rounded-2xl bg-slate-900 text-white p-4 flex flex-col gap-3">
            <div className="text-xs uppercase tracking-[0.2em] text-white/70">
              Your reservations
            </div>

            {loadingReservations ? (
              <div className="text-sm text-white/80">Loading reservations…</div>
            ) : activeReservations.length === 0 ? (
              <div className="text-sm text-white/80">
                No active reservations. Select a product below to start a
                2-minute hold.
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-semibold">
                    {activeReservations.length} active hold
                    {activeReservations.length > 1 ? "s" : ""}
                  </span>
                  {nextExpirationIso && (
                    <span className="text-xs bg-white/10 px-2 py-1 rounded-full">
                      Next release in {mm}:{ss}
                    </span>
                  )}
                </div>

                <div className="max-h-32 overflow-auto space-y-1 text-xs">
                  {activeReservations.map((r) => (
                    <div
                      key={r.id}
                      className="flex justify-between gap-2 border-b border-white/10 pb-1 last:border-b-0"
                    >
                      <div className="truncate">
                        <div className="font-medium truncate">
                          {r.product?.name ??
                            products.find((p) => p.id === r.productId)?.name ??
                            "Product"}
                        </div>
                        <div className="text-[11px] text-white/70">
                          Qty: {r.quantity}
                        </div>
                      </div>
                      <button
                        onClick={() => openPaymentModal(r)}
                        className="text-[11px] underline underline-offset-2 text-rose-200 hover:text-rose-100"
                      >
                        Complete
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </section>

        {/* Products grid */}
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg sm:text-xl font-semibold">
              Glow Edition bestsellers
            </h2>
            <div className="text-xs sm:text-sm text-slate-500">
              Tap a card to select &amp; reserve
            </div>
          </div>

          {loadingProducts ? (
            <div className="text-sm text-slate-500">Loading products…</div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {products.map((p) => {
                const isSelected = selectedProductId === p.id;
                const isOut = p.availableStock <= 0;

                return (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => !isOut && setSelectedProductId(p.id)}
                    className={[
                      "group relative flex flex-col items-stretch text-left rounded-3xl bg-white/90 backdrop-blur border shadow-sm p-4 pb-3",
                      "transition-transform hover:-translate-y-1 hover:shadow-md",
                      isSelected
                        ? "border-rose-400 ring-2 ring-rose-200"
                        : "border-rose-100",
                      isOut ? "opacity-60 cursor-not-allowed" : "",
                    ].join(" ")}
                  >
                    <div className="mb-3 flex justify-center">
                      <div className="h-28 w-20 sm:h-32 sm:w-24 rounded-2xl bg-gradient-to-b from-rose-300 via-pink-100 to-white shadow-inner flex items-end justify-center relative overflow-hidden">
                        <div className="h-[60%] w-[60%] rounded-full bg-white/40 blur-2xl absolute -top-4" />
                        <span className="z-10 text-[11px] uppercase tracking-[0.18em] text-slate-800/70">
                          Glow
                        </span>
                      </div>
                    </div>

                    <div className="flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="text-sm font-semibold line-clamp-2">
                            {p.name}
                          </div>
                          <div className="text-xs text-slate-500">
                            Limited edition cosmetic
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-semibold">
                            ${p.price}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {isOut ? (
                              <span className="text-red-500 font-medium">
                                Sold out
                              </span>
                            ) : (
                              <>{p.availableStock} in stock</>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3 text-xs">
                      <span
                        className={[
                          "inline-flex items-center px-2 py-1 rounded-full",
                          isOut
                            ? "bg-slate-100 text-slate-400"
                            : isSelected
                            ? "bg-rose-500 text-white"
                            : "bg-pink-100 text-slate-700",
                        ].join(" ")}
                      >
                        {isOut
                          ? "Unavailable"
                          : isSelected
                          ? "Selected"
                          : "Tap to select"}
                      </span>
                      <span className="text-[11px] text-slate-400 group-hover:text-slate-600">
                        Hold for 2 minutes
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </section>

        {/* Reservation controls + history hint */}
        <section className="sticky bottom-3 md:static">
          <div className="rounded-3xl bg-white/95 backdrop-blur border border-rose-100 shadow-lg px-4 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500 mb-1">
                Reservation details
              </div>
              {selectedProduct ? (
                <div className="text-sm text-slate-700 flex flex-wrap items-center gap-2">
                  <span>
                    Product:{" "}
                    <span className="font-semibold">
                      {selectedProduct.name}
                    </span>
                  </span>
                  <span className="hidden xs:inline text-slate-400">•</span>
                  <span className="flex items-center gap-1">
                    Quantity:
                    <input
                      type="number"
                      min={1}
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(Math.max(1, Number(e.target.value)))
                      }
                      className="w-16 border border-rose-200 rounded-full px-2 py-1 text-xs"
                    />
                  </span>
                </div>
              ) : (
                <div className="text-sm text-slate-500">
                  Select a product above to start a new reservation.
                </div>
              )}
              {hasAnyReservations && (
                <div className="mt-1 text-[11px] text-slate-400">
                  You can have multiple active holds as long as stock is
                  available. Completed and expired holds are kept as short-term
                  history.
                </div>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleReserve}
                disabled={!selectedProduct || submitting}
                className="w-full sm:w-auto rounded-full bg-rose-500 px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow hover:bg-rose-600 disabled:opacity-50"
              >
                {submitting ? "Reserving…" : "Reserve for 2 minutes"}
              </button>
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
