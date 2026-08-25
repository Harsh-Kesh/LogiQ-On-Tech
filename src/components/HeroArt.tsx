import Image from "next/image";
import { getAssetPath } from "@/lib/nav";

export type HeroArtVariant =
  | "about"
  | "products"
  | "buzz"
  | "contact"
  | "demo"
  | "login"
  | "customer-login"
  | "vendor-login";

const PHOTOS: Record<HeroArtVariant, { src: string; alt: string }> = {
  about: {
    src: "https://images.pexels.com/photos/4480984/pexels-photo-4480984.jpeg?auto=compress&cs=tinysrgb&w=1200",
    alt: "Warehouse team discussing operations on the floor",
  },
  products: {
    src: "https://images.pexels.com/photos/4484042/pexels-photo-4484042.jpeg?auto=compress&cs=tinysrgb&w=1200",
    alt: "Warehouse worker managing inventory with a tablet",
  },
  buzz: {
    src: "https://images.pexels.com/photos/5407240/pexels-photo-5407240.jpeg?auto=compress&cs=tinysrgb&w=1200",
    alt: "Hands typing on a laptop keyboard",
  },
  contact: {
    src: "https://images.pexels.com/photos/8204317/pexels-photo-8204317.jpeg?auto=compress&cs=tinysrgb&w=1200",
    alt: "Customer service team wearing headsets in an office",
  },
  demo: {
    src: "https://images.pexels.com/photos/4484154/pexels-photo-4484154.jpeg?auto=compress&cs=tinysrgb&w=1200",
    alt: "Warehouse employee scanning inventory with a tablet and scanner",
  },
  login: {
    src: "https://images.pexels.com/photos/4484042/pexels-photo-4484042.jpeg?auto=compress&cs=tinysrgb&w=800",
    alt: "Warehouse worker checking inventory on a tablet",
  },
  "customer-login": {
    src: "https://images.pexels.com/photos/4484042/pexels-photo-4484042.jpeg?auto=compress&cs=tinysrgb&w=800",
    alt: "Warehouse worker checking inventory on a tablet",
  },
  "vendor-login": {
    src: "https://images.pexels.com/photos/35665496/pexels-photo-35665496.jpeg?auto=compress&cs=tinysrgb&w=800",
    alt: "Forklift moving stacked cardboard boxes in a warehouse",
  },
};

export default function HeroArt({ variant, className }: { variant: HeroArtVariant; className?: string }) {
  const photo = PHOTOS[variant];
  return (
    <div className={`hero-art${className ? ` ${className}` : ""}`}>
      <Image src={getAssetPath(photo.src)} alt={photo.alt} fill sizes="(max-width: 880px) 100vw, 50vw" style={{ objectFit: "cover" }} />
    </div>
  );
}
