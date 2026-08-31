import type { SVGProps } from "react";

const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  viewBox: "0 0 32 32",
};

/** Taza de café dibujada a mano */
export function DoodleTaza(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M6.5 12.5c-.3 6.2 1.4 11.2 4.4 12.6 2.6 1.2 6.4 1.2 9 0 3-1.4 4.7-6.4 4.4-12.6-7 .7-11.5.6-17.8 0Z" />
      <path d="M24.6 15c2.6-.9 4.4.3 4.2 2.4-.2 2.2-2.1 3.4-4.5 3" />
      <path d="M12 8.5c1-1.2.2-2.2-.2-3.2M17 8.4c1-1.4.1-2.4-.3-3.4M22 8.6c.9-1.2.2-2.1-.2-3" />
      <path d="M8 28.5c5.6.9 10.6.9 16 0" />
    </svg>
  );
}

/** Flor sencilla */
export function DoodleFlor(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <circle cx="16" cy="12" r="3" />
      <path d="M16 9c1-3.6 5-3.4 5.4-.4.3 2-1.6 3-3.4 3.4 3.4-1 5.8 1.9 4.2 4.2-1.1 1.6-3.2 1.1-4.6-.4 1.8 3 .2 5.8-2.3 5.4-2-.3-2.5-2.4-1.6-4.4-1.6 2.6-4.9 2.3-5.4-.3-.4-2 1.4-3.2 3.6-3-3.2-.6-4.2-3.6-2-4.8 1.7-1 3.4.2 4.4 1.7" />
      <path d="M16 21c.4 3.4.1 6.1-.8 8.4" />
      <path d="M15.6 25.4c-1.8-1.2-3.4-1.5-5-1.2" />
    </svg>
  );
}

/** Ticket / recibo */
export function DoodleTicket(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M7 4.5 9 6l2.2-1.5L13.4 6l2.2-1.5L17.8 6 20 4.5 22.2 6l2.3-1.5v21L22.2 28 20 26.5 17.8 28l-2.2-1.5L13.4 28l-2.2-1.5L9 28l-2-1.5Z" />
      <path d="M11 12h10M11 17h10M11 21.5h6" />
    </svg>
  );
}

/** Bolsa para llevar */
export function DoodleBolsa(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M7.5 10.5h17l-1.4 17c-4.7.8-9.5.8-14.2 0Z" />
      <path d="M12 13c-.6-5.4 1.2-8.4 4-8.4s4.6 3 4 8.4" />
      <path d="M11 19c3.4 1.2 6.6 1.2 10 0" />
    </svg>
  );
}

/** Caja de inventario */
export function DoodleCaja(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M4.5 10.5 16 5l11.5 5.5-11.4 5.6Z" />
      <path d="M4.5 10.5v12L16 28l11.5-5.5v-12" />
      <path d="M16 16.1V28M10 13l11.5-5.6" />
    </svg>
  );
}

/** Grano de café */
export function DoodleGrano(props: SVGProps<SVGSVGElement>) {
  return (
    <svg {...base} {...props}>
      <path d="M9 22.8c-4-4-3.6-11 1-14.9C14.4 4.2 21.4 4.6 25 8.8c3.6 4.2 2.8 11-1.6 14.6-4.4 3.6-10.6 3.2-14.4-.6Z" />
      <path d="M11.5 20.6c-1.6-3.4.6-8 3.4-10.2 1.8-1.4 4.4-2 6.4-1.4" />
    </svg>
  );
}

/** Línea ondulada tipo trazo a mano */
export function DoodleTrazo({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 10" className={className} fill="none" preserveAspectRatio="none">
      <path
        d="M2 6c22-5 42 4 62-1s42-2 94 2"
        stroke="currentColor"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
