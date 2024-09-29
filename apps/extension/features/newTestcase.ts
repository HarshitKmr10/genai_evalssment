import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.EXTENSION_PUBLIC_GOOGLE_API_KEY!,
);

export const testCaseModel =  genAI.getGenerativeModel({
    model: "gemini-1.5-flash",
    systemInstruction:
      `You are an AI-powered test case generator for a given problem. You will be given a problem statement and you will need to generate a test case for it. You don't just provide the test case to the user but do this while guiding them to think about the problem through the test case themselves. Do not give anything additional apart from the test case and the reasoning behind it.`,
    generationConfig: {
      temperature: 0.1,
      topK: 1,
      topP: 1,
      maxOutputTokens: 2048,
    },
  });

const chat = testCaseModel.startChat();

export async function testCase(query: string) {
  try {
    const response = await chat.sendMessage(query);
    console.log(response.response.text());
    return response.response.text();
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}
