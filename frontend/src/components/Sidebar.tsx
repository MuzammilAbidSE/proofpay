"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  {
    section: "Overview",
    links: [
      { href: "/", label: "Dashboard", icon: DashboardIcon },
      { href: "/escrows/new", label: "New escrow", icon: PlusIcon },
    ],
  },
  {
    section: "Work",
    links: [
      { href: "/disputes", label: "Disputes", icon: DisputeIcon },
    ],
  },
  {
    section: "Info",
    links: [{ href: "/about", label: "About ProofPay", icon: InfoIcon }],
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="sidebar">
      <div className="sidebar-brand">
        <div className="sidebar-brand-mark" />
        <div className="sidebar-brand-text">
          <strong>ProofPay</strong>
          <span>Blockchain escrow</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {NAV.map((group) => (
          <div key={group.section}>
            <div className="sidebar-section-label">{group.section}</div>
            {group.links.map((link) => {
              const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
              const Icon = link.icon;
              return (
                <Link key={link.href} href={link.href} className={`sidebar-link${active ? " active" : ""}`}>
                  <Icon />
                  {link.label}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="sidebar-footer">
        Local / testnet only.
        <br />
        No real funds, no custody.
      </div>
    </aside>
  );
}

function iconProps() {
  return { width: 15, height: 15, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 2, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
}

function DashboardIcon() {
  return (
    <svg {...iconProps()}>
      <rect x="3" y="3" width="7" height="9" rx="1.5" />
      <rect x="14" y="3" width="7" height="5" rx="1.5" />
      <rect x="14" y="12" width="7" height="9" rx="1.5" />
      <rect x="3" y="16" width="7" height="5" rx="1.5" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </svg>
  );
}

function DisputeIcon() {
  return (
    <svg {...iconProps()}>
      <path d="M12 2 3 7v6c0 5 4 8 9 9 5-1 9-4 9-9V7Z" />
      <path d="M12 8v5M12 16.5v.01" />
    </svg>
  );
}

function InfoIcon() {
  return (
    <svg {...iconProps()}>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.5v.01" />
    </svg>
  );
}
