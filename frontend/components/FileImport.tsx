"use client";

import { useState } from "react";
import { parseCatalogDetailed } from "@/lib/parse";
import type { Course } from "@/lib/types";

interface FileImportProps {
  rawInput: string;
  onRawInputChange(value: string): void;
  onAddCourses(courses: Course[], warnings: string[]): void;
}

export function FileImport({ rawInput, onRawInputChange, onAddCourses }: FileImportProps) {
  const [error, setError] = useState<string | null>(null);

  const handleAdd = () => {
    if (!rawInput.trim()) {
      setError("Paste one or more section blocks before adding to the list.");
      return;
    }

    try {
      const { courses, warnings } = parseCatalogDetailed(rawInput);
      setError(null);
      onAddCourses(courses, warnings);
      onRawInputChange("");
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to parse catalog.";
      setError(message);
    }
  };

  return (
    <section className="space-y-3">
      <header>
        <h2 className="text-lg font-semibold">Add Catalog Blocks</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Paste registrar blocks, then click &quot;Add to list&quot; to append their sections below. You can keep adding more blocks before solving.
        </p>
      </header>
      <textarea
        className="w-full min-h-[200px] rounded-md border border-gray-300 bg-white px-3 py-2 font-mono text-sm shadow-sm focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:bg-gray-900"
        value={rawInput}
        onChange={(event) => onRawInputChange(event.target.value)}
        placeholder="Paste catalog text here..."
      />
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={handleAdd}
          className="rounded-md bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          Add to list
        </button>
        <span className="text-xs text-gray-500">
          Added sections appear below; you can exclude specific sections before solving.
        </span>
      </div>
      {error ? (
        <p className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-700 dark:border-red-700 dark:bg-red-950/40">
          {error}
        </p>
      ) : null}
    </section>
  );
}
