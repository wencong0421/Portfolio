import { CustomEase } from "../vendor/gsap.min.js";
import { EASE_CURVES } from "./config.js";

// Registers the custom cubic-bezier curves with GSAP and returns their names,
// so animation code can refer to EASE.expoOut and so on.
export function registerEases() {
  const names = {};
  for (const [name, curve] of Object.entries(EASE_CURVES)) {
    const [x1, y1, x2, y2] = curve.split(",").map((n) => n.trim());
    CustomEase.create(name, `M0,0 C${x1},${y1} ${x2},${y2} 1,1`);
    names[name] = name;
  }
  return {
    ...names,
    // Spring-like eases for pops and overshoots.
    springOut: "elastic.out(1, 0.55)",
    pop: "back.out(2.2)",
  };
}
