import { useLayoutEffect, useRef } from "react";
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Link as LinkIcon,
  Underline as UnderlineIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function RichTextEditor({
  content,
  onChange,
  minHeight = "min-h-[280px]",
}: {
  content: string;
  onChange: (content: string) => void;
  minHeight?: string;
}) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastSyncedContent = useRef(content);

  useLayoutEffect(() => {
    if (!editorRef.current || content === lastSyncedContent.current) return;
    const safeContent = sanitizeForEditor(content);
    editorRef.current.innerHTML = safeContent;
    lastSyncedContent.current = safeContent;
  }, [content]);

  useLayoutEffect(() => {
    if (editorRef.current && !editorRef.current.innerHTML) {
      const safeContent = sanitizeForEditor(content);
      editorRef.current.innerHTML = safeContent;
      lastSyncedContent.current = safeContent;
    }
  }, []);

  const commit = () => {
    const nextContent = sanitizeForEditor(editorRef.current?.innerHTML ?? content);
    if (editorRef.current && editorRef.current.innerHTML !== nextContent) {
      editorRef.current.innerHTML = nextContent;
    }
    lastSyncedContent.current = nextContent;
    onChange(nextContent);
  };

  const runCommand = (command: "bold" | "italic" | "underline") => {
    editorRef.current?.focus();
    document.execCommand(command);
    commit();
  };

  const createLink = () => {
    const url = window.prompt("Paste the Zoom or meeting URL");
    if (!url) return;
    const normalizedUrl = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    editorRef.current?.focus();
    const selection = window.getSelection()?.toString();
    if (selection) {
      document.execCommand("createLink", false, normalizedUrl);
    } else {
      document.execCommand(
        "insertHTML",
        false,
        `<a href="${normalizedUrl.replaceAll('"', "&quot;")}" target="_blank" rel="noreferrer">${normalizedUrl}</a>`,
      );
    }
    commit();
  };

  return (
    <div className="overflow-hidden rounded-lg border bg-white shadow-sm dark:bg-background">
      <div className="flex flex-wrap items-center gap-1 border-b bg-muted/30 p-2">
        <span className="mr-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Format</span>
        <EditorButton label="Bold" onClick={() => runCommand("bold")}><BoldIcon className="size-4" /></EditorButton>
        <EditorButton label="Italic" onClick={() => runCommand("italic")}><ItalicIcon className="size-4" /></EditorButton>
        <EditorButton label="Underline" onClick={() => runCommand("underline")}><UnderlineIcon className="size-4" /></EditorButton>
        <EditorButton label="Add link" onClick={createLink}><LinkIcon className="size-4" /></EditorButton>
        <span className="ml-2 text-xs text-muted-foreground">Select text to format it or attach a Zoom link.</span>
      </div>
      <div
        ref={editorRef}
        contentEditable
        suppressContentEditableWarning
        onInput={(event) => {
          const rawContent = event.currentTarget.innerHTML;
          const nextContent = sanitizeForEditor(rawContent);
          if (rawContent !== nextContent) {
            event.currentTarget.innerHTML = nextContent;
          }
          lastSyncedContent.current = nextContent;
          onChange(nextContent);
        }}
        onPaste={(event) => {
          event.preventDefault();
          const text = event.clipboardData.getData("text/plain");
          document.execCommand("insertText", false, text);
          commit();
        }}
        onDrop={(event) => {
          event.preventDefault();
          const text = event.dataTransfer.getData("text/plain");
          if (!text) return;
          editorRef.current?.focus();
          document.execCommand("insertText", false, text);
          commit();
        }}
        className={`${minHeight} p-4 text-sm leading-7 outline-none focus:ring-2 focus:ring-inset focus:ring-primary/20 [&_a]:font-medium [&_a]:text-primary [&_a]:underline [&_h1]:mb-3 [&_h1]:text-xl [&_h2]:mb-2 [&_h2]:mt-5 [&_h2]:text-lg [&_hr]:my-6 [&_p]:mb-4 [&_p:last-child]:mb-0 [&_[data-slack-handle]]:font-medium [&_[data-slack-handle]]:text-violet-700 dark:[&_[data-slack-handle]]:text-violet-300`}
      />
    </div>
  );
}

function sanitizeForEditor(content: string) {
  const parser = new DOMParser();
  const documentNode = parser.parseFromString(`<body>${content}</body>`, "text/html");
  const allowedTags = new Set(["P", "BR", "STRONG", "B", "EM", "I", "U", "H1", "H2", "H3", "SECTION", "HR", "A", "SPAN", "UL", "OL", "LI"]);
  const elements = [...documentNode.body.querySelectorAll("*")].reverse();

  for (const element of elements) {
    if (!allowedTags.has(element.tagName)) {
      element.replaceWith(...element.childNodes);
      continue;
    }
    const href = element.getAttribute("href") ?? "";
    const slackHandle = element.getAttribute("data-slack-handle");
    const templateId = element.getAttribute("data-template-id");
    for (const attribute of [...element.attributes]) element.removeAttribute(attribute.name);
    if (element.tagName === "A") {
      if (!href.startsWith("https://")) {
        element.replaceWith(...element.childNodes);
        continue;
      }
      element.setAttribute("href", href);
      element.setAttribute("target", "_blank");
      element.setAttribute("rel", "noreferrer noopener");
    } else if (element.tagName === "SPAN" && slackHandle) {
      element.setAttribute("data-slack-handle", slackHandle);
    } else if (element.tagName === "SECTION" && templateId) {
      element.setAttribute("data-template-id", templateId);
    }
  }

  return documentNode.body.innerHTML;
}

function EditorButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8"
      aria-label={label}
      title={label}
      onMouseDown={(event) => event.preventDefault()}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}