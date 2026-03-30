import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
            fontSize: 200,
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
