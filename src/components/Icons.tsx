import type { SVGProps } from "react";

/**
 * Koleksi ikon & ilustrasi vektor minimalis bergaya editorial Italia.
 * Menggunakan garis monoline halus (stroke 1.4) dengan aksen duotone tipis (14% opacity)
 * tanpa emoji dan tanpa warna-warni berlebihan.
 */
function Svg({ children, ...props }: SVGProps<SVGSVGElement>) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.4}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {children}
    </svg>
  );
}

type P = SVGProps<SVGSVGElement>;

// =====================================================================
// Navigasi & UI Utama
// =====================================================================

export const IconHome = (p: P) => (
  <Svg {...p}>
    <path d="M5 11.5 12 5l7 6.5" />
    <path d="M7 10.5V19h10v-8.5" />
    <path d="M10.5 19v-4a1.5 1.5 0 0 1 3 0v4" fill="currentColor" fillOpacity={0.14} />
  </Svg>
);

export const IconList = (p: P) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="3" fill="currentColor" fillOpacity={0.08} />
    <path d="M8 9h8M8 12.5h8M8 16h5" />
  </Svg>
);

export const IconChart = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8" fill="currentColor" fillOpacity={0.08} />
    <path d="M12 4a8 8 0 0 1 8 8h-8V4Z" fill="currentColor" fillOpacity={0.2} />
    <circle cx="12" cy="12" r="8" />
  </Svg>
);

export const IconArch = (p: P) => (
  <Svg {...p}>
    <path d="M5 20V11a7 7 0 0 1 14 0v9" fill="currentColor" fillOpacity={0.08} />
    <path d="M9 20v-7.5a3 3 0 0 1 6 0V20" fill="currentColor" fillOpacity={0.16} />
    <path d="M3.5 20h17" />
  </Svg>
);

export const IconPlus = (p: P) => (
  <Svg {...p}>
    <path d="M12 5.5v13M5.5 12h13" />
  </Svg>
);

export const IconX = (p: P) => (
  <Svg {...p}>
    <path d="M6.5 6.5l11 11M17.5 6.5l-11 11" />
  </Svg>
);

export const IconTrash = (p: P) => (
  <Svg {...p}>
    <path d="M4.5 7h15M9.5 11v5.5M14.5 11v5.5M6.5 7l.8 12h9.4l.8-12M9.5 7V4.5h5V7" />
  </Svg>
);

export const IconChevron = (p: P) => (
  <Svg {...p}>
    <path d="m9.5 6.5 5.5 5.5-5.5 5.5" />
  </Svg>
);

export const IconChevronLeft = (p: P) => (
  <Svg {...p}>
    <path d="m14.5 6.5-5.5 5.5 5.5 5.5" />
  </Svg>
);

export const IconSparkle = (p: P) => (
  <Svg {...p}>
    <path
      d="M12 3.5c.55 3.9 2.6 5.95 6.5 6.5-3.9.55-5.95 2.6-6.5 6.5-.55-3.9-2.6-5.95-6.5-6.5 3.9-.55 5.95-2.6 6.5-6.5Z"
      fill="currentColor"
      fillOpacity={0.15}
    />
  </Svg>
);

export const IconSearch = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6" />
    <path d="m19.5 19.5-4-4" />
  </Svg>
);

export const IconShare = (p: P) => (
  <Svg {...p}>
    <path d="M12 3.5v11M8.5 7 12 3.5 15.5 7" />
    <path d="M6 11.5v8h12v-8" />
  </Svg>
);

export const IconShortcut = (p: P) => (
  <Svg {...p}>
    <path d="M13 3 5 13.5h6.2L10.5 21 19 10.5h-6.2L13 3Z" fill="currentColor" fillOpacity={0.14} />
  </Svg>
);

export const IconCheck = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8.5" fill="currentColor" fillOpacity={0.12} />
    <path d="m8.5 12.2 2.3 2.3 4.8-5" />
  </Svg>
);

