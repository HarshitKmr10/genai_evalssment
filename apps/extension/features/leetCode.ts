import axios from "axios";
import {
  type FunctionDeclaration,
  GoogleGenerativeAI,
  SchemaType,
} from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.EXTENSION_PUBLIC_GOOGLE_API_KEY!,
);

const leetcodeApiBase = "https://alfa-leetcode-api.onrender.com";

interface LeetCodeQuestion {
  title: string;
  url: string;
  difficulty: string;
  tags: string[];
  description: string;
}

interface OfficialSolution {
  solution: string;
  url: string;
}

interface LeetCodeArgs {
  tags: string[];
  titleSlug: string;
}

async function fetchSimilarProblems({
  tags,
}: {
  tags: string[];
}): Promise<LeetCodeQuestion[]> {
  const tagString = tags.join("+");
  const url = `${leetcodeApiBase}/problems?tags=${tagString}&limit=1`;

  try {
    const response = await axios.get(url);
    const problemList = response.data.problemsetQuestionList;

    if (!problemList || problemList.length === 0) {
      console.warn("No problems found for the given tags.");
      return [];
    }
    const { titleSlug } = problemList[0];

    const detailUrl = `${leetcodeApiBase}/select?titleSlug=${titleSlug}`;
    const detailResponse = await axios.get(detailUrl);
    const problemDetails = detailResponse.data;

    return [
      {
        title: problemDetails.questionTitle,
        url: `https://leetcode.com/problems/${problemDetails.titleSlug}`,
        difficulty: problemDetails.difficulty,
        tags: problemDetails.topicTags.map((tag: any) => tag.name),
        description: problemDetails.question,
      },
    ];
  } catch (error) {
    console.error("Error fetching similar problems:", error);
    return [];
  }
}

async function fetchOfficialSolution({
  titleSlug,
}: {
  titleSlug: string;
}): Promise<OfficialSolution | null> {
  const url = `${leetcodeApiBase}/officialSolution?titleSlug=${titleSlug}`;

  try {
    const response = await axios.get(url);
    const solutionData = response.data?.data?.question?.solution;

    if (solutionData) {
      let { content } = solutionData;
      const relevantSolution = extractRelevantSolution(content);

      return {
        solution: relevantSolution,
        url: `https://leetcode.com/problems/${titleSlug}/solution/`,
      };
    } else {
      console.warn("No solution found for the given problem.");
      return null;
    }
  } catch (error) {
    console.error("Error fetching official solution:", error);
    return null;
  }
}

function extractRelevantSolution(content: string): string {
  content = content.replace(
    /## Video Solution[\s\S]+?(?=## Solution Article)/g,
    "",
  );
  content = content.replace(/<iframe[^>]*><\/iframe>/g, "");
  content = content.replace(/<[^>]+>/g, "");
  content = content.trim();
  const sections = content.split(/---/g);
  const relevantSections = sections.filter(
    (section) =>
      section.includes("Approach") ||
      section.includes("Algorithm") ||
      section.includes("Complexity"),
  );
  return relevantSections.join("\n\n").trim();
}

// Define function declarations

const fetchSimilarProblemsFunctionDeclaration: FunctionDeclaration = {
  name: "fetchSimilarProblems",
  description:
    "Fetch similar LeetCode problems based on tags and return detailed problem information using the titleSlug.",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      tags: {
        type: SchemaType.ARRAY,
        items: {
          type: SchemaType.STRING,
        },
        description: "List of tags to find similar LeetCode problems.",
      },
    },
    required: ["tags"],
  },
};

const fetchOfficialSolutionFunctionDeclaration: FunctionDeclaration = {
  name: "fetchOfficialSolution", // This matches the actual function name
  description:
    "Fetch the solution for a LeetCode problem and provides the official solution url",
  parameters: {
    type: SchemaType.OBJECT,
    properties: {
      titleSlug: {
        type: SchemaType.STRING,
        description:
          "The titleSlug of the problem to get the official solution.",
      },
    },
    required: ["titleSlug"],
  },
};

export const leetCodeModel = genAI.getGenerativeModel({
  systemInstruction:
    "You are a helpful Data Structures and Algorithms assistant specialised in LeetCode problems. Your job is to recommend the user with links of the problems and their solutions. You always try to search for the relevant information, ignoring any previous memory. Do not recommend any information before searching it. Always output the response in markdown format.",
  model: "gemini-1.5-flash",
  tools: [
    {
      functionDeclarations: [
        fetchSimilarProblemsFunctionDeclaration,
        fetchOfficialSolutionFunctionDeclaration,
        // fetchDissimilarProblemFunctionDeclaration, // Can be added later
      ],
    },
  ],
  generationConfig: {
    temperature: 0.1,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2048,
  },
});

const chat = leetCodeModel.startChat();

export async function leetCode(query: string) {
  try {
    const prompt = query;
    const result = await chat.sendMessage(prompt);
    const functionCalls = result.response.functionCalls();

    const functions: Record<string, (args: any) => Promise<any>> = {
      fetchSimilarProblems: fetchSimilarProblems,
      fetchOfficialSolution: fetchOfficialSolution,
      // fetchDissimilarProblem: fetchDissimilarProblem, // Add later if needed
    };
    if (!functionCalls) return result.response.text();

    const functionResponses = await Promise.all(
      functionCalls.map(async (call) => {
        const apiResponse = await functions[call.name](call.args);
        console.log("LeetCode Suggestions:", apiResponse);
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
