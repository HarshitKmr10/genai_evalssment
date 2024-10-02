import { tool } from "@langchain/core/tools";
import axios from "axios";
import { z } from "zod";

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

      return JSON.stringify(searchResults);
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
  },
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
      const matches = response.data.match(
        /var ytInitialData = (.+?);<\/script>/,
      );

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
  },
);
