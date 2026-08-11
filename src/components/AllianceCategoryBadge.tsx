import { allianceIconUrl } from "../board/alliance-icon";
import { requiredAlliance } from "../board/board-alliance";
import { categoryIconUrl } from "../board/board-view-model";
import type { ExpeditionBoardEntry } from "../api/types";

// Measured directly from the frame PNGs (src/assets/alliances/) - the navy "socket" each frame
// wreath forms isn't uniformly positioned/sized across exports, so each alliance needs its own
// calibration rather than one shared percentage. canvasWidth/canvasHeight give the frame's native
// aspect ratio (so it renders without letterboxing); centerX/centerY/size position and scale the
// category icon within it, both as % of the frame's own canvas.
interface BadgeConfig {
  canvasWidth: number;
  canvasHeight: number;
  centerXPercent: number;
  centerYPercent: number;
  sizePercent: number;
}

const BADGE_CONFIG: Record<string, BadgeConfig> = {
  Imperial: { canvasWidth: 256, canvasHeight: 230, centerXPercent: 49.8, centerYPercent: 48, sizePercent: 80 },
  Chaos: { canvasWidth: 256, canvasHeight: 256, centerXPercent: 49.2, centerYPercent: 56.4, sizePercent: 80 },
  Xenos: { canvasWidth: 246, canvasHeight: 246, centerXPercent: 50.4, centerYPercent: 47.8, sizePercent: 80 },
  Neutral: { canvasWidth: 209, canvasHeight: 230, centerXPercent: 50.0, centerYPercent: 46, sizePercent: 80 },
};

export function AllianceCategoryBadge({ entry }: { entry: ExpeditionBoardEntry }) {
  const alliance = requiredAlliance(entry.category);
  const config = BADGE_CONFIG[alliance ?? "Neutral"];

  return (
    <div
      className="relative inline-block"
      style={{ height: 30, aspectRatio: `${config.canvasWidth} / ${config.canvasHeight}` }}
    >
      <img src={allianceIconUrl(alliance)} className="block h-full w-full" />
      <img
        src={categoryIconUrl(entry)}
        className="absolute object-contain"
        style={{
          left: `${config.centerXPercent}%`,
          top: `${config.centerYPercent}%`,
          width: `${config.sizePercent}%`,
          height: `${config.sizePercent}%`,
          transform: "translate(-50%, -50%)",
        }}
      />
    </div>
  );
}
