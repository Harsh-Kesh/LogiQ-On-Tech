export type NavLink = {
  key: string;
  label: string;
  href: string;
};

export const NAV_LINKS: NavLink[] = [
  { key: "home", label: "Home", href: "/" },
  { key: "about", label: "About Us", href: "/about" },
  { key: "products", label: "Products", href: "/products" },
  { key: "industries", label: "Industries", href: "/industries" },
  { key: "solutions", label: "Solutions", href: "/solutions" },
  { key: "partners", label: "Partners", href: "/partners" },
  { key: "retail-stores", label: "Retail Stores", href: "/retail-stores" },
  { key: "buzz", label: "LogiQ-On Buzz", href: "/buzz" },
  { key: "contact", label: "Contact Us", href: "/contact" },
];

export type SocialLink = {
  key: "facebook" | "instagram";
  label: string;
  href: string;
};

export const SOCIAL_LINKS: SocialLink[] = [
  { key: "facebook", label: "Facebook", href: "https://www.facebook.com/LogiqOnTech" },
  { key: "instagram", label: "Instagram", href: "https://www.instagram.com/logiqontech/" },
];

export const UTILITY_LINKS: NavLink[] = [
  { key: "request-demo", label: "Request Demo", href: "/request-demo" },
  { key: "request-quote", label: "Request Quote", href: "/request-quote" },
  { key: "customer-login", label: "Customer Login", href: "/auth/login" },
  { key: "vendor-login", label: "Vendor Login", href: "/vendor-login" },
];

export function getAssetPath(path: string): string {
  if (!path) return "";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  if (basePath && (cleanPath === basePath || cleanPath.startsWith(`${basePath}/`))) {
    return cleanPath;
  }
  return `${basePath}${cleanPath}`;
}
