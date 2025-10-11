"use client";

import type { ChangeEvent, InputHTMLAttributes, KeyboardEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type Period = "AM" | "PM";

interface TimePickerFieldProps {
  id: string;
  label: string;
  value?: number;
  placeholder?: string;
  onChange(value: number | undefined): void;
}

const DEFAULT_MINUTES = 8 * 60; // 8:00 AM

export function TimePickerField({ id, label, value, placeholder = "--:--", onChange }: TimePickerFieldProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [inputValue, setInputValue] = useState(() => (value !== undefined ? formatMinutes(value) : ""));
  const [isOpen, setIsOpen] = useState(false);

  const initialParts = minutesToParts(value);
  const [spinnerHour, setSpinnerHour] = useState(initialParts.hour);
  const [spinnerMinute, setSpinnerMinute] = useState(initialParts.minute);
  const [spinnerPeriod, setSpinnerPeriod] = useState<Period>(initialParts.period);
  const [hourInput, setHourInput] = useState(initialParts.hour.toString().padStart(2, "0"));
  const [minuteInput, setMinuteInput] = useState(initialParts.minute.toString().padStart(2, "0"));
  const [periodInput, setPeriodInput] = useState<Period>(initialParts.period);

  useEffect(() => {
    if (value === undefined) {
      setInputValue("");
      const parts = minutesToParts(undefined);
      setSpinnerHour(parts.hour);
      setSpinnerMinute(parts.minute);
      setSpinnerPeriod(parts.period);
      setHourInput(parts.hour.toString().padStart(2, "0"));
      setMinuteInput(parts.minute.toString().padStart(2, "0"));
      setPeriodInput(parts.period);
    return;
  }

    const formatted = formatMinutes(value);
    setInputValue(formatted);
    const parts = minutesToParts(value);
    setSpinnerHour(parts.hour);
    setSpinnerMinute(parts.minute);
    setSpinnerPeriod(parts.period);
    setHourInput(parts.hour.toString().padStart(2, "0"));
    setMinuteInput(parts.minute.toString().padStart(2, "0"));
    setPeriodInput(parts.period);
  }, [value]);

  useEffect(() => {
    if (!isOpen) {
      return;
    }
    const handleClick = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [isOpen]);

  const formattedCurrent = useMemo(() => (value !== undefined ? formatMinutes(value) : ""), [value]);

  useEffect(() => {
    if (isOpen) {
      return;
    }
    setHourInput(spinnerHour.toString().padStart(2, "0"));
    setMinuteInput(spinnerMinute.toString().padStart(2, "0"));
    setPeriodInput(spinnerPeriod);
  }, [isOpen, spinnerHour, spinnerMinute, spinnerPeriod]);

  const applyMinutes = (next: number | undefined, options?: { preserveMinute?: boolean }) => {
    const preserveMinute = options?.preserveMinute ?? false;
    if (next === undefined) {
      onChange(undefined);
      const parts = minutesToParts(undefined);
      setSpinnerHour(parts.hour);
      setSpinnerMinute(parts.minute);
      setSpinnerPeriod(parts.period);
      setHourInput(parts.hour.toString().padStart(2, "0"));
      if (!preserveMinute) {
        setMinuteInput(parts.minute.toString().padStart(2, "0"));
      }
      setPeriodInput(parts.period);
      setInputValue("");
      return;
    }
    const clamped = normalizeMinutes(next);
    onChange(clamped);
    const parts = minutesToParts(clamped);
    setSpinnerHour(parts.hour);
    setSpinnerMinute(parts.minute);
    setSpinnerPeriod(parts.period);
    setHourInput(parts.hour.toString().padStart(2, "0"));
    if (!preserveMinute) {
      setMinuteInput(parts.minute.toString().padStart(2, "0"));
    }
    setPeriodInput(parts.period);
    setInputValue(formatMinutes(clamped));
  };

  const finalizeInput = (raw: string) => {
    const trimmed = raw.trim();
    if (!trimmed) {
      applyMinutes(undefined);
      return;
    }
    const parsed = parseTime(trimmed);
    if (parsed === undefined) {
      setInputValue(formattedCurrent);
      return;
    }
    applyMinutes(parsed);
  };

  const handleInputChange = (event: ChangeEvent<HTMLInputElement>) => {
    setInputValue(event.target.value);
  };

  const handleInputBlur = () => {
    finalizeInput(inputValue);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter") {
      event.preventDefault();
      finalizeInput(inputValue);
      setIsOpen(false);
    } else if (event.key === "Escape") {
      setInputValue(formattedCurrent);
      setIsOpen(false);
      (event.currentTarget as HTMLInputElement).blur();
    }
  };

  const currentMinutes = useMemo(
    () => partsToMinutes(spinnerHour, spinnerMinute, spinnerPeriod),
    [spinnerHour, spinnerMinute, spinnerPeriod],
  );

  const applyDelta = (deltaMinutes: number) => {
    const next = normalizeMinutes(currentMinutes + deltaMinutes);
    applyMinutes(next);
  };

  const togglePeriod = () => {
    applyMinutes(normalizeMinutes(currentMinutes + 12 * 60));
  };

  const handleHourInputChange = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits.length) {
      setHourInput("");
      return;
    }
    const truncated = digits.slice(-2);
    let numeric = Number.parseInt(truncated, 10);
    if (Number.isNaN(numeric)) {
      return;
    }
    if (digits.length === 1) {
      if (numeric === 0) {
        numeric = 10;
      }
    } else {
      if (numeric === 0) {
        numeric = 12;
      }
      if (numeric > 12) {
        numeric = Number.parseInt(truncated.slice(-1), 10);
        if (!numeric) {
          numeric = 12;
        }
      }
    }
    const clamped = Math.max(1, Math.min(12, numeric));
    setHourInput(clamped.toString().padStart(2, "0"));
    applyMinutes(partsToMinutes(clamped, spinnerMinute, spinnerPeriod));
  };

  const handleMinuteInputChange = (raw: string) => {
    const next = raw.replace(/\D/g, "");
    setMinuteInput(next);
  };

  const handleMinuteCommit = (raw: string) => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) {
      setMinuteInput("");
      return;
    }
    const numeric = Number.parseInt(digits, 10);
    if (Number.isNaN(numeric)) {
      setMinuteInput("");
      return;
    }
    const clamped = Math.max(0, Math.min(59, numeric));
    const padded = clamped.toString().padStart(2, "0");
    setMinuteInput(padded);
    setSpinnerMinute(clamped);
    applyMinutes(partsToMinutes(spinnerHour, clamped, spinnerPeriod));
  };

  const handlePeriodInputChange = (raw: string) => {
    if (!raw) {
      setPeriodInput("AM");
      return;
    }
    const cleaned = raw.trim().toUpperCase();
    const next: Period = cleaned.startsWith("P") ? "PM" : "AM";
    setPeriodInput(next);
    applyMinutes(partsToMinutes(spinnerHour, spinnerMinute, next));
  };

  const containerBorder =
    "flex items-center rounded-lg border px-2 py-2 text-sm shadow-sm transition focus-within:border-indigo-400 focus-within:ring-2 focus-within:ring-indigo-400 focus-within:ring-offset-0";
  const containerBorderActive = isOpen ? "border-indigo-400 ring-2 ring-indigo-400" : "border-slate-600";

  return (
    <div className="space-y-2" ref={containerRef}>
      <label className="text-sm font-medium text-slate-200" htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <div className={`${containerBorder} ${containerBorderActive} bg-slate-950/80 text-slate-100`}>
          <input
            id={id}
            type="text"
            value={inputValue}
            placeholder={placeholder}
            inputMode="text"
            autoComplete="off"
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleKeyDown}
            onFocus={() => setIsOpen(true)}
            onMouseDown={() => setIsOpen(true)}
            className="w-full bg-transparent text-sm uppercase tracking-wide text-slate-100 placeholder-slate-500 focus:outline-none"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={() => setIsOpen((prev) => !prev)}
            onMouseDown={(event) => event.preventDefault()}
            className="ml-2 inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-900/60 text-slate-400 transition hover:bg-indigo-500/20 hover:text-indigo-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            aria-label="Open time picker"
          >
            <ClockIcon />
          </button>
          <button
            type="button"
            onClick={() => applyMinutes(undefined)}
            onMouseDown={(event) => event.preventDefault()}
            className="ml-1 inline-flex h-7 w-7 items-center justify-center rounded-md bg-slate-900/40 text-slate-400 transition hover:bg-red-500/20 hover:text-red-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
            aria-label="Clear time"
          >
            <CloseIcon />
          </button>
        </div>
        {isOpen ? (
          <div className="absolute left-0 top-full z-20 mt-2 w-full rounded-lg border border-slate-700 bg-slate-900/95 p-3 shadow-lg">
            <div className="grid grid-cols-3 items-center gap-4 text-slate-100">
              <SpinnerColumn
                label="Hour"
                value={hourInput}
                onValueChange={handleHourInputChange}
                onIncrement={() => applyDelta(60)}
                onDecrement={() => applyDelta(-60)}
                inputProps={{ inputMode: "numeric", maxLength: 2, "aria-label": "Hour" }}
              />
              <SpinnerColumn
                label="Minute"
                value={minuteInput}
                onValueChange={handleMinuteInputChange}
                onIncrement={() => applyDelta(5)}
                onDecrement={() => applyDelta(-5)}
                inputProps={{
                  inputMode: "numeric",
                  maxLength: 2,
                  "aria-label": "Minute",
                  onBlur: (event) => handleMinuteCommit(event.currentTarget.value),
                  onKeyDown: (event) => {
                    if (event.key === "Enter") {
                      event.preventDefault();
                      handleMinuteCommit(event.currentTarget.value);
                    }
                  },
                }}
              />
              <SpinnerColumn
                label="Period"
                value={periodInput}
                onValueChange={handlePeriodInputChange}
                onIncrement={togglePeriod}
                onDecrement={togglePeriod}
                inputProps={{ inputMode: "text", maxLength: 2, "aria-label": "Period" }}
              />
            </div>
            <div className="mt-3 flex justify-end">
              <button
                type="button"
                onClick={() => applyMinutes(undefined)}
                className="flex items-center gap-2 rounded-md border border-slate-600 px-3 py-1 text-xs font-semibold text-slate-200 transition hover:border-red-400 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
              >
                Clear time
              </button>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function SpinnerColumn({
  label,
  value,
  onValueChange,
  onIncrement,
  onDecrement,
  inputProps,
}: {
  label: string;
  value: string;
  onValueChange(value: string): void;
  onIncrement(): void;
  onDecrement(): void;
  inputProps?: InputHTMLAttributes<HTMLInputElement>;
}) {
  return (
    <div className="flex flex-col items-center gap-1">
      <SpinnerButton direction="up" onClick={onIncrement} ariaLabel={`Increase ${label.toLowerCase()}`} />
      <input
        {...inputProps}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        onFocus={(event) => event.target.select()}
        className="w-16 rounded-md border border-slate-700 bg-slate-800/80 px-2 py-1 text-center font-mono text-lg uppercase tracking-wider text-slate-100 focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-400"
      />
      <SpinnerButton direction="down" onClick={onDecrement} ariaLabel={`Decrease ${label.toLowerCase()}`} />
    </div>
  );
}

function SpinnerButton({
  direction,
  onClick,
  ariaLabel,
}: {
  direction: "up" | "down";
  onClick(): void;
  ariaLabel: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-6 w-6 items-center justify-center rounded-md bg-slate-800/70 text-slate-200 transition hover:bg-indigo-500/20 hover:text-indigo-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900"
      aria-label={ariaLabel}
    >
      <ArrowIcon direction={direction} />
    </button>
  );
}

function ClockIcon() {
  return (
    <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
      <circle cx="12" cy="12" r="8" />
      <path d="M12 8v4l2.5 2.5" />
    </svg>
  );
}

function ArrowIcon({ direction }: { direction: "up" | "down" }) {
  const rotation = direction === "up" ? "rotate-0" : "rotate-180";
  return (
    <svg viewBox="0 0 12 8" className={`h-3 w-3 ${rotation}`} fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M2 6L6 2l4 4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg viewBox="0 0 12 12" className="h-3.5 w-3.5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 3l6 6M9 3L3 9" strokeLinecap="round" />
    </svg>
  );
}

function formatMinutes(minutes: number): string {
  const normalized = normalizeMinutes(minutes);
  const hours24 = Math.floor(normalized / 60);
  const mins = normalized % 60;
  const period: Period = hours24 >= 12 ? "PM" : "AM";
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")} ${period}`;
}

function minutesToParts(totalMinutes: number | undefined): { hour: number; minute: number; period: Period } {
  const normalized = normalizeMinutes(totalMinutes ?? DEFAULT_MINUTES);
  const hours24 = Math.floor(normalized / 60);
  const minute = normalized % 60;
  const period: Period = hours24 >= 12 ? "PM" : "AM";
  const hour = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return { hour, minute, period };
}

function partsToMinutes(hour: number, minute: number, period: Period): number {
  const boundedHour = ((hour - 1 + 12) % 12) + 1;
  const boundedMinute = ((minute % 60) + 60) % 60;
  let hours24 = boundedHour % 12;
  if (period === "PM") {
    hours24 += 12;
  }
  return normalizeMinutes(hours24 * 60 + boundedMinute);
}

function parseTime(value: string): number | undefined {
  const cleaned = value.trim().toUpperCase().replace(/\s+/g, " ");
  const match = cleaned.match(/^(\d{1,2})(?::?(\d{2}))?\s*(AM|PM)?$/);
  if (!match) {
    return undefined;
  }

  let hours = Number.parseInt(match[1], 10);
  const minutes = match[2] !== undefined ? Number.parseInt(match[2], 10) : 0;
  const suffix = match[3] as Period | undefined;

  if (Number.isNaN(hours) || Number.isNaN(minutes) || minutes < 0 || minutes > 59) {
    return undefined;
  }

  if (suffix) {
    if (hours < 1 || hours > 12) {
      return undefined;
    }
    if (hours === 12) {
      hours = 0;
    }
    if (suffix === "PM") {
      hours += 12;
    }
  } else if (hours > 23) {
    return undefined;
  }

  return normalizeMinutes(hours * 60 + minutes);
}

function normalizeMinutes(minutes: number): number {
  const total = minutes % (24 * 60);
  return total < 0 ? total + 24 * 60 : total;
}
