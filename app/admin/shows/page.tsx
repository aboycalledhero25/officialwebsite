"use client";

import { useState, useCallback, useEffect } from "react";
import { Plus, Trash2, Save, Calendar } from "lucide-react";
import { SortableList } from "@/components/admin/sortable-list";
import { updateShows, deleteShow } from "@/lib/actions";
import { useRouter } from "next/navigation";

interface Show {
  id: string;
  date: string;
  venue: string;
  city: string;
  country: string;
  ticketUrl: string | null;
  status: "upcoming" | "past";
  supporting: string;
}

function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

function EmptyShow(): Show {
  return {
    id: generateId(),
    date: new Date().toISOString().split("T")[0],
    venue: "",
    city: "",
    country: "",
    ticketUrl: "",
    status: "upcoming",
    supporting: "",
  };
}

export default function ShowsAdminPage() {
  const router = useRouter();
  const [shows, setShows] = useState<Show[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch("/api/admin/data")
      .then((r) => r.json())
      .then((data) => {
        setShows(data.shows || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const handleSave = useCallback(async () => {
    setSaving(true);
    await updateShows(shows);
    setSaving(false);
    router.refresh();
  }, [shows, router]);

  const handleAdd = useCallback(() => {
    setShows((prev) => [...prev, EmptyShow()]);
  }, []);

  const handleDelete = useCallback(async (id: string) => {
    if (!confirm("Delete this show?")) return;
    await deleteShow(id);
    setShows((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const updateShow = useCallback((id: string, updates: Partial<Show>) => {
    setShows((prev) => prev.map((s) => (s.id === id ? { ...s, ...updates } : s)));
  }, []);

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
          <h2 className="text-lg font-semibold text-white">Shows</h2>
          <p className="text-sm text-neutral-500">
            Add, edit, and reorder your gigs.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 rounded-lg bg-[#1e1e1e] px-4 py-2 text-sm font-medium text-white hover:bg-[#2a2a2a] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Show
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

      {shows.length === 0 ? (
        <div className="text-center py-16 border border-dashed border-[#1e1e1e] rounded-xl">
          <Calendar className="w-8 h-8 text-neutral-700 mx-auto mb-3" />
          <p className="text-neutral-500 text-sm">No shows yet.</p>
          <button
            onClick={handleAdd}
            className="mt-3 text-sm text-[#00f0ff] hover:underline"
          >
            Add your first show
          </button>
        </div>
      ) : (
        <SortableList
          items={shows}
          onChange={setShows}
          renderItem={(show) => (
            <div className="rounded-xl border border-[#1e1e1e] bg-[#141414] p-4 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Field
                    label="Date"
                    type="date"
                    value={show.date}
                    onChange={(v) => updateShow(show.id, { date: v })}
                  />
                  <Field
                    label="Venue"
                    value={show.venue}
                    onChange={(v) => updateShow(show.id, { venue: v })}
                  />
                  <Field
                    label="City"
                    value={show.city}
                    onChange={(v) => updateShow(show.id, { city: v })}
                  />
                  <Field
                    label="Country"
                    value={show.country}
                    onChange={(v) => updateShow(show.id, { country: v })}
                  />
                  <Field
                    label="Ticket URL"
                    value={show.ticketUrl || ""}
                    onChange={(v) => updateShow(show.id, { ticketUrl: v || null })}
                  />
                  <div>
                    <label className="block text-xs font-medium uppercase tracking-wider text-neutral-500 mb-1.5">
                      Status
                    </label>
                    <select
                      value={show.status}
                      onChange={(e) =>
                        updateShow(show.id, { status: e.target.value as "upcoming" | "past" })
                      }
                      className="w-full rounded-lg border border-[#1e1e1e] bg-[#0a0a0a] px-3 py-2 text-sm text-white outline-none transition-colors focus:border-[#00f0ff] focus:ring-1 focus:ring-[#00f0ff]"
                    >
                      <option value="upcoming">Upcoming</option>
                      <option value="past">Past</option>
                    </select>
                  </div>
                </div>
                <button
                  onClick={() => handleDelete(show.id)}
                  className="p-2 rounded-lg text-neutral-500 hover:text-red-400 hover:bg-red-500/10 transition-colors shrink-0"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <Field
                label="Supporting Acts"
                value={show.supporting}
                onChange={(v) => updateShow(show.id, { supporting: v })}
                placeholder="e.g. with Special Guest"
              />
            </div>
          )}
        />
      )}
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
