import Link from "next/link";

type Props = {
  href: string;
  title: string;
  desc: string;
  oktag: string;
  accent?: boolean;
};

export function TestCard({ href, title, desc, oktag, accent }: Props) {
  const enabled = accent;
  return (
    <Link
      href={href}
      aria-disabled={!enabled}
      className={
        "group rounded-2xl border bg-white p-5 shadow-sm transition " +
        (enabled
          ? "border-gray-200 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0"
          : "pointer-events-none border-gray-100 opacity-60")
      }
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-lg font-bold">{title}</h2>
        <span
          className="rounded-full px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap"
          style={
            enabled
              ? { background: "var(--ba-accent)", color: "#fff" }
              : { background: "#f0efec", color: "#8a8a83" }
          }
        >
          {oktag}
        </span>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-gray-600">{desc}</p>
    </Link>
  );
}
