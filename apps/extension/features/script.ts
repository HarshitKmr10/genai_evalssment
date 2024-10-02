import {
  START,
  END,
  Annotation,
  StateGraph,
  MemorySaver,
} from "@langchain/langgraph/web";
import { AIMessage, BaseMessage, HumanMessage } from "@langchain/core/messages";
import { z } from "zod";
import { JsonOutputToolsParser } from "@langchain/core/output_parsers/openai_tools";
import {
  ChatPromptTemplate,
  MessagesPlaceholder,
} from "@langchain/core/prompts";
import { llm } from "./llm";
import { webscraperNode } from "./web-scraper/agent";
import { hintProviderNode } from "./hint-provider/agent";
import { challengerNode } from "./challenger/agent";
import { socraticTeacherNode } from "./socratic-teacher/agent";
import { alternateSolutionNode } from "./alternate-solution/agent";
import type { Message } from "../content/Chat";

export const AgentState = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x, y) => x.concat(y),
    default: () => [],
  }),
  // The agent node that last performed work
  next: Annotation<string>({
    reducer: (x, y) => y ?? x ?? END,
    default: () => END,
  }),
});

const members = [
  "web_scraper",
  "hint_provider",
  "challenger",
  "socratic_teacher",
  "alternate_solution",
] as const;

const systemPrompt =
  "You are a supervisor tasked with managing a conversation between the" +
  " following workers: {members}. Given the following user request," +
  " respond with the worker to act next. Each worker will perform a" +
  " task and respond with their results and status. When finished," +
  " respond with FINISH." +
  " IMPORTANT: limit yourself to the most useful worker and use only 1 or 2 workers at best";
const options = [END, ...members];

// Define the routing function
const routingTool = {
  name: "route",
  description: "Select the next role.",
  schema: z.object({
    next: z.enum([END, ...members]),
  }),
};

const prompt = ChatPromptTemplate.fromMessages([
  [
    "system",
    systemPrompt +
      "\nGiven the conversation above, who should act next?" +
      " Or should we FINISH? Select one of: {options}",
  ],
  new MessagesPlaceholder("messages"),
]);

const formattedPrompt = await prompt.partial({
  options: options.join(", "),
  members: members.join(", "),
});

const supervisorChain = formattedPrompt
  .pipe(
    llm.bindTools([routingTool], {
      tool_choice: "route",
    }),
  )
  .pipe(new JsonOutputToolsParser<AIMessage>())
  .pipe((x: any) => x[0].args);

const workflow = new StateGraph(AgentState)
  .addNode("web_scraper", webscraperNode)
  .addNode("hint_provider", hintProviderNode)
  .addNode("challenger", challengerNode)
  .addNode("socratic_teacher", socraticTeacherNode)
  .addNode("alternate_solution", alternateSolutionNode)
  .addNode("supervisor", supervisorChain);

members.forEach((member) => {
  workflow.addEdge(member, "supervisor");
});

workflow.addConditionalEdges(
  "supervisor",
  (x: typeof AgentState.State) => x.next,
);

workflow.addEdge(START, "supervisor");

const memory = new MemorySaver();
const graph = workflow.compile({ checkpointer: memory });

// You are a helpful Data Structures and Algorithms teacher. Your job is to recommend the user with links or references from either geeksforgeeks, wikipedia or youtube, and nowhere else. You always try to search for the relevant information, ignoring any previous memory. Do not recommend any information before searching it. Always output the response in markdown format.

export async function* askDSATutor(query: string, titleSlug: string) {
  let config = { configurable: { thread_id: `conversation-${titleSlug}` } };
  const streamResults = graph.stream(
    {
      messages: [
        new HumanMessage({
          content: query,
        }),
      ],
    },
    { recursionLimit: 5, ...config },
  );

  // Return the stream of outputs
  for await (const output of await streamResults) {
    if (!output?.__end__) {
      console.log(Object.keys(output));
      if (output.supervisor) continue;
      const obj = Object.values(output) as any;
      let finalOutput = "";
      console.log(obj);
      obj[0].messages.forEach(
        (message: any) => (finalOutput += "\n" + message.content),
      );
      console.log(finalOutput);
      console.log(
        obj[0].messages.map((message: any) => message.response_metadata),
      );
      yield finalOutput as string; // Yield each output as it arrives
    }
  }
}
