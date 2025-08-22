import { AiProvider } from "./ai.interface.js";
import { MockAi } from "./ai.mock.js";
import { OpenAiProvider } from "./ai.openai.js";

export function getAiProvider(): AiProvider {
  const provider = (process.env.AI_PROVIDER || "mock").toLowerCase();
  switch (provider) {
    case "openai":
      return new OpenAiProvider();
    case "mock":
    default:
      return new MockAi();
  }
}
