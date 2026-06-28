import React from "react";

type Thread = { id: string; updated_at: string; title?: string | null; last_message?: string | null };

export default function ThreadsPanel({
  threads,
  onSelect,
  onNew,
  loading,
}: {
  threads: Thread[];
  onSelect: (id: string) => void;
  onNew: () => void;
  loading?: boolean;
}) {
  return (
    <div className="bg-white/95 rounded-xl border border-blue-200 shadow p-3">
      <div className="flex items-center justify-between mb-2">
        <h4 className="font-semibold text-[#2152A3]">Conversations</h4>
        <button
          className="px-2 py-1 text-xs rounded bg-[#2152A3] text-white hover:bg-blue-700"
          onClick={onNew}
          disabled={loading}
        >
          New Chat
        </button>
      </div>
      <div className="max-h-60 overflow-y-auto space-y-2">
        {threads.length === 0 && (
          <div className="text-xs text-gray-500">No conversations yet.</div>
        )}
        {threads.map((t) => (
          <button
            key={t.id}
            onClick={() => onSelect(t.id)}
            className="w-full text-left border rounded p-2 hover:bg-blue-50"
          >
            <div className="text-sm font-semibold truncate">{t.title || t.last_message || "(no title)"}</div>
            {t.last_message && (
              <div className="text-xs text-gray-600 truncate mt-0.5">{t.last_message}</div>
            )}
            <div className="text-[10px] text-gray-500">{new Date(t.updated_at).toLocaleString()}</div>
          </button>
        ))}
      </div>
    </div>
  );
}
