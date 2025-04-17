import {
  APICallError,
  UIMessage,
  appendResponseMessages,
  createDataStreamResponse,
  experimental_createMCPClient,
  smoothStream,
  streamText,
} from 'ai';
import { auth } from '@/app/(auth)/auth';
import { systemPrompt } from '@/lib/ai/prompts';
import {
  deleteChatById,
  getChatById,
  saveChat,
  saveMessages,
} from '@/lib/db/queries';
import {
  generateUUID,
  getMostRecentUserMessage,
  getTrailingMessageId,
} from '@/lib/utils';
import { generateTitleFromUserMessage } from '../../actions';
import { createDocument } from '@/lib/ai/tools/create-document';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { isProductionEnvironment } from '@/lib/constants';
import { myProvider } from '@/lib/ai/providers';
import { openai, OpenAIResponsesProviderOptions } from '@ai-sdk/openai';

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const {
      id,
      messages,
      selectedChatModel,
      selectedSolanaWallet,
    }: {
      id: string;
      messages: Array<UIMessage>;
      selectedChatModel: string;
      selectedSolanaWallet: string | undefined;
    } = await request.json();

    const requestId = generateUUID();

    const session = await auth();

    if (!session || !session.user || !session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    const userMessage = getMostRecentUserMessage(messages);

    if (!userMessage) {
      return new Response('No user message found', { status: 400 });
    }

    const chat = await getChatById({ id });

    if (!chat) {
      const title = await generateTitleFromUserMessage({
        message: userMessage,
      });

      await saveChat({ id, userId: session.user.id, title });
    } else {
      if (chat.userId !== session.user.id) {
        return new Response('Unauthorized', { status: 401 });
      }
    }

    await saveMessages({
      messages: [
        {
          chatId: id,
          id: userMessage.id,
          role: 'user',
          parts: userMessage.parts,
          attachments: userMessage.experimental_attachments ?? [],
          createdAt: new Date(),
        },
      ],
    });

    const model = myProvider.languageModel(selectedChatModel);
    const mcpClient = await experimental_createMCPClient({
      transport: {
        type: 'sse',
        url: 'http://localhost:3001/sse',
      },
    });
    let tools = await mcpClient.tools();
    // if (model.provider.startsWith('openai')) {
    //   tools = Object.fromEntries(
    //     Object.entries(tools).map(([k, v]) => {
    //       if ('parameters' in v) {
    //         if ('jsonSchema' in v.parameters) {
    //           // @ts-expect-error
    //           v.parameters.jsonSchema.properties = Object.fromEntries(
    //             // @ts-expect-error
    //             Object.entries(v.parameters.jsonSchema.properties).map(
    //               ([k2, v2]) => {
    //                 const newV = Object.fromEntries(
    //                   // @ts-expect-error
    //                   Object.entries(v2).filter(
    //                     ([k3]) =>
    //                       ![
    //                         'minLength',
    //                         'maxLength',
    //                         'default',
    //                         'exclusiveMinimum',
    //                       ].includes(k3),
    //                   ),
    //                 );
    //                 return [k2, newV];
    //               },
    //             ),
    //           );
    //         }
    //       }
    //       return [k, v];
    //     }),
    //   );
    // }

    console.log('BEGIN request', requestId);
    return createDataStreamResponse({
      execute: (dataStream) => {
        const result = streamText({
          model,
          system: systemPrompt({ selectedChatModel, selectedSolanaWallet }),
          messages,
          maxSteps: 5,
          providerOptions: {
            openai: {
              // Run into a bunch of problems otherwise.
              strictSchemas: false,
            } satisfies OpenAIResponsesProviderOptions,
          },
          // experimental_activeTools:
          //   selectedChatModel === 'chat-model-reasoning'
          //     ? []
          //     : [
          //         'getWeather',
          //         'createDocument',
          //         'updateDocument',
          //         'requestSuggestions',
          //       ],
          experimental_transform: smoothStream({ chunking: 'word' }),
          experimental_generateMessageId: generateUUID,
          tools: {
            ...tools,
            getWeather,
          },

          onStepFinish: async ({ response, stepType }) => {
            console.log(requestId, ': finished step', stepType, response.id);
          },
          onFinish: async ({ response }) => {
            console.log(requestId, ': FINISHED response', response.id);
            await mcpClient.close();

            if (session.user?.id) {
              try {
                const assistantId = getTrailingMessageId({
                  messages: response.messages.filter(
                    (message) => message.role === 'assistant',
                  ),
                });

                if (!assistantId) {
                  throw new Error('No assistant message found!');
                }

                const [, assistantMessage] = appendResponseMessages({
                  messages: [userMessage],
                  responseMessages: response.messages,
                });

                await saveMessages({
                  messages: [
                    {
                      id: assistantId,
                      chatId: id,
                      role: assistantMessage.role,
                      parts: assistantMessage.parts,
                      attachments:
                        assistantMessage.experimental_attachments ?? [],
                      createdAt: new Date(),
                    },
                  ],
                });
              } catch (_) {
                console.error('Failed to save chat');
              }
            }
          },
          experimental_telemetry: {
            isEnabled: isProductionEnvironment,
            functionId: 'stream-text',
          },
        });

        result.consumeStream();

        result.mergeIntoDataStream(dataStream, {
          sendReasoning: true,
        });
      },
      onError: (error) => {
        console.error(error);
        if (error instanceof APICallError) {
          // console.error(JSON.stringify(error.requestBodyValues, null, 2));
          return error.responseBody ?? 'Oops, an error occurred!';
        }
        return 'Oops, an error occurred!';
      },
    });
  } catch (error) {
    console.error(error);
    return new Response('An error occurred while processing your request!', {
      status: 404,
    });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new Response('Not Found', { status: 404 });
  }

  const session = await auth();

  if (!session || !session.user) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    const chat = await getChatById({ id });

    if (chat.userId !== session.user.id) {
      return new Response('Unauthorized', { status: 401 });
    }

    await deleteChatById({ id });

    return new Response('Chat deleted', { status: 200 });
  } catch (error) {
    return new Response('An error occurred while processing your request!', {
      status: 500,
    });
  }
}
