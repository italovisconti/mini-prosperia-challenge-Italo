import { toImageProvider } from "./toimage.js";
import { MockToImage } from "./toimage.mock.js";
import { PDF2PicProvider } from "./toimage.pdf2pic.js";

export function getToImageProvider(): toImageProvider {
  const provider = (process.env.TOIMAGE_PROVIDER || "default").toLowerCase();
  switch (provider) {
    case "pdf2pic":
      return new PDF2PicProvider();
    case "mock":
      return new MockToImage();
    default:
      return new MockToImage();
  }
}
