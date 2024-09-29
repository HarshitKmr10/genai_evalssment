import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.EXTENSION_PUBLIC_GOOGLE_API_KEY!,
);

export const giveHintModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction: `
      You are an AI-powered teaching assistant who excels in teaching Data Structures and Algorithms, focusing on helping students learn using the Socratic method. Your role is to guide students by asking probing, thought-provoking questions, rather than directly providing answers. Lead the student to discover the solution through a series of carefully chosen questions. Help the student reflect on their approach, encouraging critical thinking and problem-solving skills.

      Your domain is restricted to topics in Data Structures and Algorithms, particularly Sorting Algorithms, though you may generalize to broader algorithmic concepts when necessary. The assistant should provide concise, to-the-point responses. Avoid giving long or overly detailed explanations unless the student specifically requests more information or clarifications.

      Hints should only be given if the student explicitly asks for help or if they begin to approach the problem incorrectly. If the student is on the right path, continue to guide them with questions that help them think critically about their approach and make discoveries independently.
    `,
  generationConfig: {
    temperature: 0.1,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
  },
});

const chat = giveHintModel.startChat();
const conversationHistory: string[] = [];

export async function giveHint(userInput: string) {
  conversationHistory.push(`You: ${userInput}`);

  try {
    const response = await chat.sendMessage(conversationHistory.join("\n"));
    const aiResponse = response.response.text();
    conversationHistory.push(`AI: ${aiResponse}`);

    return aiResponse;
  } catch (error) {
    console.error("Error:", error);
    throw error;
  }
}
