/* eslint-disable @typescript-eslint/no-explicit-any */
// frontend/src/components/ProductsPage.tsx
"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { fetchJSON } from "../lib/api";
import { getOrCreateUserId } from "../lib/user";
import { useReservationTimer } from "../hooks/useReservationTimer";
import { getSocket } from "../lib/socket";

type Product = {
  id: string;
  name: string;
  price: string | number;
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
  const [userId, setUserId] = useState<string | null>(null);

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

  // 🔑 Initialize / restore userId on every mount.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const id = getOrCreateUserId();
    setUserId(id);
  }, []);

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

  const reloadAll = useCallback(async () => {
    if (!userId) return;
    setLoadingProducts(true);
    setLoadingReservations(true);
    try {
      const [productsData, reservationsData] = await Promise.all([
        fetchJSON<Product[]>("/products"),
        fetchJSON<Reservation[]>(`/reservations/user/${userId}`),
      ]);

      setProducts(productsData);
      setReservations(
        reservationsData.map((r) => ({
          ...r,
          product: r.product ?? productsData.find((p) => p.id === r.productId),
        }))
      );
    } catch (e) {
      console.error(e);
      addToast("error", "Failed to load data.");
    } finally {
      setLoadingProducts(false);
      setLoadingReservations(false);
    }
  }, [userId, addToast]);

  // 🔁 Initial load
  useEffect(() => {
    if (!userId) return;
    reloadAll();
  }, [userId, reloadAll]);

  // 🔌 Socket.IO realtime updates
  useEffect(() => {
    if (!userId) return;
    const socket = getSocket(userId);

    const handleReservationsUpdated = () => {
      // For reservations, refetch for this user only
      reloadAll();
    };

    const handleProductsUpdated = (
      updates: { id: string; availableStock: number }[]
    ) => {
      // Patch product stock in-place, so other users see stock change
      setProducts((prev) => {
        if (!prev.length) return prev;
        const map = new Map(prev.map((p) => [p.id, p]));
        for (const u of updates) {
          const existing = map.get(u.id);
          if (existing) {
            map.set(u.id, {
              ...existing,
              availableStock: u.availableStock,
            });
          }
        }
        return Array.from(map.values());
      });
    };

    socket.on("reservations:updated", handleReservationsUpdated);
    socket.on("products:updated", handleProductsUpdated);

    return () => {
      socket.off("reservations:updated", handleReservationsUpdated);
      socket.off("products:updated", handleProductsUpdated);
    };
  }, [userId, reloadAll]);

  // Active reservations (from backend)
  const activeReservations = useMemo(
    () => reservations.filter((r) => r.status === "ACTIVE"),
    [reservations]
  );

  // Global timer based on backend `expiresAt` (latest)
  const nextExpirationIso = useMemo(() => {
    if (activeReservations.length === 0) return undefined;
    const maxTime = Math.max(
      ...activeReservations.map((r) => new Date(r.expiresAt).getTime())
    );
    return new Date(maxTime).toISOString();
  }, [activeReservations]);

  const handleTimerElapsed = useCallback(async () => {
    await reloadAll();
    addToast(
      "info",
      "Reservations synced – some may have expired and stock was released."
    );
  }, [reloadAll, addToast]);

  const { mm, ss } = useReservationTimer(nextExpirationIso, handleTimerElapsed);

  const selectedProduct = products.find((p) => p.id === selectedProductId);

  const hasAnyReservations = reservations.length > 0;

  // Reserve product
  const handleReserve = async () => {
    if (!userId) {
      addToast("error", "User not initialized yet, please wait a moment.");
      return;
    }
    if (!selectedProduct) {
      addToast("error", "Please select a product first.");
      return;
    }
    if (quantity <= 0) {
      addToast("error", "Quantity must be at least 1.");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetchJSON<Reservation>("/reservations", {
        method: "POST",
        body: JSON.stringify({
          productId: selectedProduct.id,
          quantity,
          userId,
        }),
      });

      addToast(
        "success",
        `Reserved ${res.quantity} × ${selectedProduct.name} (total for this product) for 2 minutes.`
      );

      await reloadAll();
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

  const openPaymentModal = (r: Reservation) => {
    if (r.status !== "ACTIVE") return;
    setPaymentModalReservation(r);
  };

  const handleConfirmPayment = async () => {
    if (!paymentModalReservation) return;
    setCompleting(true);
    try {
      await fetchJSON<Reservation>(
        `/reservations/${paymentModalReservation.id}/complete`,
        { method: "POST" }
      );

      const productName =
        paymentModalReservation.product?.name ??
        products.find((p) => p.id === paymentModalReservation.productId)
          ?.name ??
        "product";

      addToast(
        "success",
        `Purchase completed for ${paymentModalReservation.quantity} × ${productName}.`
      );
      setPaymentModalReservation(null);
      await reloadAll();
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

  const handleReleaseReservation = async (r: Reservation) => {
    try {
      await fetchJSON<Reservation>(`/reservations/${r.id}/cancel`, {
        method: "POST",
      });
      const productName =
        r.product?.name ??
        products.find((p) => p.id === r.productId)?.name ??
        "product";

      addToast(
        "info",
        `Released hold for ${r.quantity} × ${productName}. Stock restored.`
      );

      await reloadAll();
    } catch (e: any) {
      const msg =
        typeof e?.message === "string"
          ? e.message
          : "Failed to release reservation.";
      addToast("error", msg);
    }
  };

  const clearSelection = () => {
    setSelectedProductId(null);
    setQuantity(1);
  };

  // Reset database to default demo data
  const handleResetDatabase = async () => {
    if (typeof window !== "undefined") {
      const ok = window.confirm(
        "Reset demo data?\nThis will clear all reservations and restore default products."
      );
      if (!ok) return;
    }

    setLoadingProducts(true);
    setLoadingReservations(true);
    try {
      await fetchJSON("/reservations/reset", {
        method: "POST",
      });
      addToast("success", "Database reset to default demo data.");
      await reloadAll();
      clearSelection();
    } catch (e: any) {
      const msg =
        typeof e?.message === "string"
          ? e.message
          : "Failed to reset database.";
      addToast("error", msg);
    } finally {
      setLoadingProducts(false);
      setLoadingReservations(false);
    }
  };

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
        {/* Hero + reservations summary + Reset button */}
        <section className="rounded-3xl bg-white/80 backdrop-blur border border-rose-100 shadow-sm p-4 sm:p-6 flex flex-col md:flex-row gap-5 md:items-center">
          <div className="flex-1 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <p className="inline-flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                <span className="h-1 w-8 rounded-full bg-rose-400" />
                Flash Sale · Cosmetics
              </p>

              <button
                type="button"
                onClick={handleResetDatabase}
                className="text-[11px] sm:text-xs border border-rose-200 text-rose-500 px-3 py-1 rounded-full hover:bg-rose-50"
              >
                Reset demo data
              </button>
            </div>

            <h1 className="text-2xl sm:3xl md:text-4xl font-semibold leading-tight">
              Glow now,
              <span className="text-rose-500 ml-2">reserve in 2 minutes</span>
            </h1>
            <p className="text-sm sm:text-base text-slate-600">
              Lock in your favorite LuxeGlow products while we safely hold the
              stock. If you don&apos;t complete payment in time, we
              automatically release it back for other beauty lovers.
            </p>
            <p className="text-[11px] sm:text-xs text-slate-500">
              Backend background jobs enforce the real expiration. The UI just
              shows timers and syncs when needed.
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
                      Expires in {mm}:{ss}
                    </span>
                  )}
                </div>

                <div className="max-h-40 overflow-auto space-y-1 text-xs">
                  {activeReservations.map((r) => (
                    <div
                      key={r.id}
                      className="flex justify-between items-center gap-2 border-b border-white/10 pb-1 last:border-b-0"
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
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openPaymentModal(r)}
                          className="text-[11px] underline underline-offset-2 text-rose-200 hover:text-rose-100"
                        >
                          Complete
                        </button>
                        <button
                          onClick={() => handleReleaseReservation(r)}
                          className="text-[13px] text-slate-300 hover:text-white border border-white/20 rounded-full px-2 py-[1px]"
                        >
                          ×
                        </button>
                      </div>
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

        {/* Reservation controls */}
        <section className="sticky bottom-3 md:static">
          <div className="rounded-3xl bg-white/95 backdrop-blur border border-rose-100 shadow-lg px-4 py-3 sm:px-5 sm:py-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            <div className="flex-1">
              <div className="text-xs uppercase tracking-[0.18em] text-slate-500 mb-1">
                Reservation details
              </div>
              {selectedProduct ? (
                <div className="text-sm text-slate-700 flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-2">
                    Product:{" "}
                    <span className="font-semibold">
                      {selectedProduct.name}
                    </span>
                    <button
                      type="button"
                      onClick={clearSelection}
                      className="ml-1 text-xs text-slate-400 hover:text-slate-700 border border-slate-200 rounded-full px-2 py-[1px]"
                    >
                      ×
                    </button>
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
                  You can hold multiple items as long as stock is available. All
                  holds share a single timer based on your last reservation.
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
