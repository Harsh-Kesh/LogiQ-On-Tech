export type MobileComputer = {
  id: string;
  brand: "Honeywell" | "CipherLab" | "Zebra";
  model: string;
  category: "Handheld" | "Vehicle Mount" | "Tablet" | "Wearable";
  description: string;
  image: string;
};

export const MOBILE_COMPUTERS: MobileComputer[] = [
  {
    id: "honeywell-ct47",
    brand: "Honeywell",
    model: "CT47",
    category: "Handheld",
    description: "Enterprise Android handheld built for all-day scanning, with a bright display and long-shift battery life.",
    image: "/images/products/mobile-computers/honeywell-ct47.jpg",
  },
  {
    id: "honeywell-ck65",
    brand: "Honeywell",
    model: "CK65",
    category: "Handheld",
    description: "Ultra-rugged mobile computer for the toughest warehouse and yard conditions, built to survive repeated drops and washdowns.",
    image: "/images/products/mobile-computers/honeywell-ck65.jpg",
  },
  {
    id: "honeywell-cn80g",
    brand: "Honeywell",
    model: "CN80G",
    category: "Handheld",
    description: "Rugged mobile computer with GNSS positioning, purpose-built for field service and outdoor logistics work.",
    image: "/images/products/mobile-computers/honeywell-cn80g.jpg",
  },
  {
    id: "honeywell-eda52",
    brand: "Honeywell",
    model: "EDA52",
    category: "Handheld",
    description: "Slim, phone-style Android computer that brings enterprise scanning to a familiar smartphone form factor.",
    image: "/images/products/mobile-computers/honeywell-eda52.jpg",
  },
  {
    id: "honeywell-eda61k",
    brand: "Honeywell",
    model: "EDA61K",
    category: "Handheld",
    description: "Keypad Android mobile computer for DSD, transportation, and retail teams who prefer physical keys.",
    image: "/images/products/mobile-computers/honeywell-eda61k.jpg",
  },
  {
    id: "honeywell-ct30-xp",
    brand: "Honeywell",
    model: "CT30 XP",
    category: "Handheld",
    description: "Compact rugged Android computer sized for one-handed use without compromising on scan performance.",
    image: "/images/products/mobile-computers/honeywell-ct30-xp.jpg",
  },
  {
    id: "cipherlab-rk26",
    brand: "CipherLab",
    model: "RK26",
    category: "Handheld",
    description: "Rugged Android handheld for warehouse and retail operations that need dependable everyday scanning.",
    image: "/images/products/mobile-computers/cipherlab-rk26.jpg",
  },
  {
    id: "zebra-et4x",
    brand: "Zebra",
    model: "ET4X Series",
    category: "Tablet",
    description: "Rugged Android tablet for vehicle-mount and handheld use across warehouse, transport, and field applications.",
    image: "/images/products/mobile-computers/zebra-et4x.jpg",
  },
  {
    id: "zebra-et5x",
    brand: "Zebra",
    model: "ET5X Series",
    category: "Tablet",
    description: "Larger rugged tablet for dashboard-mounted route planning, proof-of-delivery, and in-cab applications.",
    image: "/images/products/mobile-computers/zebra-et5x.jpg",
  },
  {
    id: "honeywell-cw45",
    brand: "Honeywell",
    model: "CW45",
    category: "Wearable",
    description: "Wrist-worn wearable computer that frees both hands for pick, pack, and sort tasks on the warehouse floor.",
    image: "/images/products/mobile-computers/honeywell-cw45.jpg",
  },
];
