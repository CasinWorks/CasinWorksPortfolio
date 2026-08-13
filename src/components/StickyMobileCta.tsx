import { useEffect, useState } from "react";
import { ArrowRight } from "lucide-react";

type StickyMobileCtaProps = {
  /** When true (e.g. mobile nav open), hide the bar */
  hidden?: boolean;
  href?: string;
  label?: string;
};

/** Persistent mobile consultation CTA — hides near the contact section. */
export function StickyMobileCta({
  hidden = false,
  href = "#contact",
  label = "Start a Consultation",
}: StickyMobileCtaProps) {
  const [nearContact, setNearContact] = useState(false);

  useEffect(() => {
    const contact = document.getElementById("contact");
    if (!contact) return;

    const observer = new IntersectionObserver(
      ([entry]) => setNearContact(entry.isIntersecting),
      { root: null, threshold: 0.12, rootMargin: "0px 0px -20% 0px" },
    );

    observer.observe(contact);
    return () => observer.disconnect();
  }, []);

  const visible = !hidden && !nearContact;

  return (
    <div
      className={`md:hidden fixed inset-x-0 bottom-0 z-40 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0 pointer-events-none"
      }`}
    >
      <a
        href={href}
        className="flex items-center justify-between gap-4 rounded-full bg-[#1a1a1a] text-white px-6 py-4 shadow-[0_12px_40px_rgba(0,0,0,0.28)]"
      >
        <span className="text-[10px] font-black uppercase tracking-[0.35em]">{label}</span>
        <ArrowRight className="size-5 shrink-0" aria-hidden />
      </a>
    </div>
  );
}
