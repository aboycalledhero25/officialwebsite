"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus, Trash2, Save, ShoppingBag, ImageIcon } from "lucide-react";
import { SortableList } from "@/components/admin/sortable-list";
import { updateMerch, deleteMerchItem, uploadImage } from "@/lib/actions";
import { useRouter } from "next/navigation";

interface MerchItem {
  id: string;
  title: string;
  price: number;
  currency: string;
  image: string;
  variants: string[];
  description: string;
  handle: string;
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function EmptyItem(): MerchItem {
  return {
    id: generateId(),
    title: "",
    price: 0,
    currency: "GBP",
    image: "",
    variants: ["S", "M", "L", "XL"],
    description: "",
    handle: "",
  };
}

export default function MerchAdminPage() {
  const router = useRouter();
  const [items, setItems] = useState<MerchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/data")
      .then((r) => r.json())
      .then((data) => {
        setItems(data.merch || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await updateMerch(items);
    setSaving(false);
    router.refresh();
  }, [items, router]);

  const handleAdd = useCallback(() => {
    setItems((prev) => [...prev, EmptyItem()]);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this product?")) return;
    try {
      await deleteMerchItem(id);
      setItems((prev) => prev.filter((m) => m.id !== id));
    } catch (err: any) {
      alert("Delete failed: " + (err?.message || "Unknown error"));
    }
  }, []);

  const updateItem = useCallback((id: string, updates: Partial<MerchItem>) => {
    setItems((prev) => prev.map((m) => (m.id === id ? { ...m, ...updates } : m)));
  }, []);

  async function handleImageUpload(id: string, file: File) {
    const formData = new FormData();
    formData.append("file", file);
    const result = await uploadImage(formData);
    updateItem(id, { image: result.path });
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-neutral-500">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white">Merch</h2>
          <p className="text-sm text-neutral-500">
            Add, edit, and reorder products. Shopify-ready.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 rounded-lg bg-[#1e1e1e] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a2a2a] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 rounded-lg bg-[#00f0ff] px-4 py-2 text-sm font-semibold text-black hover:opacity-90 disabled:opacity-50 transition-opacity"
          >
            <Save className="w-4 h-4" />
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#1e1e1e] rounded-xl">
          <ShoppingBag className="w-8 h-8 text-neutral-700 mx-auto mb-3" />
          <p className="text-neutral-500 text-sm">No products yet.</p>
          <button
            onClick={handleAdd}
            className="mt-3 text-sm text-[#00f0ff] hover:underline"
          >
            Add your first product
          </button>
        </div>
      ) : (
        <SortableList
          items={items}
          onChange={setItems}
          renderItem={(item) => (
            <div className="rounded-xl border border-[#1e1e1e] bg-[#141414] p-4 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field
                    label="Title"
                    value={item.title}
                    onChange={(v) => updateItem(item.id, { title: v })}
                  />
                  <Field
                    label="Price"
                    type="number"
                    value={String(item.price)}
                    onChange={(v) => updateItem(item.id, { price: Number(v) || 0 })}
                  />
                  <Field
                    label="Currency"
                    value={item.currency}
                    onChange={(v) => updateItem(item.id, { currency: v })}
                  />
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">
                      Image
                    </label>
                    <div className="flex items-center gap-2">
                      {item.image ? (
                        <img
                          src={item.image}
                          alt=""
                          className="w-10 h-10 rounded object-cover"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded bg-[#1e1e1e] flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-neutral-600" />
                        </div>
                      )}
                      <label className="flex-1 cursor-pointer">
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) handleImageUpload(item.id, file);
                          }}
                        />
                        <span className="block text-xs text-[#00f0ff] hover:underline truncate">
                          {item.image ? "Replace image" : "Upload image"}
                        </span>
                      </label>
                    </div>
                  </div>
                  <Field
                    label="Shopify Handle"
                    value={item.handle}
                    onChange={(v) => updateItem(item.id, { handle: v })}
                    placeholder="product-handle"
                  />
                  <Field
                    label="Variants (comma separated)"
                    value={item.variants.join(", ")}
                    onChange={(v) =>
                      updateItem(item.id, {
                        variants: v.split(",").map((s) => s.trim()).filter(Boolean),
                      })
                    }
                  />
                </div>
                <button
                  onClick={() => handleDelete(item.id)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <TextArea
                label="Description"
                value={item.description}
                onChange={(v) => updateItem(item.id, { description: v })}
                rows={2}
              />
            </div>
          )}
        />
      )}

      <div className="rounded-xl border border-[#1e1e1e] bg-[#141414] p-4 text-sm text-neutral-500">
        <p className="font-medium text-neutral-400 mb-1">Shopify Integration</p>
        <p>
          Set the <code className="text-[#00f0ff]">Shopify Handle</code> for each product to
          connect it to your Shopify store. To enable live checkout, add your{" "}
          <code className="text-[#00f0ff]">SHOPIFY_STORE_DOMAIN</code> and{" "}
          <code className="text-[#00f0ff]">SHOPIFY_STOREFRONT_ACCESS_TOKEN</code> to{" "}
          <code className="text-[#00f0ff]">.env.local</code> and wire up the Storefront API
          in <code className="text-[#00f0ff]">components/merch-card.tsx</code>.
        </p>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]"
      />
    </div>
  );
}

function TextArea({
  label,
  value,
  onChange,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  rows?: number;
}) {
  return (
    <div>
      <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">
        {label}
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={rows}
        className="w-full rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff] resize-y"
      />
    </div>
  );
}
