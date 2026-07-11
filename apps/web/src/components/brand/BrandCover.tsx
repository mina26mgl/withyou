"use client";

export default function BrandCover({ initial }: { initial: string }) {
  return (
    <div
      className="w-full h-full"
      style={{
        background: `linear-gradient(135deg,
          #c8e6c9 0%,
          #a5d6a7 25%,
          #81c784 50%,
          #4caf50 75%,
          #07320D 100%)`,
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* Decorative blobs */}
      <div
        style={{
          position: "absolute",
          top: "-40px",
          right: "-40px",
          width: "180px",
          height: "180px",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.12)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "20px",
          left: "-30px",
          width: "120px",
          height: "120px",
          borderRadius: "50%",
          background: "rgba(255,255,255,0.08)",
        }}
      />
      {/* Watermark initial */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          fontFamily: "var(--font-eb-garamond), Georgia, serif",
          fontSize: "160px",
          fontWeight: 400,
          color: "rgba(255,255,255,0.10)",
          lineHeight: 1,
          userSelect: "none",
          pointerEvents: "none",
        }}
      >
        {initial}
      </div>
    </div>
  );
}