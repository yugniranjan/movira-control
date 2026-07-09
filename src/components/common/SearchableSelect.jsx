import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { FaCheck, FaChevronDown, FaSearch } from "react-icons/fa";

export default function SearchableSelect({
  value = "",
  options = [],
  onChange,
  placeholder = "Select option",
  searchPlaceholder = "Search...",
  emptyText = "No options found.",
  disabled = false,
  className = "",
  buttonClassName = "",
  menuMinWidth,
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [menuStyle, setMenuStyle] = useState({});
  const rootRef = useRef(null);
  const menuRef = useRef(null);
  const searchRef = useRef(null);

  const normalizedOptions = useMemo(
    () =>
      options.map((option) =>
        typeof option === "string"
          ? { value: option, label: option }
          : { ...option, value: String(option.value ?? "") }
      ),
    [options]
  );

  const selected = normalizedOptions.find((option) => String(option.value) === String(value));
  const filteredOptions = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return normalizedOptions;
    return normalizedOptions.filter((option) => {
      const haystack = `${option.label || ""} ${option.description || ""} ${option.value || ""}`.toLowerCase();
      return haystack.includes(needle);
    });
  }, [normalizedOptions, query]);

  useEffect(() => {
    if (!open) return undefined;
    const updateMenuPosition = () => {
      const rect = rootRef.current?.getBoundingClientRect();
      if (!rect) return;
      const minWidth = Number(menuMinWidth) || 0;
      setMenuStyle({
        left: rect.left,
        top: rect.bottom + 6,
        width: Math.max(rect.width, minWidth),
        maxHeight: Math.max(220, window.innerHeight - rect.bottom - 18),
      });
    };
    const onPointerDown = (event) => {
      if (rootRef.current?.contains(event.target) || menuRef.current?.contains(event.target)) return;
      setOpen(false);
    };
    const onKeyDown = (event) => {
      if (event.key === "Escape") setOpen(false);
    };
    updateMenuPosition();
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", updateMenuPosition);
    window.addEventListener("scroll", updateMenuPosition, true);
    window.setTimeout(() => searchRef.current?.focus(), 0);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", updateMenuPosition);
      window.removeEventListener("scroll", updateMenuPosition, true);
    };
  }, [menuMinWidth, open]);

  const choose = (option) => {
    onChange?.(option.value, option);
    setOpen(false);
    setQuery("");
  };

  const menu =
    open && typeof document !== "undefined"
      ? createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            className="fixed z-[9999] overflow-hidden rounded-lg border border-[#dccfbe] bg-white shadow-[0_14px_34px_rgba(38,25,12,0.16)]"
          >
            <div className="border-b border-stone-200 bg-[#fffaf2] p-2">
              <div className="relative">
                <FaSearch className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-stone-500" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder={searchPlaceholder}
                  className="h-10 w-full rounded-md border border-stone-300 bg-white px-9 text-sm font-bold text-stone-950 shadow-[0_1px_0_rgba(23,21,18,0.06)] outline-none placeholder:text-stone-400 focus:border-orange-400 focus:ring-3 focus:ring-orange-500/15"
                />
              </div>
            </div>
            <div className="overflow-y-auto p-1.5" style={{ maxHeight: menuStyle.maxHeight ? menuStyle.maxHeight - 54 : 288 }} role="listbox">
              {filteredOptions.map((option) => {
                const active = String(option.value) === String(value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => choose(option)}
                    className={`flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-left text-sm transition ${
                      active ? "bg-orange-50 text-orange-700" : "text-stone-700 hover:bg-stone-50"
                    }`}
                    role="option"
                    aria-selected={active}
                  >
                    <span className="grid h-4 w-4 shrink-0 place-items-center">
                      {active ? <FaCheck className="text-xs" /> : null}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-black leading-5">{option.label}</span>
                      {option.description ? (
                        <span className="block truncate text-xs font-semibold leading-4 text-stone-500">
                          {option.description}
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
              {filteredOptions.length === 0 ? (
                <div className="px-3 py-5 text-center text-sm font-bold text-stone-500">{emptyText}</div>
              ) : null}
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen((current) => !current)}
        className={`flex min-h-9 w-full items-center justify-between gap-3 rounded-lg border-2 border-[#d6c8b8] bg-white px-3 py-1.5 text-left text-sm font-bold text-stone-950 shadow-[0_2px_0_rgba(23,21,18,0.08)] transition hover:border-orange-300 focus:outline-none focus:border-stone-950 focus:ring-4 focus:ring-orange-500/15 disabled:pointer-events-none disabled:opacity-50 ${buttonClassName}`}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={`min-w-0 flex-1 truncate ${selected ? "text-stone-950" : "text-stone-400"}`}>
          {selected?.label || placeholder}
        </span>
        <FaChevronDown className={`shrink-0 text-xs text-stone-500 transition ${open ? "rotate-180" : ""}`} />
      </button>
      {menu}
    </div>
  );
}
