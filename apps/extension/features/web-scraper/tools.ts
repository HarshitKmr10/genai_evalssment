import { tool } from "@langchain/core/tools";
import axios from "axios";
import { z } from "zod";
import { TavilySearchResults } from "@langchain/community/tools/tavily_search";

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
        .map((article: any) => {
          searchResults.push({
            title: article.post_title,
            url: article.post_url,
            snippet: article.post_excerpt,
          });
        });

      return JSON.stringify(searchResults);
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
  },
);

// ------------------------------------------------------------------------------------------------

export const getRelatedArticlesFromWikipedia = tool(
  async (input) => {
    const wikipediaTool = new TavilySearchResults({
      apiKey: process.env.EXTENSION_PUBLIC_TAVILY_API_KEY,
      maxResults: input.numResults,
      kwargs: {
        include_domains: ["wikipedia.org"],
      },
    });

    const output = await wikipediaTool.invoke({ input: input.query });
    return JSON.stringify(output);
  },
  {
    name: "get_related_articles_from_wikipedia",
    description: "Fetch related articles from Wikipedia based on a query.",
    schema: z.object({
      query: z.string(),
      numResults: z.number(),
    }),
  },
);

// ------------------------------------------------------------------------------------------------

export const getRelatedVideosFromYouTube = tool(
  async (input) => {
    const youtubeTool = new TavilySearchResults({
      apiKey: process.env.EXTENSION_PUBLIC_TAVILY_API_KEY,
      maxResults: input.numResults,
      kwargs: {
        include_domains: ["youtube.com"],
      },
    });

    const output = await youtubeTool.invoke({ input: input.query });
    return JSON.stringify(output);
  },
  {
    name: "get_related_videos_from_youtube",
    description: "Fetch related videos from YouTube based on a query.",
    schema: z.object({
      query: z.string(),
      numResults: z.number(),
    }),
  },
);
