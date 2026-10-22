import { ImageResponse } from "next/og";

/**
 * Ikon aplikasi Bilancio: lengkungan (arch) Romawi berwarna espresso
 * dengan "matahari limoncello" di dalamnya, di atas latar avorio.
 * Dibuat dari kode sehingga tidak perlu file gambar terpisah.
 */
export function renderAppIcon(size: number) {
  const archW = size * 0.5;
  const archH = size * 0.58;
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          background: "#f7f2e8",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            width: archW,
            height: archH,
            background: "#2b211c",
            borderTopLeftRadius: archW / 2,
            borderTopRightRadius: archW / 2,
            borderBottomLeftRadius: size * 0.03,
            borderBottomRightRadius: size * 0.03,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            paddingBottom: archH * 0.12,
          }}
        >
          <div
            style={{
              width: archW * 0.36,
              height: archW * 0.36,
              borderRadius: archW,
              background: "#e3bc3f",
            }}
          />
        </div>
        <div style={{ display: "flex", marginTop: size * 0.05 }}>
          <div style={{ width: size * 0.07, height: size * 0.018, background: "#6b7a3a" }} />
          <div style={{ width: size * 0.07, height: size * 0.018, background: "#e9dfcc" }} />
          <div style={{ width: size * 0.07, height: size * 0.018, background: "#c0532f" }} />
        </div>
      </div>
    ),
    { width: size, height: size },
  );
}
