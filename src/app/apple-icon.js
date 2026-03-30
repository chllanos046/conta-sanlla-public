import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "#1976d2",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: "20%",
        }}
      >
        <span
          style={{
            color: "white",
            fontSize: 72,
            fontWeight: 700,
            fontFamily: "sans-serif",
          }}
        >
          CS
        </span>
      </div>
    ),
    { ...size }
  );
}
