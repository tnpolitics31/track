export const APPRECIATION_TAGS = [
  { value: "world_leader", label: "World Leader", emoji: "🌍", color: "#3b82f6" },
  { value: "folk", label: "Folk / Grassroots", emoji: "🎭", color: "#8b5cf6" },
  { value: "reputed_media", label: "Reputed Media", emoji: "📰", color: "#10b981" },
  { value: "local_leader", label: "Local Leader", emoji: "🏛️", color: "#f59e0b" },
];

export function hasAppreciationTag(tags: string | null, tagValue: string): boolean {
  if (!tags) return false;
  return tags.split(",").map((s) => s.trim().toLowerCase()).includes(tagValue.toLowerCase());
}

interface AppreciationFilterProps {
  value: string | null;
  onChange: (v: string | null) => void;
}

export function AppreciationFilter({ value, onChange }: AppreciationFilterProps) {
  return (
    <div className="flex gap-1.5 flex-wrap items-center">
      <span className="text-xs text-muted-foreground font-medium mr-0.5">Appreciation:</span>
      <button
        onClick={() => onChange(null)}
        className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors border ${
          value === null
            ? "bg-primary text-primary-foreground border-transparent"
            : "bg-card border-border text-muted-foreground hover:text-foreground"
        }`}
      >
        All
      </button>
      {APPRECIATION_TAGS.map((tag) => (
        <button
          key={tag.value}
          onClick={() => onChange(value === tag.value ? null : tag.value)}
          style={value === tag.value ? { backgroundColor: tag.color, color: "#fff", borderColor: "transparent" } : {}}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all border ${
            value === tag.value
              ? ""
              : "bg-card border-border text-muted-foreground hover:text-foreground"
          }`}
        >
          {tag.emoji} {tag.label}
        </button>
      ))}
    </div>
  );
}
