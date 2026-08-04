export type RfidProduct = {
  id: string;
  brand: "Zebra" | "Honeywell" | "GreyOrange";
  model: string;
  category: "Fixed Reader" | "Mobile Reader" | "RFID Printer" | "Tags" | "Software Platform";
  description: string;
  image: string;
  href?: string;
  ctaLabel?: string;
};

export const RFID_PRODUCTS: RfidProduct[] = [
  {
    id: "zebra-fx9600",
    brand: "Zebra",
    model: "FX9600",
    category: "Fixed Reader",
    description: "High-performance fixed RFID reader for dock doors and portals, built for demanding, high-throughput read zones.",
    image: "/images/products/rfid/zebra-fx9600.jpg",
  },
  {
    id: "zebra-fx7500",
    brand: "Zebra",
    model: "FX7500",
    category: "Fixed Reader",
    description: "Compact fixed reader for point-of-sale, kiosk, and smaller-footprint RFID read zones.",
    image: "/images/products/rfid/zebra-fx7500.jpg",
  },
  {
    id: "zebra-atr7000",
    brand: "Zebra",
    model: "ATR7000",
    category: "Fixed Reader",
    description: "Ceiling-mount locationing reader that tracks tagged assets and inventory in real time across the retail floor.",
    image: "/images/products/rfid/zebra-atr7000.jpg",
  },
  {
    id: "honeywell-if2b",
    brand: "Honeywell",
    model: "IF2B",
    category: "Fixed Reader",
    description: "Industrial fixed RFID reader for conveyor and dock automation in warehouse and distribution environments.",
    image: "/images/products/rfid/honeywell-if2b.jpg",
  },
  {
    id: "zebra-rfd40",
    brand: "Zebra",
    model: "RFD40",
    category: "Mobile Reader",
    description: "RFID sled that pairs with a mobile computer for handheld cycle counts and item-level stocktakes.",
    image: "/images/products/rfid/zebra-rfd40.jpg",
  },
  {
    id: "zebra-rfd8500",
    brand: "Zebra",
    model: "RFD8500",
    category: "Mobile Reader",
    description: "Cordless RFID sled that clips to a belt or trigger handle for wide-area, walk-and-scan inventory reads.",
    image: "/images/products/rfid/zebra-rfd8500.jpg",
  },
  {
    id: "zebra-rfd90",
    brand: "Zebra",
    model: "RFD90",
    category: "Mobile Reader",
    description: "Long-range handheld RFID reader for bulk asset tracking and yard or DC-wide inventory sweeps.",
    image: "/images/products/rfid/zebra-rfd90.jpg",
  },
  {
    id: "honeywell-ih40",
    brand: "Honeywell",
    model: "IH40",
    category: "Mobile Reader",
    description: "Ultra-rugged handheld RFID reader for warehouse and industrial teams that need one device for scanning and tag reads.",
    image: "/images/products/rfid/honeywell-ih40.jpg",
  },
  {
    id: "zebra-zc300",
    brand: "Zebra",
    model: "ZC300 Series",
    category: "RFID Printer",
    description: "Card printer with RFID encoding for staff badges, access cards, and secure identification credentials.",
    image: "/images/products/rfid/zebra-zc300.jpg",
  },
  {
    id: "zebra-zxp7",
    brand: "Zebra",
    model: "ZXP Series 7",
    category: "RFID Printer",
    description: "High-volume card printer with RFID encoding for organisations issuing large numbers of secure ID cards.",
    image: "/images/products/rfid/zebra-zxp7.jpg",
  },
  {
    id: "honeywell-it70-tags",
    brand: "Honeywell",
    model: "IT70",
    category: "Tags",
    description: "Rugged RFID tag engineered to survive tough industrial environments for reusable asset and container tracking.",
    image: "/images/products/rfid/honeywell-it70-tags.jpg",
  },
  {
    id: "gstore-greyorange",
    brand: "GreyOrange",
    model: "gStore",
    category: "Software Platform",
    description: "Unified retail SaaS platform pairing hybrid overhead and handheld RFID with real-time inventory intelligence and guided store workflows.",
    image: "/images/gstore/feature-hybrid-rfid.webp",
    href: "/solutions/retail-rfid-solutions/gstore-greyorange",
    ctaLabel: "View gStore Platform",
  },
];
