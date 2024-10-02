import { ChatVertexAI } from "@langchain/google-vertexai";

export const llm = new ChatVertexAI({
  modelName: "gemini-1.5-flash",
  temperature: 0,
  apiKey: process.env.EXTENSION_PUBLIC_GOOGLE_API_KEY,
});
