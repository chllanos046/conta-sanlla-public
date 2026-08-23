import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  const svg = readFileSync(join(process.cwd(), "public/logo.svg"), "utf-8");
  const base64 = `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
  return new ImageResponse(<img src={base64} width={512} height={512} />, { ...size });
}
