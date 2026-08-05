export type BarcodeScanner = {
  id: string;
  brand: "Zebra" | "CipherLab" | "Denso";
  model: string;
  category: "General Purpose" | "Rugged" | "Fixed Mount" | "Portable";
  description: string;
  image: string;
};

export const BARCODE_SCANNERS: BarcodeScanner[] = [
  {
    id: "zebra-ds2200",
    brand: "Zebra",
    model: "DS2200 Series",
    category: "General Purpose",
    description: "Entry-level corded scanner for retail and light industrial counters, reading 1D and 2D barcodes on paper or mobile screens.",
    image: "/images/products/barcode-scanners/zebra-ds2200.jpg",
  },
  {
    id: "zebra-ds4600",
    brand: "Zebra",
    model: "DS4600 Series",
    category: "General Purpose",
    description: "Value-tier area-imager built for high-volume checkout and back-of-store scanning with fast, consistent reads.",
    image: "/images/products/barcode-scanners/zebra-ds4600.jpg",
  },
  {
    id: "zebra-ls2208",
    brand: "Zebra",
    model: "LS2208",
    category: "General Purpose",
    description: "The industry-standard laser scanner for point-of-sale and light-duty stockroom use — reliable, affordable, and widely stocked.",
    image: "/images/products/barcode-scanners/zebra-ls2208.jpg",
  },
  {
    id: "zebra-ds9900",
    brand: "Zebra",
    model: "DS9900 Series",
    category: "General Purpose",
    description: "Hybrid presentation scanner that reads barcodes and captures images, well suited to pharmacy and grocery checkout lanes.",
    image: "/images/products/barcode-scanners/zebra-ds9900.jpg",
  },
  {
    id: "cipherlab-2200",
    brand: "CipherLab",
    model: "2200 Series",
    category: "General Purpose",
    description: "Compact corded 1D/2D scanner offering dependable everyday scanning for retail and light warehouse counters.",
    image: "/images/products/barcode-scanners/cipherlab-2200.jpg",
  },
  {
    id: "cipherlab-2500",
    brand: "CipherLab",
    model: "2500 Series",
    category: "Rugged",
    description: "Business-rugged handheld scanner built to survive repeated drops on the warehouse floor without sacrificing read speed.",
    image: "/images/products/barcode-scanners/cipherlab-2500.jpg",
  },
  {
    id: "zebra-ds3600-dp",
    brand: "Zebra",
    model: "DS3600-DP",
    category: "Rugged",
    description: "Rugged corded scanner purpose-built for direct part marking (DPM) reads on engraved or etched components.",
    image: "/images/products/barcode-scanners/zebra-ds3600-dp.jpg",
  },
  {
    id: "zebra-ds457",
    brand: "Zebra",
    model: "DS457 Series",
    category: "Fixed Mount",
    description: "Compact fixed-mount imager for conveyor and kiosk integration, reading barcodes on the move at production-line speed.",
    image: "/images/products/barcode-scanners/zebra-ds457.jpg",
  },
  {
    id: "denso-qm30",
    brand: "Denso",
    model: "QM30",
    category: "Fixed Mount",
    description: "Compact fixed-mount 2D scanner engineered for tight OEM integration into kiosks, conveyors, and automated equipment.",
    image: "/images/products/barcode-scanners/denso-qm30.jpg",
  },
  {
    id: "zebra-cs60",
    brand: "Zebra",
    model: "CS60",
    category: "Portable",
    description: "Standalone portable scanner with onboard memory for batch counting and stocktakes where a full mobile computer isn't needed.",
    image: "/images/products/barcode-scanners/zebra-cs60.jpg",
  },
];