export const IconTransfer = (p: P) => (
  <Svg {...p}>
    <path d="M5 9h13l-3-3M19 15H6l3 3" />
  </Svg>
);

// =====================================================================
// Ikon Dompet (Cash vs Digital)
// =====================================================================

export const IconCash = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="6.5" width="17" height="11" rx="2" fill="currentColor" fillOpacity={0.12} />
    <circle cx="12" cy="12" r="2.3" />
    <path d="M6.5 9.5h.01M17.5 14.5h.01" />
  </Svg>
);

export const IconDigital = (p: P) => (
  <Svg {...p}>
    <rect x="3.5" y="6" width="17" height="12" rx="2.2" fill="currentColor" fillOpacity={0.12} />
    <path d="M3.5 10h17" />
    <rect x="6.5" y="13" width="3.5" height="2" rx="0.4" />
  </Svg>
);

// =====================================================================
// Ilustrasi Kategori Transaksi (Gaya Sketsa Minimalis Italia)
// =====================================================================

/** Makan & Minum: Cangkir Espresso Italia di atas tatakan */
const CatMakan = (p: P) => (
  <Svg {...p}>
    <path d="M6 10h9v3.5a4.5 4.5 0 0 1-9 0V10Z" fill="currentColor" fillOpacity={0.15} />
    <path d="M15 11h1.5a2 2 0 0 1 0 4H15" />
    <path d="M4.5 18h12" />
    <path d="M9 7.5c0-.8.7-1.2.7-2M12 7.5c0-.8.7-1.2.7-2" />
  </Svg>
);

/** Transportasi: Siluet Skuter / Roda Klasik */
const CatTransport = (p: P) => (
  <Svg {...p}>
    <circle cx="7" cy="16.5" r="2.5" fill="currentColor" fillOpacity={0.15} />
    <circle cx="17" cy="16.5" r="2.5" fill="currentColor" fillOpacity={0.15} />
    <path d="M9.5 16.5h4.5l2-6.5h-3M14.5 7.5h2.5" />
    <path d="M7 14c0-2.5 2-4 4.5-4v4" />
  </Svg>
);

/** Belanja: Tas Tote Minimalis Milan */
const CatBelanja = (p: P) => (
  <Svg {...p}>
    <path d="M6 8.5h12l-1 10.5H7L6 8.5Z" fill="currentColor" fillOpacity={0.14} />
    <path d="M9 8.5V7a3 3 0 0 1 6 0v1.5" />
  </Svg>
);

/** Tagihan & Utilitas: Bohlam Filamen Klasik */
const CatTagihan = (p: P) => (
  <Svg {...p}>
    <path
      d="M9 15.5c-.8-1-1.8-2.2-1.8-4a4.8 4.8 0 0 1 9.6 0c0 1.8-1 3-1.8 4H9Z"
      fill="currentColor"
      fillOpacity={0.14}
    />
    <path d="M9.5 18h5M10.5 20.2h3" />
  </Svg>
);

/** Hiburan: Tiket Teater / Cinema Klasik */
const CatHiburan = (p: P) => (
  <Svg {...p}>
    <path
      d="M4 8.5a1.5 1.5 0 0 1 1.5-1.5h13A1.5 1.5 0 0 1 20 8.5v2a1.8 1.8 0 0 0 0 3v2a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 15.5v-2a1.8 1.8 0 0 0 0-3v-2Z"
      fill="currentColor"
      fillOpacity={0.14}
    />
    <path d="M14 7v10" strokeDasharray="2 2" />
  </Svg>
);

/** Kesehatan: Simbol Apotek / Medis Minimalis */
const CatKesehatan = (p: P) => (
  <Svg {...p}>
    <rect x="4.5" y="4.5" width="15" height="15" rx="4" fill="currentColor" fillOpacity={0.12} />
    <path d="M12 8.5v7M8.5 12h7" />
  </Svg>
);

