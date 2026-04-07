import { ImageResponse } from "next/og";
import { readFileSync } from "fs";
import { join } from "path";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  const logoData = readFileSync(join(process.cwd(), "resources/logo.png"));
  const base64 = `data:image/png;base64,${logoData.toString("base64")}`;
  return new ImageResponse(
    <img src={base64} width={180} height={180} />,
    { ...size }
  );
}
