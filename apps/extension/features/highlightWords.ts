import {
  FunctionCallingMode,
  GoogleGenerativeAI,
  SchemaType,
  type FunctionDeclaration,
} from "@google/generative-ai";
import { extractProblemHTML, extractProblemText } from "../content/leetcode";

const genAI = new GoogleGenerativeAI(
  process.env.EXTENSION_PUBLIC_GOOGLE_API_KEY!,
);

function highlightText({
  text,
  keywords,
}: {
  text: string;
  keywords: string[];
}) {
  keywords.forEach((keyword) => {
    const regex = new RegExp(`(${keyword})`, "gi");
    text = text.replace(
      regex,
      (match) => `<mark className="bg-[#777bf3] bg-opacity-20">${match}</mark>`,
    );
  });
  return text;
}

function highlightTextInLeetCode(keywords: string[]) {
  const descriptionElement = document.body.querySelector(
    "[data-track-load='description_content']",
  );
  if (!descriptionElement) return;

  let highlightedHtml = descriptionElement.innerHTML;
  keywords.forEach((keyword) => {
    const regex = new RegExp(`(${keyword})`, "gi");
    highlightedHtml = highlightedHtml.replace(
      regex,
      (match) => `<mark style="background-color: ##ffff0069;">${match}</mark>`,
    );
  });

  // Update the innerHTML of the description element with highlighted text
  descriptionElement.innerHTML = highlightedHtml;
}
const highlightTextFunctionDeclaration: FunctionDeclaration = {
  name: "highlightText",
  description:
    "Highlight specific keywords in a given text. Also highlights the keywords in leetcode UI",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      text: {
        type: SchemaType.STRING,
        description: "The input text to highlight within.",
      },
      keywords: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
        },
        description: "List of keywords to highlight.",
      },
    },
    required: ["text", "keywords"],
  },
};

export const highlightWordsModel = genAI.getGenerativeModel({
  model: "gemini-1.5-flash",
  systemInstruction:
    "If a user asks you to tell about important keywords to look for in the problem, you will firstly extract keywords from the problem statement and then highlight the important terms in this problem statement. Note: Avoid using single letter keywords such as 'n', 'i', 'j', etc or keywords like 'Input', 'Example' or 'Output'. Important: After highlighting words, tell the user that you have highlighted them. ",
  tools: [
    {
      functionDeclarations: [highlightTextFunctionDeclaration],
    },
  ],
  // toolConfig: {
  //   functionCallingConfig: {
  //     mode: FunctionCallingMode.ANY,
  //     allowedFunctionNames: ["highlightText"],
  //   },
  // },
  generationConfig: {
    temperature: 0.1,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
  },
});

const chat = highlightWordsModel.startChat();

export async function highlightWords(query: string) {
  try {
    const prompt = extractProblemText() + "\n\n" + query;
    console.log(prompt);
    console.log(extractProblemHTML());
    const result = await chat.sendMessage(prompt);
    const functionCalls = result.response.functionCalls();

    const functions: Record<string, (args: any) => any> = {
      highlightText: highlightText,
    };

    if (!functionCalls) return result.response.text();

    const functionResponses = await Promise.all(
      functionCalls.map(async (call) => {
        if (call.name === "highlightText") {
          highlightTextInLeetCode(call.args!.keywords);
        }
        const apiResponse = await functions[call.name](call.args);
        console.log("Highlighted Text:", apiResponse);
        return {
          functionResponse: {
            name: call.name,
            response: {
              content: apiResponse,
            },
          },
        };
      }),
    );

    const result2 = await chat.sendMessage(functionResponses);
    console.log(result2.response.text());
    return result2.response.text();
  } catch (error) {
    console.error("Error handling query:", error);
  }
}
