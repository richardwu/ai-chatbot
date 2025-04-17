'use client';

import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useState, useMemo } from 'react';

interface TgChat {
  title: string;
  id: string;
  lastMessage: {
    message?: string;
    text?: string;
    date: number;
  };
  lastMessageAt: string;
  unreadCount: number;
  unreadMentionsCount: number;
}

interface TgChatsResponse {
  status: string;
  chats: TgChat[];
}

export function TgChatsResult({ result }: { result: any }) {
  const [expanded, setExpanded] = useState(false);

  const raw = result?.content.at(0)?.text;
  const parsed = useMemo(() => {
    try {
      return raw ? (JSON.parse(raw) as TgChatsResponse) : null;
    } catch (e) {
      return null;
    }
  }, [raw]);

  if (!parsed || parsed.status !== 'success') {
    return (
      <div className="p-4 rounded-2xl bg-background border">
        No chat data available
      </div>
    );
  }

  const { chats } = parsed;
  const displayChats = expanded ? chats : chats.slice(0, 5);
  const hasMore = chats.length > 5;

  return (
    <div className="flex flex-col gap-2 rounded-2xl bg-background border">
      <div
        className={cn('flex flex-col', {
          'max-h-[500px] overflow-y-auto': expanded && hasMore,
        })}
      >
        {displayChats.map((chat) => {
          const msg = chat.lastMessage.text ?? chat.lastMessage?.message ?? '';
          return (
            <div
              key={chat.id}
              className="flex flex-col p-4 border-b last:border-b-0 hover:bg-muted/50 transition-colors cursor-pointer"
            >
              <div className="flex justify-between items-start mb-1">
                <div className="font-medium">{chat.title}</div>
                <div className="text-xs text-muted-foreground">
                  {format(new Date(chat.lastMessageAt), 'MMM d, h:mm a')}
                </div>
              </div>

              <div className="flex justify-between items-center">
                <div className="text-sm text-muted-foreground truncate pr-2 max-w-[80%]">
                  {msg.substring(0, 60)}
                  {msg.length > 60 ? '...' : ''}
                </div>

                <div className="flex gap-2">
                  {chat.unreadMentionsCount > 0 && (
                    <div className="flex items-center justify-center size-6 bg-blue-500 text-white text-xs rounded-full">
                      @
                    </div>
                  )}

                  {chat.unreadCount > 0 && (
                    <div className="flex items-center justify-center min-w-6 h-6 px-1.5 bg-primary text-primary-foreground text-xs rounded-full">
                      {chat.unreadCount}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2 text-sm text-center text-primary hover:bg-muted/50 transition-colors"
        >
          {expanded ? 'Show less' : `Show ${chats.length - 5} more`}
        </button>
      )}
    </div>
  );
}
