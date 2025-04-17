import { google } from '@ai-sdk/google';
import { xai } from '@ai-sdk/xai';
import { openai, createOpenAI } from '@ai-sdk/openai';
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from 'ai';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';

const oaiProvider = createOpenAI({
  fetch: async (url, options) => {
    if (!options?.body) {
      return fetch(url, options);
    }

    // Parse the request body
    const body = JSON.parse(options.body as string);

    // Check if there are tools with functions
    if (body.tools?.length > 0) {
      body.tools = body.tools.map((tool: any) => {
        if (tool.type === 'function' && tool.function.strict) {
          // Remove the strict flag if present
          const { strict, ...functionWithoutStrict } = tool.function;
          return {
            ...tool,
            function: functionWithoutStrict,
          };
        }
        return tool;
      });
    }

    // Create new options with modified body
    const newOptions = {
      ...options,
      body: JSON.stringify(body),
    };

    console.log(
      `Body ${JSON.stringify(
        JSON.parse((newOptions?.body as string) || '{}'),
        null,
        2,
      )}`,
    );

    // Make the actual fetch call
    return fetch(url, newOptions);
  },
});

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        'chat-model': xai('grok-2-1212'),
        // 'chat-model-reasoning': google('gemini-2.0-flash-thinking-exp'), // doesn't work with tool call
        // 'chat-model-reasoning': google('gemini-2.0-flash-exp'),
        // 'chat-model-reasoning': oaiProvider('o3-mini-2025-01-31'),
        'chat-model-reasoning': wrapLanguageModel({
          model: xai('grok-3-mini-beta'),
          middleware: extractReasoningMiddleware({ tagName: 'think' }),
        }),
        'title-model': xai('grok-2-1212'),
        'artifact-model': xai('grok-2-1212'),
      },
      imageModels: {
        'small-model': xai.image('grok-2-image'),
      },
    });
