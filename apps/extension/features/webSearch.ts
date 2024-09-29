import axios from "axios";
import {
  type FunctionDeclaration,
  GoogleGenerativeAI,
  SchemaType,
} from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(
  process.env.EXTENSION_PUBLIC_GOOGLE_API_KEY!,
);

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

async function getRelatedArticlesFromGFG({
  query,
  numResults,
}: {
  query: string;
  numResults: number;
}): Promise<Article[]> {
  const encodedQuery = encodeURIComponent(query);
  const searchURL = `https://recommendations.geeksforgeeks.org/api/v1/global-search?products=articles&articles_count=${numResults}&query=${encodedQuery}`;

  try {
    const response = await axios.get(searchURL);
    const data = response.data;

    const searchResults: Article[] = [];
    if (data.status && data.detail.articles) {
      const articles = data.detail.articles.data;
      articles.slice(0, numResults).forEach((article: any) => {
        searchResults.push({
          title: article.post_title,
          url: article.post_url,
          snippet: article.post_excerpt,
        });
      });
    }
    return searchResults;
  } catch (error) {
    console.error("Error fetching data from GeeksforGeeks:", error);
    return [];
  }
}

async function getRelatedArticlesFromWikipedia({
  query,
  numResults,
}: {
  query: string;
  numResults: number;
}): Promise<Article[]> {
  const url = `https://en.wikipedia.org/w/api.php`;
  const params = {
    action: "query",
    format: "json",
    list: "search",
    srsearch: query,
    srlimit: numResults,
    srprop: "snippet",
  };

  try {
    const response = await axios.get(url, { params });
    const data = response.data;

    const searchResults: Article[] = [];
    if (data.query && data.query.search) {
      data.query.search.slice(0, numResults).forEach((article: any) => {
        const title = article.title;
        const pageId = article.pageid;
        const snippet = article.snippet;
        const articleUrl = `https://en.wikipedia.org/?curid=${pageId}`;
        searchResults.push({
          title: title,
          url: articleUrl,
          snippet: snippet,
        });
      });
    }
    return searchResults;
  } catch (error) {
    console.error("Error fetching data from Wikipedia:", error);
    return [];
  }
}

async function getRelatedVideosFromYouTube({
  query,
  numResults,
}: {
  query: string;
  numResults: number;
}): Promise<Video[]> {
  const searchQuery = encodeURIComponent(query);
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
      for (const item of videoData) {
        if (item.videoRenderer) {
          const video = item.videoRenderer;
          videoResults.push({
            title: video.title.runs[0].text,
            url: `https://www.youtube.com/watch?v=${video.videoId}`,
            channel: video.ownerText.runs[0].text,
            views: video.viewCountText?.simpleText || "N/A",
          });
        }
        if (videoResults.length >= numResults) break;
      }
      return videoResults;
    } else {
      console.error("Could not extract video data from YouTube page.");
      return [];
    }
  } catch (error) {
    console.error("Error fetching data from YouTube:", error);
    return [];
  }
}

const getRelatedArticlesFromGFGfunctionDeclaration: FunctionDeclaration = {
  name: "getRelatedArticlesFromGFG",
  parameters: {
    type: SchemaType.OBJECT,
    description: "Get related articles from GeeksforGeeks",
    properties: {
      query: {
        type: SchemaType.STRING,
        description: "The search query string.",
      },
      numResults: {
        type: SchemaType.NUMBER,
        description: "The number of results to retrieve.",
      },
    },
    required: ["query"],
  },
};

const getRelatedArticlesFromWikipediafunctionDeclaration: FunctionDeclaration =
  {
    name: "getRelatedArticlesFromWikipedia",
    description: "Get related articles from Wikipedia",
    parameters: {
      type: SchemaType.OBJECT,
      description: "Get related articles from Wikipedia",
      properties: {
        query: {
          type: SchemaType.STRING,
          description: "The search query string.",
        },
        numResults: {
          type: SchemaType.NUMBER,
          description: "The number of results to retrieve.",
        },
      },
      required: ["query"],
    },
  };

const getRelatedVideosFromYouTubefunctionDeclaration = {
  name: "getRelatedVideosFromYouTube",
  description: "Get related videos from YouTube",
  parameters: {
    type: SchemaType.OBJECT,
    description: "Get related videos from YouTube",
    properties: {
      query: {
        type: SchemaType.STRING,
        description: "The search query string.",
      },
      numResults: {
        type: SchemaType.NUMBER,
        description: "The number of results to retrieve.",
      },
    },
    required: ["query"],
  },
};

export const webSearchModel = genAI.getGenerativeModel({
  systemInstruction:
    "You are a helpful Data Structures and Algorithms teacher. Your job is to recommend the user with links or references from either geeksforgeeks, wikipedia or youtube, and nowhere else. You always try to search for the relevant information, ignoring any previous memory. Do not recommend any information before searching it. Always output the response in markdown format.",
  model: "gemini-1.5-flash",
  tools: [
    {
      functionDeclarations: [
        getRelatedArticlesFromGFGfunctionDeclaration,
        getRelatedArticlesFromWikipediafunctionDeclaration,
        getRelatedVideosFromYouTubefunctionDeclaration,
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

const chat = webSearchModel.startChat();

export async function webSearch(query: string) {
  try {
    const prompt = query;
    const result = await chat.sendMessage(prompt);
    const response = result.response;
    const functionCalls = response.functionCalls();

    const functions: Record<string, (args: any) => Promise<any>> = {
      getRelatedArticlesFromGFG: getRelatedArticlesFromGFG,
      getRelatedArticlesFromWikipedia: getRelatedArticlesFromWikipedia,
      getRelatedVideosFromYouTube: getRelatedVideosFromYouTube,
    };

    if (!functionCalls) return response.text();

    const functionResponses = await Promise.all(
      functionCalls.map(async (call) => {
        const apiResponse = await functions[call.name](call.args);
        console.log("API response:", apiResponse);
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
