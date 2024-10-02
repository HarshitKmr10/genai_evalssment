import { tool } from "@langchain/core/tools";
import axios from "axios";
import { z } from "zod";

const leetcodeApiBase = "https://alfa-leetcode-api.onrender.com";

export const highlightText = tool(
  async (input) => {
    let { text, keywords } = input;

    keywords.forEach((keyword) => {
      const regex = new RegExp(`(${keyword})`, "gi");
      text = text.replace(
        regex,
        (match) =>
          `<mark className="bg-[#777bf3] bg-opacity-20">${match}</mark>`,
      );
    });

    return text;
  },
  {
    name: "highlight_text",
    description:
      "Highlight keywords in a text by wrapping them with a custom HTML <mark> tag.",
    schema: z.object({
      text: z.string(),
      keywords: z.array(z.string()),
    }),
  },
);

// ------------------------------------------------------------------------------------------------

// Recheck this tool
export const highlightTextInLeetCode = tool(
  async (input) => {
    const descriptionElement = document.body.querySelector(
      "[data-track-load='description_content']",
    );
    if (!descriptionElement) return;

    let highlightedHtml = descriptionElement.innerHTML;
    input.keywords.forEach((keyword) => {
      const regex = new RegExp(`(${keyword})`, "gi");
      highlightedHtml = highlightedHtml.replace(
        regex,
        (match) => `<mark style="background-color: #ffff0069;">${match}</mark>`,
      );
    });

    // Update the innerHTML of the description element with highlighted text
    descriptionElement.innerHTML = highlightedHtml;
  },
  {
    name: "highlight_text_in_leetcode",
    description: "Highlight keywords in the LeetCode problem description.",
    schema: z.object({
      keywords: z.array(z.string()),
    }),
  },
);

// ------------------------------------------------------------------------------------------------

export const fetchOfficialSolution = tool(
  async (input) => {
    const url = `${leetcodeApiBase}/officialSolution?titleSlug=${input.titleSlug}`;

    try {
      const response = await axios.get(url);
      const solutionData = response.data?.data?.question?.solution;

      if (solutionData) {
        let { content } = solutionData;
        const relevantSolution = extractRelevantSolution(content);

        return {
          solution: relevantSolution,
          url: `https://leetcode.com/problems/${input.titleSlug}/solution/`,
        };
      } else {
        console.warn("No solution found for the given problem.");
        return null;
      }
    } catch (error) {
      console.error("Error fetching official solution:", error);
      return null;
    }
  },
  {
    name: "fetch_official_solution",
    description:
      "Fetch the official solution for a LeetCode problem based on its title slug.",
    schema: z.object({
      titleSlug: z.string(),
    }),
  },
);

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
