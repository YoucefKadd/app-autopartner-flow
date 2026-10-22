"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Bold,
  Italic,
  List,
  CheckSquare,
  Heading3,
  Minus,
  AlertTriangle,
  Strikethrough,
  Highlighter,
} from "lucide-react";

interface NoteFormattingToolbarProps {
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
  value: string;
  onChange: (newValue: string) => void;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function convertInlineMarkdownToHtml(text: string): string {
  return text
    .replace(/\*\*\*([^*]+?)\*\*\*/g, "<b><i>$1</i></b>")
    .replace(/\*\*([^*]+?)\*\*/g, "<b>$1</b>")
    .replace(/\*(?!\*)([^*]+?)\*/g, "<i>$1</i>")
    .replace(/~~([^~]+?)~~/g, "<strike>$1</strike>")
    .replace(
      /==([^=]+?)==/g,
      '<span style="background-color: rgb(253, 230, 138); color: rgb(15, 23, 42); padding: 0 3px; border-radius: 3px;">$1</span>'
    );
}

/**
 * Converts either plain text / legacy markdown OR existing HTML into clean WYSIWYG HTML
 * so no raw syntax (**bold**, ~~strike~~, ==highlight==, ### title) is ever shown.
 */
export function valueToWysiwygHtml(raw: string): string {
  if (!raw) return "";

  const hasHtmlTags = /<(b|strong|i|em|strike|del|s|mark|ul|ol|li|h3|h4|hr|div|p|br|span|input)\b/i.test(
    raw
  );

  if (hasHtmlTags) {
    // Even if it already contains HTML, convert any leftover markdown tokens
    return convertInlineMarkdownToHtml(raw);
  }

  // Convert legacy line-by-line markdown / plain text into rich HTML
  const lines = raw.split("\n");
  const htmlParts: string[] = [];
  let inList = false;

  for (const line of lines) {
    const trimmed = line.trim();

    if (trimmed === "---" || trimmed === "***") {
      if (inList) {
        htmlParts.push("</ul>");
        inList = false;
      }
      htmlParts.push("<hr/>");
      continue;
    }

    if (line.startsWith("### ") || line.startsWith("## ") || line.startsWith("# ")) {
      if (inList) {
        htmlParts.push("</ul>");
        inList = false;
      }
      const cleanHeading = escapeHtml(line.replace(/^#+\s*/, ""));
      htmlParts.push(`<h3>${convertInlineMarkdownToHtml(cleanHeading)}</h3>`);
      continue;
    }

    if (
      trimmed.startsWith("[ ] ") ||
      trimmed.startsWith("[x] ") ||
      trimmed.startsWith("[X] ")
    ) {
      if (inList) {
        htmlParts.push("</ul>");
        inList = false;
      }
      const isChecked = trimmed.startsWith("[x] ") || trimmed.startsWith("[X] ");
      const itemText = convertInlineMarkdownToHtml(escapeHtml(trimmed.slice(4)));
      htmlParts.push(
        `<div><input type="checkbox" data-todo="true" ${
          isChecked ? 'checked="checked"' : ""
        } style="margin-right: 6px; accent-color: #d90416; cursor: pointer;" />${itemText}</div>`
      );
      continue;
    }

    if (
      trimmed.startsWith("• ") ||
      trimmed.startsWith("- ") ||
      trimmed.startsWith("* ")
    ) {
      if (!inList) {
        htmlParts.push("<ul>");
        inList = true;
      }
      const itemText = convertInlineMarkdownToHtml(escapeHtml(trimmed.slice(2)));
      htmlParts.push(`<li>${itemText}</li>`);
      continue;
    }

    if (inList) {
      htmlParts.push("</ul>");
      inList = false;
    }

    if (!trimmed) {
      htmlParts.push("<div><br/></div>");
    } else {
      htmlParts.push(`<div>${convertInlineMarkdownToHtml(escapeHtml(line))}</div>`);
    }
  }

  if (inList) {
    htmlParts.push("</ul>");
  }

  return htmlParts.join("");
}

export function NoteFormattingToolbar({
  textareaRef,
  value,
  onChange,
}: NoteFormattingToolbarProps) {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const lastEmittedRef = useRef<string>(value);
  const [placeholder, setPlaceholder] = useState<string>(
    "Saisissez votre texte..."
  );
  const [minHeightPx, setMinHeightPx] = useState<number>(105);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    strike: false,
    highlight: false,
    list: false,
    heading: false,
  });

  // Hide the underlying raw <textarea> so our WYSIWYG editor replaces it seamlessly everywhere
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      if (el.placeholder) setPlaceholder(el.placeholder);
      if (el.rows && el.rows > 0) {
        setMinHeightPx(Math.max(84, el.rows * 24));
      }
      el.required = false;
      el.style.display = "none";
    }
  }, [textareaRef]);

  // Sync external value changes into the contentEditable DOM
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    if (value !== lastEmittedRef.current) {
      lastEmittedRef.current = value;
      const html = valueToWysiwygHtml(value);
      if (editor.innerHTML !== html) {
        editor.innerHTML = html;
      }
    } else if (!value && editor.innerHTML !== "") {
      editor.innerHTML = "";
    }
  }, [value]);

  // Initial mount populate
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;
    const html = valueToWysiwygHtml(value);
    if (html && !editor.innerHTML) {
      editor.innerHTML = html;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshActiveStates = useCallback(() => {
    if (typeof document === "undefined") return;
    try {
      const bold = document.queryCommandState("bold");
      const italic = document.queryCommandState("italic");
      const strike = document.queryCommandState("strikeThrough");
      const list = document.queryCommandState("insertUnorderedList");
      const block = (document.queryCommandValue("formatBlock") || "").toLowerCase();
      const backColor = (document.queryCommandValue("backColor") || "").toLowerCase();
      const highlight =
        backColor.includes("253, 230, 138") ||
        backColor.includes("fde68a") ||
        backColor.includes("254, 240, 138");

      setActiveFormats({
        bold,
        italic,
        strike,
        highlight,
        list,
        heading: block === "h3",
      });
    } catch {
      // ignore
    }
  }, []);

  const emitChange = useCallback(() => {
    const editor = editorRef.current;
    if (!editor) return;

    // Persist checkbox states into HTML attributes before reading innerHTML
    const checkboxes = editor.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach((cb) => {
      const input = cb as HTMLInputElement;
      if (input.checked) {
        input.setAttribute("checked", "checked");
      } else {
        input.removeAttribute("checked");
      }
    });

    const rawHtml = editor.innerHTML;
    const textOnly = editor.innerText?.trim() || "";
    const hasElements = /<(hr|input|img)\b/i.test(rawHtml);
    const nextVal = !textOnly && !hasElements ? "" : rawHtml;

    lastEmittedRef.current = nextVal;
    onChange(nextVal);
    refreshActiveStates();
  }, [onChange, refreshActiveStates]);

  function focusEditor() {
    const editor = editorRef.current;
    if (!editor) return;
    if (document.activeElement !== editor) {
      editor.focus();
    }
  }

  function runCommand(cmd: string, arg?: string) {
    focusEditor();
    document.execCommand(cmd, false, arg);
    emitChange();
  }

  function handleToggleHighlight() {
    focusEditor();
    const backColor = (document.queryCommandValue("backColor") || "").toLowerCase();
    const isHighlighted =
      backColor.includes("253, 230, 138") ||
      backColor.includes("fde68a") ||
      backColor.includes("254, 240, 138");

    if (isHighlighted) {
      document.execCommand("hiliteColor", false, "transparent");
    } else {
      document.execCommand("hiliteColor", false, "#fde68a");
    }
    emitChange();
  }

  function handleToggleHeading() {
    focusEditor();
    const block = (document.queryCommandValue("formatBlock") || "").toLowerCase();
    if (block === "h3") {
      document.execCommand("formatBlock", false, "div");
    } else {
      document.execCommand("formatBlock", false, "h3");
    }
    emitChange();
  }

  function handleInsertTodo() {
    focusEditor();
    document.execCommand(
      "insertHTML",
      false,
      '<div><input type="checkbox" data-todo="true" style="margin-right: 6px; accent-color: #d90416; cursor: pointer;" />&nbsp;</div>'
    );
    emitChange();
  }

  function handleInsertDivider() {
    focusEditor();
    document.execCommand("insertHTML", false, "<hr/><div><br/></div>");
    emitChange();
  }

  const isEmpty = !value || value === "<br>" || value === "<div><br></div>";

  return (
    <div className="space-y-1.5">
      {/* BARRE D'OUTILS WYSIWYG */}
      <div className="flex items-center gap-1 flex-wrap px-2 py-1.5 bg-slate-100/90 dark:bg-zinc-800/90 rounded-lg border border-slate-200/80 dark:border-zinc-700/70 text-xs select-none">
        <span className="text-[10px] font-bold text-slate-400 dark:text-zinc-500 uppercase tracking-wider mr-1 px-1">
          Format
        </span>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            runCommand("bold");
          }}
          title="Gras (Ctrl+B)"
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md font-bold transition-colors cursor-pointer ${
            activeFormats.bold
              ? "bg-[#d90416] text-white shadow-2xs"
              : "text-slate-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700"
          }`}
        >
          <Bold className="w-3.5 h-3.5" />
          <span className="text-[11px] font-bold">Gras</span>
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            runCommand("italic");
          }}
          title="Italique (Ctrl+I)"
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md italic transition-colors cursor-pointer ${
            activeFormats.italic
              ? "bg-[#d90416] text-white shadow-2xs"
              : "text-slate-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700"
          }`}
        >
          <Italic className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            runCommand("strikeThrough");
          }}
          title="Barré"
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer ${
            activeFormats.strike
              ? "bg-[#d90416] text-white shadow-2xs"
              : "text-slate-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700"
          }`}
        >
          <Strikethrough className="w-3.5 h-3.5" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleToggleHighlight();
          }}
          title="Surligner le texte sélectionné"
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer ${
            activeFormats.highlight
              ? "bg-amber-300 text-slate-900 shadow-2xs font-bold"
              : "text-amber-700 dark:text-amber-400 hover:bg-white dark:hover:bg-zinc-700"
          }`}
        >
          <Highlighter className="w-3.5 h-3.5" />
        </button>

        <div className="h-3.5 w-px bg-slate-300 dark:bg-zinc-700 mx-0.5" />

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            runCommand("insertUnorderedList");
          }}
          title="Liste à puces"
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer ${
            activeFormats.list
              ? "bg-[#d90416] text-white shadow-2xs font-bold"
              : "text-slate-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700"
          }`}
        >
          <List
            className={`w-3.5 h-3.5 ${
              activeFormats.list ? "text-white" : "text-[#d90416]"
            }`}
          />
          <span className="text-[11px]">Puce</span>
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleInsertTodo();
          }}
          title="Case à cocher"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-slate-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700 transition-colors cursor-pointer"
        >
          <CheckSquare className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <span className="text-[11px]">À faire</span>
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleToggleHeading();
          }}
          title="Sous-titre / Section"
          className={`inline-flex items-center gap-1 px-2 py-1 rounded-md transition-colors cursor-pointer ${
            activeFormats.heading
              ? "bg-emerald-600 text-white shadow-2xs font-bold"
              : "text-slate-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700"
          }`}
        >
          <Heading3
            className={`w-3.5 h-3.5 ${
              activeFormats.heading
                ? "text-white"
                : "text-emerald-600 dark:text-emerald-400"
            }`}
          />
          <span className="text-[11px]">Titre</span>
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            runCommand("insertText", "⚠️ ");
          }}
          title="Symbole Important"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-slate-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700 transition-colors cursor-pointer"
        >
          <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
        </button>

        <button
          type="button"
          onMouseDown={(e) => {
            e.preventDefault();
            handleInsertDivider();
          }}
          title="Ligne de séparation"
          className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-slate-700 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-700 transition-colors cursor-pointer"
        >
          <Minus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* ZONE D'ÉDITION RICHE WYSIWYG (SANS ÉTOILES NI BALISES VISIBLES) */}
      <div className="relative rounded-xl border border-slate-200/90 dark:border-zinc-800 bg-white dark:bg-zinc-950 focus-within:border-[#d90416] focus-within:ring-1 focus-within:ring-[#d90416]/20 transition-all">
        {isEmpty && (
          <div
            onClick={() => editorRef.current?.focus()}
            className="absolute top-3 left-3.5 right-3.5 text-xs text-slate-400 dark:text-zinc-500 pointer-events-none select-none truncate"
          >
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emitChange}
          onKeyUp={refreshActiveStates}
          onMouseUp={refreshActiveStates}
          onClick={(e) => {
            refreshActiveStates();
            const target = e.target as HTMLElement;
            if (target && target.tagName === "INPUT" && (target as HTMLInputElement).type === "checkbox") {
              setTimeout(emitChange, 10);
            }
          }}
          style={{ minHeight: `${minHeightPx}px` }}
          className="w-full p-3.5 text-xs text-slate-800 dark:text-zinc-200 leading-relaxed focus:outline-none overflow-y-auto max-h-[340px] [&_b]:font-bold [&_strong]:font-bold [&_b]:text-slate-950 dark:[&_b]:text-white [&_strong]:text-slate-950 dark:[&_strong]:text-white [&_i]:italic [&_em]:italic [&_strike]:line-through [&_s]:line-through [&_del]:line-through [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_h3]:text-sm [&_h3]:font-extrabold [&_h3]:text-[#d90416] [&_h3]:mt-1.5 [&_h3]:mb-0.5 [&_hr]:my-2.5 [&_hr]:border-slate-200 dark:[&_hr]:border-zinc-700"
        />
      </div>
    </div>
  );
}

// Strip markdown and HTML syntax for short excerpts, search preview, table cells
export function stripMarkdown(text: string): string {
  if (!text) return "";
  return text
    .replace(/<br\s*\/?>/gi, " ")
    .replace(/<\/(div|p|li|h3|h4|ul|ol)>/gi, " ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/^#+\s+/gm, "")
    .replace(/^[-*•]\s+/gm, "")
    .replace(/^\[[ xX]\]\s+/gm, "")
    .replace(/\*\*\*([^*]+?)\*\*\*/g, "$1")
    .replace(/\*\*([^*]+?)\*\*/g, "$1")
    .replace(/\*(?!\*)([^*]+?)\*/g, "$1")
    .replace(/~~([^~]+?)~~/g, "$1")
    .replace(/==([^=]+?)==/g, "$1")
    .replace(/`([^`]+?)`/g, "$1")
    .replace(/^---+$/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function renderInlineFormatted(text: string): React.ReactNode {
  if (!text) return null;
  const html = valueToWysiwygHtml(text);
  return (
    <span
      className="[&_b]:font-bold [&_strong]:font-bold [&_i]:italic [&_em]:italic [&_strike]:line-through [&_s]:line-through [&_del]:line-through"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

export function FormattedNoteText({
  content,
  className = "",
}: {
  content: string;
  className?: string;
}) {
  if (!content) return null;

  const html = valueToWysiwygHtml(content);

  return (
    <div
      className={`text-xs text-slate-700 dark:text-zinc-300 leading-relaxed space-y-1 [&_b]:font-bold [&_strong]:font-bold [&_b]:text-slate-950 dark:[&_b]:text-white [&_strong]:text-slate-950 dark:[&_strong]:text-white [&_i]:italic [&_em]:italic [&_strike]:line-through [&_s]:line-through [&_del]:line-through [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_li]:my-0.5 [&_h3]:text-sm [&_h3]:font-extrabold [&_h3]:text-[#d90416] [&_h3]:mt-1.5 [&_h3]:mb-0.5 [&_hr]:my-2 [&_hr]:border-slate-200 dark:[&_hr]:border-zinc-700 ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
