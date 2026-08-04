export type TechnologyType = "Direct Thermal" | "Thermal Transfer" | "Direct Thermal & Thermal Transfer";

export type DesktopPrinter = {
  id: string;
  brand: "Bixolon" | "Honeywell" | "Zebra";
  model: string;
  title: string;
  tagline: string;
  technology: TechnologyType;
  description: string;
  industries: string[];
  specs: {
    resolution: string;
    printSpeed: string;
    printWidth: string;
    interfaces: string[];
    mediaHandling?: string;
    ribbonCapacity?: string;
  };
  image: string;
  highlighted?: boolean;
};

export const DESKTOP_PRINTERS: DesktopPrinter[] = [
  {
    id: "bixolon-xd3-40",
    brand: "Bixolon",
    model: "XD3-40 Series",
    title: "Compact and Affordable 4-inch Label Printer",
    tagline: "Direct Thermal (XD3-40d) or Thermal Transfer (XD3-40t)",
    technology: "Direct Thermal & Thermal Transfer",
    description:
      "The orange and black XD3-series encompasses a durable, easy-to-use design aligned with BIXOLON's industrial line. Ideal for receipts, tags, and shipping labels in roll or fanfold formats, featuring optional peeler and Ethernet options.",
    industries: ["Retail", "Healthcare", "Logistics", "Warehouse"],
    specs: {
      resolution: "203 dpi",
      printSpeed: "Up to 5 ips (127 mm/s)",
      printWidth: "104 mm (4.09 in)",
      interfaces: ["USB 2.0", "Serial", "10/100 Ethernet"],
      mediaHandling: "Standard Tear-off, optional Peeler",
    },
    image: "/images/products/desktop-printers/bixolon-xd3-40.jpg",
    highlighted: true,
  },
  {
    id: "bixolon-xd5-40",
    brand: "Bixolon",
    model: "XD5-40 Series",
    title: "Robust & Highly Featured 4-inch Desktop Printer",
    tagline: "Direct Thermal (XD5-40d) or Thermal Transfer (XD5-40t)",
    technology: "Direct Thermal & Thermal Transfer",
    description:
      "Full compatibility with SLCS™, BPL-Z™, and BPL-E™ programming languages with Smart Switch capabilities. Features tool-less print head and platen roller maintenance, 300 dpi high-res option, and Wi-Fi 802.11a/b/g/n connectivity.",
    industries: ["Healthcare", "Manufacturing", "Retail", "Logistics"],
    specs: {
      resolution: "203 dpi / 300 dpi",
      printSpeed: "Up to 7 ips (178 mm/s)",
      printWidth: "108 mm (4.25 in)",
      interfaces: ["USB 2.0", "USB Host", "Ethernet", "WLAN 802.11a/b/g/n", "Bluetooth"],
      mediaHandling: "Auto-cutter, Peeler, Adjustable sensors",
    },
    image: "/images/products/desktop-printers/bixolon-xd5-40.jpg",
  },
  {
    id: "bixolon-slp-dx420",
    brand: "Bixolon",
    model: "SLP-DX420",
    title: "4-inch Direct Thermal Desktop Label Printer",
    tagline: "Mid-tier Direct Thermal with versatile connectivity",
    technology: "Direct Thermal",
    description:
      "Compact design ensuring fast label throughput and large internal font/graphic memory. Supplied with free Label Artist™ software for quick format setup and seamless workflow integration.",
    industries: ["Retail", "Courier & Shipping", "Warehouse", "Healthcare"],
    specs: {
      resolution: "203 dpi / 300 dpi",
      printSpeed: "Up to 7 ips (178 mm/s)",
      printWidth: "108 mm (4.25 in)",
      interfaces: ["USB", "Serial", "Parallel", "Ethernet", "WLAN"],
      mediaHandling: "Peel dispenser, Auto-cutter options",
    },
    image: "/images/products/desktop-printers/bixolon-slp-dx420.jpg",
  },
  {
    id: "bixolon-slp-tx420",
    brand: "Bixolon",
    model: "SLP-TX420",
    title: "Compact & Premium 4-inch Thermal Transfer Printer",
    tagline: "High precision ribbon printer in dark grey or healthcare ivory",
    technology: "Thermal Transfer",
    description:
      "Available in dark grey and healthcare ivory enclosures. Accommodates ribbon lengths up to 74 meters. Smart Media Detection™ ensures automatic media recognition across tags and labels.",
    industries: ["Healthcare", "Retail", "Manufacturing", "Logistics"],
    specs: {
      resolution: "203 dpi / 300 dpi",
      printSpeed: "Up to 7 ips (178 mm/s)",
      printWidth: "108 mm (4.25 in)",
      ribbonCapacity: "Up to 74 m (242 ft)",
      interfaces: ["USB", "Serial", "Ethernet", "Bluetooth"],
    },
    image: "/images/products/desktop-printers/bixolon-slp-tx420.jpg",
  },
  {
    id: "honeywell-pc42t-plus",
    brand: "Honeywell",
    model: "PC42T Plus",
    title: "Desktop Thermal Transfer Barcode Printer",
    tagline: "Economical printer for media up to 110 mm wide",
    technology: "Thermal Transfer",
    description:
      "Streamlined PC42T Plus thermal transfer printer engineered for high efficiency. Accommodates large ribbon rolls (up to 300m / 984ft) to reduce downtime and increase label output.",
    industries: ["Retail", "Healthcare", "Logistics", "Manufacturing", "Government", "Education"],
    specs: {
      resolution: "203 dpi",
      printSpeed: "127 mm/s (5.0 ips)",
      printWidth: "110 mm (4.3 in)",
      ribbonCapacity: "300 m (984 ft) / 100 m (328 ft)",
      interfaces: ["USB Device", "USB Host", "Serial", "Ethernet"],
    },
    image: "/images/products/desktop-printers/honeywell-pc42t-plus.jpg",
    highlighted: true,
  },
  {
    id: "honeywell-pc42d",
    brand: "Honeywell",
    model: "PC42D",
    title: "Desktop Direct Thermal Barcode Printer",
    tagline: "Solid double-layer housing with media auto-centering",
    technology: "Direct Thermal",
    description:
      "Features a durable double-layer shell and intuitive media auto-centering. Well-suited for express shipping waybills, lab wristbands, price tags, and receipt printing.",
    industries: ["Healthcare", "Logistics", "Express Shipping", "Retail"],
    specs: {
      resolution: "203 dpi",
      printSpeed: "Up to 200 mm/s (8.0 ips)",
      printWidth: "104 mm (4.1 in)",
      interfaces: ["USB Device", "USB Host", "Serial", "Ethernet"],
      mediaHandling: "Auto-centering paper feed",
    },
    image: "/images/products/desktop-printers/honeywell-pc42d.jpg",
  },
  {
    id: "honeywell-e-class-mark-iii",
    brand: "Honeywell",
    model: "E-Class Mark III",
    title: "Commercial-Grade Desktop Barcode Printer",
    tagline: "Cost-effective, reliable, and energy efficient",
    technology: "Direct Thermal & Thermal Transfer",
    description:
      "Affordable to own and economical to operate. Cuts daily operational costs with low energy consumption and larger media roll capacities to minimize refill downtime.",
    industries: ["Retail", "Healthcare", "Manufacturing", "Logistics", "Hospitality", "Distribution"],
    specs: {
      resolution: "203 dpi / 300 dpi",
      printSpeed: "Up to 6 ips (152 mm/s)",
      printWidth: "108 mm (4.25 in)",
      interfaces: ["USB", "Serial", "Parallel", "Ethernet", "Wireless 802.11b/g"],
    },
    image: "/images/products/desktop-printers/honeywell-e-class-mark-iii.jpg",
  },
  {
    id: "honeywell-pc43t",
    brand: "Honeywell",
    model: "PC43T / PC43D",
    title: "Compact 4-inch Space-Saving Desktop Printer",
    tagline: "Multi-language color LCD or icon user interface",
    technology: "Direct Thermal & Thermal Transfer",
    description:
      "Designed for tight workspaces, the PC43 series delivers fast setup with quick-drop media loading and intuitive color LCD UI. Ideal for transportation, healthcare, and retail environments.",
    industries: ["Healthcare", "Transportation", "Retail", "Courier", "Hospitality"],
    specs: {
      resolution: "203 dpi / 300 dpi",
      printSpeed: "Up to 8 ips (203 mm/s)",
      printWidth: "104 mm (4.1 in)",
      interfaces: ["USB Host", "USB Device", "Ethernet", "Bluetooth 4.0", "Wi-Fi"],
      mediaHandling: "Drop-in media loading",
    },
    image: "/images/products/desktop-printers/honeywell-pc43t.jpg",
  },
  {
    id: "zebra-zd621",
    brand: "Zebra",
    model: "ZD600 Series (ZD621 / ZD620)",
    title: "Premium Desktop Printer for Maximum Performance",
    tagline: "Full-color LCD touch screen with Print DNA software suite",
    technology: "Direct Thermal & Thermal Transfer",
    description:
      "Zebra's flagship 4-inch desktop printer engineered for critical operations. Features a 4.3-inch color touch display, Print DNA security framework, field-upgradeable wireless options, and optional RFID encoding.",
    industries: ["Healthcare", "Retail", "Warehouse", "Manufacturing"],
    specs: {
      resolution: "203 dpi / 300 dpi",
      printSpeed: "Up to 8 ips (203 mm/s)",
      printWidth: "104 mm (4.09 in)",
      interfaces: ["USB", "USB Host", "Ethernet", "Serial", "Wi-Fi 802.11ac", "Bluetooth 4.1"],
      mediaHandling: "Peeler, Cutter, RFID Encoder options",
    },
    image: "/images/products/desktop-printers/zebra-zd621.jpg",
    highlighted: true,
  },
  {
    id: "zebra-zd421",
    brand: "Zebra",
    model: "ZD421 / ZD400 Series",
    title: "Advanced Desktop Printer Built to Perform",
    tagline: "Intuitive 5-icon status display with Print DNA intelligence",
    technology: "Direct Thermal & Thermal Transfer",
    description:
      "Next-generation desktop printing platform replacing the industry-standard GK420. Offers intuitive status icons, modular connectivity, easy media loading, and remote management capability.",
    industries: ["Retail", "Healthcare", "Logistics", "Government"],
    specs: {
      resolution: "203 dpi / 300 dpi",
      printSpeed: "Up to 6 ips (152 mm/s)",
      printWidth: "104 mm (4.09 in)",
      interfaces: ["USB", "USB Host", "Modular Ethernet", "Wi-Fi", "Bluetooth 4.1"],
    },
    image: "/images/products/desktop-printers/zebra-zd421.jpg",
  },
];
