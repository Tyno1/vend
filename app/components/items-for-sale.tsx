"use client";

import { formatPence } from "@/lib/coins";
import type { Product } from "@/lib/types";
import { ProductArt } from "./product-art";
import { products } from "./products";

const heading = "text-xs font-semibold tracking-label text-muted uppercase";
const focusRing = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary";

export function ItemsForSale({
  selectedProduct,
  onSelect,
}: {
  selectedProduct: Product | null;
  onSelect: (product: Product) => void;
}) {
  return (
    <section className="rounded-card border border-white/8 bg-card p-m" aria-label="Items for sale">
      <h2 className={heading}>In the glass</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 desk:grid-cols-4">
        {products.map((product) => {
          const pressed = selectedProduct?.code === product.code;
          return (
            <button
              key={product.code}
              type="button"
              className={`flex min-w-0 cursor-pointer flex-col items-stretch gap-1 rounded-tile border px-2 pt-2 pb-2.5 text-left text-inherit ${focusRing} ${
                pressed ? "border-primary bg-primary/12" : "border-transparent bg-white/3 hover:bg-white/6"
              }`}
              aria-pressed={pressed}
              onClick={() => onSelect(product)}
            >
              <span className="font-mono text-xs tracking-label text-primary">{product.code}</span>
              <ProductArt art={product.art} color={product.color} />
              <span className="min-h-10 text-m">{product.name}</span>
              <span className="flex items-baseline justify-between gap-s text-s text-muted">
                <span>{product.detail}</span>
                <span className="font-mono text-foreground tabular-nums">{formatPence(product.price)}</span>
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
