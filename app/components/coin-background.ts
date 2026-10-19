import type { CoinMetal } from "@/lib/types";

export function coinBackground(metal: CoinMetal) {
  switch (metal) {
    case "copper":
      return "bg-copper";
    case "silver":
      return "bg-silver";
    case "gold":
      return "bg-primary";
  }
}
