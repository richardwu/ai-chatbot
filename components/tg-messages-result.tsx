'use client';

import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { useMemo, useState } from 'react';
import { Markdown } from './markdown';

interface TgMessage {
  id: string;
  text: string;
  from: {
    firstName: string;
    id: string;
  };
  timestamp: string;
}

interface TgMessagesResponse {
  status: string;
  messages: TgMessage[];
}

export function TgMessagesResult({ result }: { result: any }) {
  const [expanded, setExpanded] = useState(false);

  const raw = result?.content.at(0)?.text;
  const parsed = useMemo(() => {
    try {
      return raw ? (JSON.parse(raw) as TgMessagesResponse) : null;
    } catch (e) {
      return null;
    }
  }, [raw]);

  if (!parsed || parsed.status !== 'success') {
    return (
      <div className="p-4 rounded-2xl bg-background border">
        No messages available
      </div>
    );
  }

  const { messages } = parsed;
  const displayMessages = expanded ? messages : messages.slice(0, 5);
  const hasMore = messages.length > 5;

  return (
    <div className="flex flex-col gap-4 rounded-2xl bg-background border p-4">
      <div
        className={cn('flex flex-col gap-4', {
          'max-h-[500px] overflow-y-auto pr-2': expanded && hasMore,
        })}
      >
        {displayMessages.map((message) => (
          <div key={message.id} className="flex flex-col">
            <div className="bg-muted rounded-xl p-3 relative">
              <div className="text-sm font-medium mb-1 text-cyan-400">
                {message.from.firstName}
              </div>
              <Markdown>{message.text}</Markdown>
              <div className="text-xs text-muted-foreground text-right mt-1">
                {format(new Date(message.timestamp), 'h:mm a')}
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full py-2 text-sm text-center text-primary hover:bg-muted/50 transition-colors rounded"
        >
          {expanded ? 'Show less' : `Show ${messages.length - 5} more`}
        </button>
      )}
    </div>
  );
}
