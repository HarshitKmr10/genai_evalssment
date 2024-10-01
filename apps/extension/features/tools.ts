import { tool } from '@langchain/core/tools';
import axios from 'axios';
import { z } from 'zod';

interface Article {
  title: string;
  url: string;
  snippet: string;
}
interface Video {
  title: string;
  url: string;
  channel: string;
  views: string;
}

const leetcodeApiBase = "https://alfa-leetcode-api.onrender.com";

export const getRelatedArticlesFromGFG = tool(
  async (input) => {
    const encodedQuery = encodeURIComponent(input.query);
    const searchURL = `https://recommendations.geeksforgeeks.org/api/v1/global-search?products=articles&articles_count=${input.numResults}&query=${encodedQuery}`;

    try {
      const response = await axios.get(searchURL);
      const data = response.data;
      const searchResults: Article[] = [];
      const formattedResults = data.detail.articles.data
        .slice(0, input.numResults)
        .map(
          (article:any) => {
        searchResults.push({
          title: article.post_title,
          url: article.post_url,
          snippet: article.post_excerpt,
        });
      }
        );

        return searchResults;
    } catch (error) {
      console.error("Error fetching data from GeeksforGeeks:", error);
      return [];
    }
  },
  {
    name: "get_related_articles_from_gfg",
    description: "Fetch related articles from GeeksforGeeks based on a query.",
    schema: z.object({
      query: z.string(),
      numResults: z.number(),
    }),
  }
);

// ------------------------------------------------------------------------------------------------

export const getRelatedArticlesFromWikipedia = tool(
  async (input) => {
    const url = `https://en.wikipedia.org/w/api.php`;
    const params = {
      action: "query",
      format: "json",
      list: "search",
      srsearch: input.query,
      srlimit: input.numResults,
      srprop: "snippet",
    };

    try {
      const response = await axios.get(url, { params });
      const data = response.data;

      const searchResults: Article[] = [];
      const formattedResults = data.query?.search
        .slice(0, input.numResults)
        .map((article: any) => {
          searchResults.push({
            title: article.title,
            url: `https://en.wikipedia.org/?curid=${article.pageid}`,
            snippet: article.snippet,
          });
        });

      return searchResults;
    } catch (error) {
      console.error("Error fetching data from Wikipedia:", error);
      return [];
    }
  },
  {
    name: "get_related_articles_from_wikipedia",
    description: "Fetch related articles from Wikipedia based on a query.",
    schema: z.object({
      query: z.string(),
      numResults: z.number(),
    }),
  }
);

// ------------------------------------------------------------------------------------------------

export const getRelatedVideosFromYouTube = tool(
  async (input) => {
    console.log("I am being called", input.query);
    const searchQuery = encodeURIComponent(input.query);
    const url = `https://www.youtube.com/results?search_query=${searchQuery}`;

    const headers = {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
    };

    try {
      const response = await axios.get(url, { headers });
      const matches = response.data.match(/var ytInitialData = (.+?);<\/script>/);

      if (matches) {
        const data = JSON.parse(matches[1]);
        const videoData =
          data.contents.twoColumnSearchResultsRenderer.primaryContents
            .sectionListRenderer.contents[0].itemSectionRenderer.contents;

        const videoResults: Video[] = [];
        const formattedResults = videoData
          .filter((item: any) => item.videoRenderer)
          .slice(0, input.numResults)
          .map((item: any) => {
            const video = item.videoRenderer;
            videoResults.push({
              title: video.title.runs[0].text,
              url: `https://www.youtube.com/watch?v=${video.videoId}`,
              channel: video.ownerText.runs[0].text,
              views: video.viewCountText?.simpleText || "N/A",
            });
          });

        console.log(videoResults);
        return JSON.stringify(videoResults);
      } else {
        console.error("Could not extract video data from YouTube page.");
        return [];
      }
    } catch (error) {
      console.error("Error fetching data from YouTube:", error);
      return [];
    }
  },
  {
    name: "get_related_videos_from_youtube",
    description: "Fetch related videos from YouTube based on a query.",
    schema: z.object({
      query: z.string(),
      numResults: z.number(),
    }),
  }
);

