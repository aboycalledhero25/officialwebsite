"use client";

import { useState } from "react";
import { ShoppingBag } from "lucide-react";
import { motion } from "framer-motion";
import { useSiteData } from "@/components/data-provider";

interface MerchCardProps {
  product: {
    id: string;
    title: string;
    price: number;
    currency: string;
    image: string;
    variants: readonly string[];
    description: string;
    handle: string;
  };
  index?: number;
}

export function MerchCard({ product, index = 0 }: MerchCardProps) {
  const data = useSiteData();
  const copy = data.siteCopy.merchCard;
  const [selectedVariant, setSelectedVariant] = useState(product.variants[0]);

  const handleBuy = () => {
    // eslint-disable-next-line no-console
    console.log("Buy clicked:", product.handle, "Variant:", selectedVariant);
    alert(
      `TODO: Connect Shopify checkout for "${product.title}" (size: ${selectedVariant})`
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay: index * 0.1 }}
      className="group flex flex-col overflow-hidden rounded-xl border border-border bg-surface transition-colors hover:border-accent/30"
    >
      <div className="relative aspect-square bg-surface-elevated overflow-hidden">
        {product.image && !product.image.includes("placeholder") ? (
          <img
            src={product.image}
            alt={product.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-surface-elevated to-background">
            <span className="text-xs uppercase tracking-widest text-muted">
              {product.title}
            </span>
          </div>
        )}
        <div className="absolute inset-0 bg-accent/5 opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      <div className="flex flex-1 flex-col p-4 sm:p-5">
        <h3 className="font-display text-xl tracking-wide text-foreground">
          {product.title}
        </h3>
        <p className="mt-1 text-sm text-muted line-clamp-2">{product.description}</p>

        <div className="mt-4 flex items-center justify-between">
          <span className="text-lg font-semibold text-accent">
            &pound;{product.price.toFixed(2)}
          </span>
        </div>

        {product.variants.length > 1 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {product.variants.map((variant) => (
              <button
                key={variant}
                onClick={() => setSelectedVariant(variant)}
                className={`rounded-md border px-2 py-1 text-xs font-medium transition-colors ${
                  selectedVariant === variant
                    ? "border-accent bg-accent/10 text-accent"
                    : "border-border text-muted hover:border-accent/50 hover:text-foreground"
                }`}
              >
                {variant}
              </button>
            ))}
          </div>
        )}

        <button
          onClick={handleBuy}
          className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-bold text-background transition-all hover:brightness-110 active:scale-[0.98]"
        >
          <ShoppingBag size={16} />
          {copy.buyButton}
        </button>
      </div>
    </motion.div>
  );
}
