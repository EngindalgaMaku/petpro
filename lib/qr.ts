import QRCode from "qrcode";

/**
 * Generates an SVG string representation of a QR code.
 */
export async function generateQrSvg(text: string, size = 128): Promise<string> {
  try {
    return await QRCode.toString(text, {
      type: "svg",
      width: size,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });
  } catch (err) {
    console.error("QR Generation failed:", err);
    return "";
  }
}

/**
 * Generates a base64 Data URL for embedding into <img> tags.
 */
export async function generateQrDataUrl(text: string, size = 160): Promise<string> {
  try {
    return await QRCode.toDataURL(text, {
      width: size,
      margin: 1,
      color: {
        dark: "#000000",
        light: "#ffffff",
      },
    });
  } catch (err) {
    console.error("QR DataURL generation failed:", err);
    return "";
  }
}
