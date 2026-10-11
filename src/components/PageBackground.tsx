import { useEffect, useState } from "react";

const u = (id: string) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1400&q=55`;

export const BG = {
  landing: u("1504307651254-35680f356dfd"),
  project: u("1503387762-592deb58ef4e"),
  span: u("1545558014-8692077e9b5c"),
  load: u("1541888946425-d81bb19240f5"),
  section: u("1587293852726-70cdb56c2866"),
  steel: u("1513828583688-c52646db42da"),
  timber: u("1518780664697-55e3ad937233"),
  concrete: u("1486325212027-8081e485255e"),
  review: u("1581091226825-a6a2a5aee158"),
  results: u("1480714378408-67cf0d13bc1b"),
} as const;

type Layer = { src: string; key: string; loaded: boolean };

/** Fixed full-viewport decorative photo with navy overlay, blur and 400ms crossfade. */
export function PageBackground({ image, stepKey, tint = "navy" }: { image: string; stepKey: string; tint?: "navy" | "danger" }) {
  const [layers, setLayers] = useState<Layer[]>([{ src: image, key: stepKey, loaded: false }]);

  useEffect(() => {
    setLayers((prev) => (prev[prev.length - 1]?.src === image ? prev : [...prev.slice(-1), { src: image, key: stepKey, loaded: false }]));
  }, [image, stepKey]);

  const markLoaded = (src: string) => setLayers((p) => p.map((l) => (l.src === src ? { ...l, loaded: true } : l)));

  return (
    <div aria-hidden="true" className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-page-fallback print:hidden">
      {layers.map((l, i) => (
        <img
          key={l.src}
          src={l.src}
          alt=""
          loading="lazy"
          decoding="async"
          onLoad={() => markLoaded(l.src)}
          onTransitionEnd={() => i === layers.length - 1 && layers.length > 1 && setLayers([l])}
          className="absolute inset-0 h-full w-full scale-105 object-cover blur-[4px] transition-opacity duration-[400ms]"
          style={{ opacity: l.loaded && i === layers.length - 1 ? 1 : i < layers.length - 1 ? 1 : 0 }}
        />
      ))}
      <div className={`absolute inset-0 transition-colors duration-[400ms] ${tint === "danger" ? "bg-overlay-danger" : "bg-overlay-navy"}`} />
      <div className="absolute inset-0 bg-blueprint" />
    </div>
  );
}
