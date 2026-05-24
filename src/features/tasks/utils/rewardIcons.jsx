import {
  Clapperboard,
  Gift,
  Gamepad2,
  IceCreamBowl,
  Pizza,
  Sparkles,
  Star,
  Trophy,
} from "lucide-react";

export function getRewardIconKey(title = "", fallback = "trophy") {
  const normalized = String(title).toLowerCase();

  if (normalized.includes("movie") || normalized.includes("cinema") || normalized.includes("film")) {
    return "movie";
  }

  if (normalized.includes("pizza")) return "pizza";
  if (normalized.includes("ice") || normalized.includes("cream") || normalized.includes("helado")) {
    return "ice_cream";
  }

  if (normalized.includes("game") || normalized.includes("play") || normalized.includes("video")) {
    return "game";
  }

  if (normalized.includes("star")) return "star";
  if (normalized.includes("gift") || normalized.includes("prize")) return "gift";

  return fallback;
}

export function getRewardIconComponent(iconKey = "trophy") {
  const icons = {
    movie: Clapperboard,
    pizza: Pizza,
    ice_cream: IceCreamBowl,
    game: Gamepad2,
    star: Star,
    gift: Gift,
    sparkles: Sparkles,
    trophy: Trophy,
  };

  return icons[iconKey] || Trophy;
}
