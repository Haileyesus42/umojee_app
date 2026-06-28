import React from "react";

export type ChecklistItem = { key: string; label: string; required: boolean };

export default function BookingChecklistProgress({
  title,
  items,
  completedKeys = [],
}: {
  title: string;
  items: ChecklistItem[];
  completedKeys?: string[];
}) {
  return (
    <div className="bg-white/90 rounded-xl p-3 border border-blue-200">
      <h4 className="font-semibold text-[#2152A3]">{title}</h4>
      <div className="mt-2">
        <ul className="space-y-2">
          {items.map((it) => {
            const done = completedKeys.includes(it.key);
            return (
              <li key={it.key} className="text-sm flex items-center gap-2">
                <span className={`inline-block w-4 h-4 rounded-full ${done ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span>
                  {it.label}
                  {it.required ? <span className="text-red-500 ml-1">*</span> : null}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
