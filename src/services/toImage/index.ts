import { toImageProvider } from "./toimage.js";
import { PDF2PicProvider } from "./toimage.pdf2pic.js";

export function getToImageProvider(): toImageProvider {
  const provider = (process.env.TOPIC_PROVIDER || "default").toLowerCase();
  switch (provider) {
    case "pdf2pic":
      return new PDF2PicProvider();
    default:
      return new PDF2PicProvider();
  }
}