/** Pendidikan: Buku Terbuka */
const CatPendidikan = (p: P) => (
  <Svg {...p}>
    <path
      d="M12 7c-2.2-1.2-5-1.2-7.5-.5v11c2.5-.7 5.3-.7 7.5.5 2.2-1.2 5-1.2 7.5-.5v-11C17 5.8 14.2 5.8 12 7Z"
      fill="currentColor"
      fillOpacity={0.13}
    />
    <path d="M12 7v11" />
  </Svg>
);

/** Uang Jajan / Pemasukan: Koin & Dompet Klasik */
const CatUangJajan = (p: P) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="7.5" fill="currentColor" fillOpacity={0.14} />
    <circle cx="12" cy="12" r="4.8" strokeDasharray="2 1.5" />
    <path d="M12 9.5v5" />
  </Svg>
);

/** Lainnya: Ornamen Bintang Kompas Romawi */
const CatLainnya = (p: P) => (
  <Svg {...p}>
    <path
      d="M12 4.5 13.8 10.2 19.5 12l-5.7 1.8L12 19.5l-1.8-5.7L4.5 12l5.7-1.8L12 4.5Z"
      fill="currentColor"
      fillOpacity={0.14}
    />
  </Svg>
);

export function CategoryIcon({ id, ...props }: P & { id: string }) {
  switch (id) {
    case "makan":
      return <CatMakan {...props} />;
    case "transportasi":
      return <CatTransport {...props} />;
    case "belanja":
      return <CatBelanja {...props} />;
    case "tagihan":
      return <CatTagihan {...props} />;
    case "hiburan":
      return <CatHiburan {...props} />;
    case "kesehatan":
      return <CatKesehatan {...props} />;
    case "pendidikan":
      return <CatPendidikan {...props} />;
    case "uang_jajan":
      return <CatUangJajan {...props} />;
    default:
      return <CatLainnya {...props} />;
  }
}

// =====================================================================
// Ilustrasi Target Tabungan (Savings Goals) — Bebas Emoji
// =====================================================================

export const GOAL_ICONS = [
  { id: "travel", label: "Perjalanan" },
  { id: "shield", label: "Darurat" },
  { id: "device", label: "Gadget" },
  { id: "study", label: "Kuliah" },
  { id: "vespa", label: "Kendaraan" },
  { id: "home", label: "Kos / Hunian" },
  { id: "music", label: "Hobi" },
  { id: "vault", label: "Simpanan" },
] as const;

export function GoalIcon({ name, ...props }: P & { name: string }) {
  // Mendukung key baru maupun data emoji lama dari Supabase agar tetap tampil sebagai gambar vektor
  switch (name) {
    case "travel":
    case "🏝️":
    case "✈️":
      return (
        <Svg {...props}>
          <circle cx="12" cy="12" r="7.5" fill="currentColor" fillOpacity={0.12} />
          <path d="M4.5 12h15M12 4.5c2.2 2.2 2.2 12.8 0 15M12 4.5c-2.2 2.2-2.2 12.8 0 15" />
        </Svg>
      );
    case "shield":
    case "🛡️":
      return (
        <Svg {...props}>
          <path
            d="M12 4 5.5 6.8v4.8c0 4.2 2.8 7.5 6.5 8.9 3.7-1.4 6.5-4.7 6.5-8.9V6.8L12 4Z"
            fill="currentColor"
            fillOpacity={0.14}
          />
        </Svg>
      );
    case "device":
    case "💻":
    case "📱":
      return (
        <Svg {...props}>
          <rect x="4.5" y="5.5" width="15" height="10.5" rx="1.8" fill="currentColor" fillOpacity={0.14} />
          <path d="M3 18.5h18" />
        </Svg>
      );
    case "study":
    case "🎓":
      return <CatPendidikan {...props} />;
    case "vespa":
    case "🛵":
      return <CatTransport {...props} />;
    case "home":
      return <IconHome {...props} />;
    case "music":
    case "🎸":
      return <CatHiburan {...props} />;
    default:
      return <IconArch {...props} />;
  }
}
