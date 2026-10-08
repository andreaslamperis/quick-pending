import { useEffect, type RefObject } from "react";

/**
 * Plays a subtle fade/scale-in each time a floating panel is shown (it gains focus).
 * Closing stays instant on purpose: keys typed right after Enter/Esc must reach the
 * app the user returns to, not a panel that is still fading out.
 */
export function usePanelAnimation(ref: RefObject<HTMLElement | null>) {
  useEffect(() => {
    const play = () => {
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      ref.current?.animate(
        [
          { opacity: 0, transform: "scale(0.985)" },
          { opacity: 1, transform: "none" },
        ],
        { duration: 120, easing: "ease-out" },
      );
    };
    window.addEventListener("focus", play);
    return () => window.removeEventListener("focus", play);
  }, [ref]);
}
