"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";


export default function SearchBar({
  defaultValue = "",
  aiMode = false,
}: {
  defaultValue?: string;
  aiMode?: boolean;
}) {
  const [query, setQuery] = useState(defaultValue);
  const router = useRouter();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  }

  if (aiMode) {
    return (
      <form onSubmit={handleSubmit} className="w-full max-w-[361px]">
        {/* Outer oval – border #D0D5DD */}
        <div
          style={{
            height: "68px",
            borderRadius: "25px",
            border: "1px solid #D0D5DD",
            padding: "4px",
            background:"rgba(249, 250, 251, 0.23)",
          }}
        >
          {/* Inner oval – #F9FAFB 80% + blur */}
          <div
            className="flex items-center h-full px-4 gap-3"
            style={{
              borderRadius: "24px",
              backdropFilter: "blur(5.4px)",
              WebkitBackdropFilter: "blur(5.4px)",
              border: "1px solid #D0D5DD",
              boxShadow: "0px 3px 2px 1px rgba(16, 24, 40, 0.14)",
            }}
          >
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ex : Ma peau est sèche."
              className="flex-1 bg-transparent focus:outline-none"
              style={{
                fontFamily: 'var(--font-inter), system-ui, sans-serif',
                fontWeight: 400,
                fontSize: "16px",
                lineHeight: "100%",
                letterSpacing: "-0.03em",
                verticalAlign: "middle",
                color: "#667085",
              }}
            />
            <button
              type="submit"
              className="flex-shrink-0 w-11 h-11 flex items-center justify-center transition-opacity hover:opacity-90"
              style={{ background: "#3A6B3A", borderRadius: "14px" }}
            >
              <svg width="26" height="26" viewBox="0 0 26 26" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
                {/* Large 4-pointed star */}
                <path
                  d="M10 3C10 3 10.6 7.4 12 9C13.4 10.6 18 11 18 11C18 11 13.4 11.6 12 13C10.6 14.4 10 19 10 19C10 19 9.4 14.4 8 13C6.6 11.6 2 11 2 11C2 11 6.6 10.4 8 9C9.4 7.6 10 3 10 3Z"
                  fill="white"
                />
                {/* Small 4-pointed star */}
                <path
                  d="M19.5 14C19.5 14 19.85 16.4 20.75 17.25C21.65 18.1 24 18.5 24 18.5C24 18.5 21.65 18.9 20.75 19.75C19.85 20.6 19.5 23 19.5 23C19.5 23 19.15 20.6 18.25 19.75C17.35 18.9 15 18.5 15 18.5C15 18.5 17.35 18.1 18.25 17.25C19.15 16.4 19.5 14 19.5 14Z"
                  fill="white"
                />
              </svg>
            </button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex items-center gap-2 px-4 py-2">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Rechercher un produit, une marque..."
        className="flex-1 rounded-2xl border border-gray-200 bg-withyou-card px-4 py-2 text-sm text-withyou-text placeholder:text-withyou-muted focus:outline-none focus:ring-2 focus:ring-primary-500"
      />
    </form>
  );
}
