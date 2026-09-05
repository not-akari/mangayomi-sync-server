"use client";

import { useState, type FormEvent, type KeyboardEvent } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface ReportThreadMessage {
  id: string;
  senderId?: string | null;
  sender?: { username: string } | null;
  isAdmin: boolean;
  message: string;
  createdAt: string;
}

export interface ReportThreadProps {
  originalMessage: string;
  originalCreatedAt: string;
  reporterLabel?: string;
  contactInfo?: string | null;
  adminNote?: string | null;
  adminNoteLabel?: string;
  messages?: ReportThreadMessage[];
  currentUsername?: string;
  adminBadgeLabel?: string;
  userBadgeLabel?: string;
  onSendReply?: (message: string) => Promise<void>;
  replyPlaceholder?: string;
  replySendLabel?: string;
  replyHint?: string;
  disabled?: boolean;
  className?: string;
}

export function ReportThread({
  originalMessage,
  originalCreatedAt,
  reporterLabel,
  contactInfo,
  adminNote,
  adminNoteLabel = "Admin Note",
  messages = [],
  adminBadgeLabel = "Admin",
  userBadgeLabel = "User",
  onSendReply,
  replyPlaceholder = "Type a reply…",
  replySendLabel = "Send reply",
  replyHint = "Press Enter to send, Shift+Enter for new line",
  disabled = false,
  className,
}: ReportThreadProps): React.ReactElement {
  const [reply, setReply] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submitReply(): Promise<void> {
    if (!reply.trim() || !onSendReply || sending || disabled) return;
    setSending(true);
    setError(null);
    try {
      await onSendReply(reply.trim());
      setReply("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to send reply. Please try again.",
      );
    } finally {
      setSending(false);
    }
  }

  async function handleReplySubmit(e: FormEvent): Promise<void> {
    e.preventDefault();
    await submitReply();
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>): void {
    if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
      e.preventDefault();
      void submitReply();
    }
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex flex-col gap-1.5 rounded-md border bg-card/60 p-3 text-sm">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <span>{reporterLabel || "Original Report"}</span>
          </div>
          <time dateTime={originalCreatedAt} className="tabular-nums">
            {new Date(originalCreatedAt).toLocaleString()}
          </time>
        </div>
        <p className="break-words whitespace-pre-wrap text-foreground">
          {originalMessage}
        </p>
        {contactInfo && (
          <p className="text-xs text-muted-foreground">
            Contact: {contactInfo}
          </p>
        )}
      </div>

      {adminNote && (
        <div className="flex flex-col gap-1 rounded-md border border-info/30 bg-info/10 p-3 text-sm">
          <span className="text-xs font-semibold text-info">
            {adminNoteLabel}
          </span>
          <p className="break-words whitespace-pre-wrap text-foreground">
            {adminNote}
          </p>
        </div>
      )}

      {messages.length > 0 && (
        <div className="flex flex-col gap-2 pt-1">
          {messages.map((msg) => {
            const senderName =
              msg.sender?.username ??
              (msg.isAdmin ? adminBadgeLabel : userBadgeLabel);
            return (
              <div
                key={msg.id}
                className={cn(
                  "flex flex-col gap-1.5 rounded-md border p-3 text-sm",
                  msg.isAdmin
                    ? "border-primary/20 bg-primary/5"
                    : "border-border bg-card/40",
                )}
              >
                <div className="flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-foreground">
                      {senderName}
                    </span>
                    <Badge tone={msg.isAdmin ? "primary" : "muted"}>
                      {msg.isAdmin ? adminBadgeLabel : userBadgeLabel}
                    </Badge>
                  </div>
                  <time
                    dateTime={msg.createdAt}
                    className="text-muted-foreground tabular-nums"
                  >
                    {new Date(msg.createdAt).toLocaleString()}
                  </time>
                </div>
                <p className="break-words whitespace-pre-wrap text-foreground">
                  {msg.message}
                </p>
              </div>
            );
          })}
        </div>
      )}

      {onSendReply && (
        <form
          onSubmit={handleReplySubmit}
          className="flex flex-col gap-2 pt-2"
        >
          <Textarea
            rows={2}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={replyPlaceholder}
            disabled={disabled || sending}
            className="text-sm"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <div className="flex items-center justify-between gap-2">
            {replyHint && (
              <span className="text-[11px] text-muted-foreground">
                {replyHint}
              </span>
            )}
            <Button
              type="submit"
              size="sm"
              variant="secondary"
              disabled={disabled || sending || !reply.trim()}
            >
              {sending ? "Sending…" : replySendLabel}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
