import Link from "next/link";
import Image from "next/image";
import { getAssetPath } from "@/lib/nav";

export default function Brand() {
  return (
    <Link href="/" className="brand" style={{ display: "flex", alignItems: "center", textDecoration: "none", gap: 10 }}>
      <Image
        src={getAssetPath("/images/logo.png")}
        alt="LogiQ-On Logo"
        width={160}
        height={45}
        style={{
          height: "auto",
          maxHeight: 42,
          width: "auto",
          objectFit: "contain"
        }}
        priority
      />
    </Link>
  );
}
