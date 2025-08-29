import { preprocessProvider } from "./preprocess.js";
import { sharpPreprocess } from "./preprocess.sharp.js";
// import { canvasPreprocess } from "./preprocess.canvas.js";
import { mockPreprocess } from "./preprocess.mock.js";

export function getPreprocessProvider(): preprocessProvider {
  const provider = (process.env.PRE_PROCESS_PROVIDER || "default").toLowerCase();
  switch (provider) {
    case "sharp":
      return new sharpPreprocess();
    // case "canvas":
      // return new canvasPreprocess();
    case "mock":
      return new mockPreprocess();
    default:
      return new mockPreprocess();
  }
}