// ------------------------------------------------------------------------------------------------

export const highlightText = tool(
  async (input) => {
    let { text, keywords } = input;

    keywords.forEach((keyword) => {
      const regex = new RegExp(`(${keyword})`, "gi");
      text = text.replace(
        regex,
        (match) => `<mark className="bg-[#777bf3] bg-opacity-20">${match}</mark>`,
      );
    });

    return text;
  },
  {
    name: "highlight_text",
    description: "Highlight keywords in a text by wrapping them with a custom HTML <mark> tag.",
    schema: z.object({
      text: z.string(),
      keywords: z.array(z.string()),
    }),
  }
);

// ------------------------------------------------------------------------------------------------

// Recheck this tool
export const highlightTextInLeetCode = tool(
  async (input) => {
    const descriptionElement = document.body.querySelector(
      "[data-track-load='description_content']"
    );
    if (!descriptionElement) return;

    let highlightedHtml = descriptionElement.innerHTML;
    input.keywords.forEach((keyword) => {
      const regex = new RegExp(`(${keyword})`, "gi");
      highlightedHtml = highlightedHtml.replace(
        regex,
        (match) => `<mark style="background-color: #ffff0069;">${match}</mark>`
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
  }
);

// ------------------------------------------------------------------------------------------------

export const fetchSimilarProblems = tool(
  async (input) => {
    try {
      const url = `${leetcodeApiBase}/select?titleSlug=${input.titleSlug}`;
      const response = await axios.get(url);
      
      if (response.status !== 200) {
        throw new Error('Failed to fetch LeetCode question');
      }

      const data = response.data;
      const similarQuestions = JSON.parse(data.similarQuestions || '[]');
      const similarQuestionsWithUrls = similarQuestions.map((question: any) => ({
        ...question,
        url: `https://leetcode.com/problems/${question.titleSlug}`,
      }));

      console.log(similarQuestionsWithUrls);
      
      return {
        ...data,
        similarQuestions: similarQuestionsWithUrls,
      };

    } catch (error) {
      console.error('Error fetching LeetCode question info:', error);
      throw new Error('Failed to fetch LeetCode question information');
    }
  },
  {
    name: "fetch_similar_problems",
    description: "Fetch similar LeetCode problems based on a title slug.",
    schema: z.object({
      titleSlug: z.string(),
    }),
  }
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
    description: "Fetch the official solution for a LeetCode problem based on its title slug.",
    schema: z.object({
      titleSlug: z.string(),
    }),
  }
);

function extractRelevantSolution(content: string): string {
  content = content.replace(
    /## Video Solution[\s\S]+?(?=## Solution Article)/g,
    ""
  );
  content = content.replace(/<iframe[^>]*><\/iframe>/g, "");
  content = content.replace(/<[^>]+>/g, "");
  content = content.trim();
  
  const sections = content.split(/---/g);
  const relevantSections = sections.filter(
    (section) =>
      section.includes("Approach") ||
      section.includes("Algorithm") ||
      section.includes("Complexity")
  );
  
  return relevantSections.join("\n\n").trim();
}

// ------------------------------------------------------------------------------------------------

export const leetcodeQuestionTag = tool(
  async (input) => {
    try {
      const url = `${leetcodeApiBase}/select?titleSlug=${input.titleSlug}`;
      const response = await axios.get(url);

      if (response.status !== 200) {
        throw new Error('Failed to fetch LeetCode question');
      }

      const data = response.data;
      const questionTags = data.topicTags;

      return JSON.stringify(questionTags);
    } catch (error) {
      console.error('Error fetching LeetCode question info:', error);
      throw new Error('Failed to fetch LeetCode question information');
    }
  },
  {
    name: "leetcode_question_tag",
    description: "Fetch the tags associated with a LeetCode question based on its title slug.",
    schema: z.object({
      titleSlug: z.string(),
    }),
  }
);


