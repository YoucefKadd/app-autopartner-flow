"use client";

import React from "react";
import { Bold, Italic, List, CheckSquare, Heading3, Minus, AlertTriangle } from "lucide-react";

interface NoteFormattingToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (newValue: string) => void;
}

export function NoteFormattingToolbar({
  textareaRef,
  value,
  onChange,
}: NoteFormattingToolbarProps) {
  function applyFormatting(prefix: string, suffix: string = "", defaultText: string = "") {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart ?? value.length;
    const end = el.selectionEnd ?? value.length;
    const selectedText = value.substring(start, end);
    const textToInsert = selectedText || defaultText;

    const replacement = `${prefix}${textToInsert}${suffix}`;
    const nextValue = value.substring(0, start) + replacement + value.substring(end);
    onChange(nextValue);

    // Reposition cursor and refocus
    setTimeout(() => {
      el.focus();
      const newCursorPos = selectedText
        ? start + replacement.length
        : start + prefix.length;
      el.setSelectionRange(newCursorPos, newCursorPos + textToInsert.length);
    }, 0);
  }

  function insertAtLineStart(token: string) {
    const el = textareaRef.current;
    if (!el) return;

    const start = el.selectionStart ?? value.length;
    // Find the start of the current line
    const lastNewline = value.lastIndexOf("\n", start - 1);
    const lineStart = lastNewline === -1 ? 0 : lastNewline + 1;

    const nextValue =
      value.substring(0, lineStart) + token + value.substring(lineStart);
    onChange(nextValue);

    setTimeout(() => {
      el.focus();
      const newCursor = start + token.length;
      el.setSelectionRange(newCursor, newCursor);
    }, 0);
  }

  return (
    <div className="flex items-center gap-1 flex-wrap px-2 py-1.5 bg-slate-100/80 dark:bg-zinc-800/80 rounded-lg border border-slate-200/70 dark:border-zinc-700/60 text-xs">
      <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mr-1 px-1">
        Format
      </span>

      <button
        type="button"
        onClick={() => applyFormatting("**", "**", "texte gras")}
        title="Gras (**texte**)"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-slate-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700 font-bold transition-colors"
      >
        <Bold className="w-3.5 h-3.5" />
        <span className="text-[11px] font-bold">Gras</span>
      </button>

      <button
        type="button"
        onClick={() => applyFormatting("*", "*", "texte italique")}
        title="Italique (*texte*)"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-slate-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700 italic transition-colors"
      >
        <Italic className="w-3.5 h-3.5" />
      </button>

      <div className="h-3.5 w-px bg-slate-300 dark:bg-zinc-700 mx-0.5" />

      <button
        type="button"
        onClick={() => insertAtLineStart("• ")}
        title="Puce (• item)"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-slate-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700 transition-colors"
      >
        <List className="w-3.5 h-3.5 text-[#d90416]" />
        <span className="text-[11px]">Puce</span>
      </button>

      <button
        type="button"
        onClick={() => insertAtLineStart("[ ] ")}
        title="Tâche / À faire ([ ] action)"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-slate-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700 transition-colors"
      >
        <CheckSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
        <span className="text-[11px]">À faire</span>
      </button>

      <button
        type="button"
        onClick={() => insertAtLineStart("### ")}
        title="Sous-titre / Section"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-slate-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700 transition-colors"
      >
        <Heading3 className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
        <span className="text-[11px]">Titre</span>
      </button>

      <button
        type="button"
        onClick={() => insertAtLineStart("⚠️ ")}
        title="Important"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-slate-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700 transition-colors"
      >
        <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
      </button>

      <button
        type="button"
        onClick={() => {
          const el = textareaRef.current;
          if (!el) return;
          const pos = el.selectionStart ?? value.length;
          const separator = "\n---\n";
          const nextVal = value.substring(0, pos) + separator + value.substring(pos);
          onChange(nextVal);
          setTimeout(() => {
            el.focus();
            const nextPos = pos + separator.length;
            el.setSelectionRange(nextPos, nextPos);
          }, 0);
        }}
        title="Ligne de séparation (---)"
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-slate-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700 transition-colors"
      >
        <Minus className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// Helper to render inline formatting: bold **text**, italic *text*
function renderInlineFormatted(text: string): React.ReactNode {
  // Regex to match **bold** or *italic*
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.map((part, idx) => {
    if (part.startsWith("**") && part.endsWith("**") && part.length >= 4) {
      return (
        <strong key={idx} className="font-bold text-slate-900 dark:text-zinc-50">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length >= 2) {
      return (
        <em key={idx} className="italic text-slate-800 dark:text-zinc-200">
          {part.slice(1, -1)}
        </em>
      );
    }
    return part;
  });
}

export function FormattedNoteText({
  content,
  className = "",
}: {
  content: string;
  className?: string;
}) {
  if (!content) return null;

  const lines = content.split("\n");

  return (
    <div className={`space-y-1.5 text-xs text-slate-700 dark:text-zinc-300 leading-relaxed ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();

        // Horizontal separator
        if (trimmed === "---" || trimmed === "***") {
          return <hr key={idx} className="my-2 border-slate-200 dark:border-zinc-800" />;
        }

        // Heading 3
        if (line.startsWith("### ")) {
          return (
            <h5
              key={idx}
              className="font-bold text-slate-900 dark:text-zinc-100 text-xs mt-2 mb-1 flex items-center gap-1.5 text-[#d90416]"
            >
              <span className="w-1.5 h-1.5 rounded-full bg-[#d90416]" />
              {renderInlineFormatted(line.slice(4))}
            </h5>
          );
        }

        // Heading 2 or 1
        if (line.startsWith("## ") || line.startsWith("# ")) {
          const headingText = line.replace(/^#+\s*/, "");
          return (
            <h4
              key={idx}
              className="font-bold text-slate-900 dark:text-zinc-100 text-sm mt-2 mb-1"
            >
              {renderInlineFormatted(headingText)}
            </h4>
          );
        }

        // Checkbox todo list
        if (trimmed.startsWith("[ ] ") || trimmed.startsWith("[x] ") || trimmed.startsWith("[X] ")) {
          const isDone = trimmed.startsWith("[x] ") || trimmed.startsWith("[X] ");
          const text = trimmed.slice(4);
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 my-0.5">
              <span
                className={`w-3.5 h-3.5 rounded border flex items-center justify-center text-[9px] shrink-0 mt-0.5 ${
                  isDone
                    ? "bg-emerald-500 border-emerald-500 text-white font-bold"
                    : "border-slate-300 dark:border-zinc-600 bg-white dark:bg-zinc-800 text-transparent"
                }`}
              >
                ✓
              </span>
              <span
                className={isDone ? "line-through text-slate-400 dark:text-zinc-500" : ""}
              >
                {renderInlineFormatted(text)}
              </span>
            </div>
          );
        }

        // Bullet list item
        if (trimmed.startsWith("• ") || trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
          const text = trimmed.slice(2);
          return (
            <div key={idx} className="flex items-start gap-2 pl-1 my-0.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#d90416] shrink-0 mt-1.5" />
              <span>{renderInlineFormatted(text)}</span>
            </div>
          );
        }

        // Empty line
        if (!trimmed) {
          return <div key={idx} className="h-1.5" />;
        }

        // Regular line
        return <div key={idx}>{renderInlineFormatted(line)}</div>;
      })}
    </div>
  );
}
