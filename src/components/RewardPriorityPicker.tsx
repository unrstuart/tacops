import { Icon } from "./Icon";
import { rewardIconUrl } from "../board/reward-icon";
import { CRUSADE_RESOURCE_KEYS, type ResourceKey } from "../board/reward-amount";

const RESOURCE_LABEL: Record<ResourceKey, string> = {
  crusadeBomb: "Bomb",
  intel: "Intel",
  crusadeNpc: "NPC",
};

const TIER_LABELS = ["High", "Mid", "Low"] as const;

interface RewardPriorityPickerProps {
  value: [ResourceKey, ResourceKey, ResourceKey];
  onChange: (value: [ResourceKey, ResourceKey, ResourceKey]) => void;
}

export function RewardPriorityPicker({ value, onChange }: RewardPriorityPickerProps) {
  function setTier(tierIndex: number, resource: ResourceKey) {
    const next = [...value] as [ResourceKey, ResourceKey, ResourceKey];
    const displacedIndex = next.indexOf(resource);
    next[displacedIndex] = next[tierIndex];
    next[tierIndex] = resource;
    onChange(next);
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-4 text-left">
      <span className="text-sm font-medium">Reward priority:</span>
      {TIER_LABELS.map((label, tierIndex) => (
        <label key={label} className="flex items-center gap-1.5">
          <span className="text-sm">{label}</span>
          <Icon src={rewardIconUrl(value[tierIndex]) ?? ""} title={RESOURCE_LABEL[value[tierIndex]]} />
          <select
            className="rounded border border-black/20 bg-white px-1 py-0.5 text-sm dark:border-white/20 dark:bg-neutral-900"
            value={value[tierIndex]}
            onChange={(e) => setTier(tierIndex, e.target.value as ResourceKey)}
          >
            {CRUSADE_RESOURCE_KEYS.map((key) => (
              <option key={key} value={key}>
                {RESOURCE_LABEL[key]}
              </option>
            ))}
          </select>
        </label>
      ))}
    </div>
  );
}
