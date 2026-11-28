import React from 'react';
import 'katex/dist/katex.min.css';
import katex from 'katex';

interface LaTeXRendererProps {
  content: string;
  className?: string;
  inline?: boolean;
}

// Regex to check if a string is purely a URL
const BARE_URL_REGEX = /^https?:\/\/\S+$/i;

// Regex to detect image URLs in running text
const IMAGE_URL_REGEX = /(https?:\/\/[^\s<>"']+\.(?:jpg|jpeg|png|gif|svg|webp|bmp)(?:\?[^\s<>"']*)?|https?:\/\/(?:cdn\.mathpix\.com|i\.imgur\.com|media\.geeksforgeeks\.org)[^\s<>"']*)/gi;

function renderMathSpan(math: string, displayMode: boolean, key: string | number) {
  try {
    const html = katex.renderToString(math, {
      displayMode,
      throwOnError: false,
      strict: false,
    });
    return (
      <span
        key={key}
        className={displayMode ? 'block my-2 overflow-x-auto text-center' : 'inline-block mx-0.5 align-middle'}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  } catch {
    const delimiter = displayMode ? '$$' : '$';
    return (
      <code key={key} className="text-xs text-amber-700 bg-amber-50 px-1 py-0.5 rounded">
        {delimiter}{math}{delimiter}
      </code>
    );
  }
}

// Render image with fallback link on error
function renderImageTag(url: string, key: string | number) {
  return (
    <img
      key={key}
      src={url}
      alt="Diagram"
      loading="lazy"
      className="max-w-full h-auto max-h-72 my-2 rounded-lg border border-slate-200 object-contain block shadow-sm bg-white"
      onError={(e) => {
        const target = e.target as HTMLImageElement;
        target.style.display = 'none';
        const link = document.createElement('a');
        link.href = url;
        link.textContent = '[Image link: ' + url + ']';
        link.className = 'text-blue-600 underline text-xs break-all';
        link.target = '_blank';
        link.rel = 'noreferrer';
        target.parentNode?.insertBefore(link, target.nextSibling);
      }}
    />
  );
}

// Render inline text segment with embedded image URLs and math delimiters
function renderTextSegmentWithMath(text: string, baseKey: string | number) {
  if (!text) return null;

  // Find all $$...$$ (block) and $...$ (inline)
  const blockMathRegex = /\$\$([\s\S]*?)\$\$/g;
  const inlineMathRegex = /\$((?:\\\$|[^$])+?)\$/g;

  const blockMatches: Array<{ start: number; end: number; content: string }> = [];
  let match: RegExpExecArray | null;

  blockMathRegex.lastIndex = 0;
  while ((match = blockMathRegex.exec(text)) !== null) {
    blockMatches.push({
      start: match.index,
      end: match.index + match[0].length,
      content: match[1],
    });
  }

  const inlineMatches: Array<{ start: number; end: number; content: string }> = [];
  inlineMathRegex.lastIndex = 0;
  while ((match = inlineMathRegex.exec(text)) !== null) {
    const isInsideBlock = blockMatches.some(
      bm => match!.index >= bm.start && match!.index < bm.end
    );
    if (!isInsideBlock) {
      inlineMatches.push({
        start: match.index,
        end: match.index + match[0].length,
        content: match[1],
      });
    }
  }

  const allMatches = [
    ...blockMatches.map(m => ({ ...m, type: 'block' as const })),
    ...inlineMatches.map(m => ({ ...m, type: 'inline' as const })),
  ].sort((a, b) => a.start - b.start);

  const elements: React.ReactNode[] = [];
  let lastIdx = 0;

  allMatches.forEach((m, idx) => {
    if (m.start > lastIdx) {
      const rawText = text.substring(lastIdx, m.start);
      if (rawText) {
        elements.push(renderTextWithEmbeddedImages(rawText, `${baseKey}-text-${idx}`));
      }
    }

    elements.push(renderMathSpan(m.content, m.type === 'block', `${baseKey}-math-${idx}`));
    lastIdx = m.end;
  });

  if (lastIdx < text.length) {
    const trailingText = text.substring(lastIdx);
    if (trailingText) {
      elements.push(renderTextWithEmbeddedImages(trailingText, `${baseKey}-tail`));
    }
  }

  return elements.length > 0 ? elements : text;
}

// Render plain text chunk that might contain mid-line image URLs
function renderTextWithEmbeddedImages(text: string, baseKey: string | number) {
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  IMAGE_URL_REGEX.lastIndex = 0;
  let count = 0;
  while ((match = IMAGE_URL_REGEX.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    parts.push(renderImageTag(match[0], `${baseKey}-img-${count++}`));
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return <React.Fragment key={baseKey}>{parts}</React.Fragment>;
}

export default function LaTeXRenderer({ content, className = '', inline = false }: LaTeXRendererProps) {
  if (!content) {
    return <span className={className}></span>;
  }

  const trimmed = typeof content === 'string' ? content.trim() : String(content);

  // 1. Bare URL: render as image directly
  if (BARE_URL_REGEX.test(trimmed)) {
    return (
      <div className={className}>
        {renderImageTag(trimmed, 'bare-img')}
      </div>
    );
  }

  // 2. If inline mode requested (e.g. within tight button/badge), render single inline segment
  if (inline) {
    return (
      <span className={className}>
        {renderTextSegmentWithMath(trimmed, 'inline')}
      </span>
    );
  }

  // 3. Multiline question stem / paragraph with potential diagram URLs on separate lines
  const lines = trimmed.split(/\r?\n/);

  return (
    <div className={`space-y-1.5 ${className}`}>
      {lines.map((line, lineIdx) => {
        const lineTrimmed = line.trim();

        if (!lineTrimmed) {
          return <div key={lineIdx} className="h-2" />;
        }

        // Bare URL on its own line (e.g. diagram between text paragraphs)
        if (BARE_URL_REGEX.test(lineTrimmed)) {
          return (
            <div key={lineIdx} className="my-3">
              {renderImageTag(lineTrimmed, `line-img-${lineIdx}`)}
            </div>
          );
        }

        return (
          <div key={lineIdx} className="leading-relaxed whitespace-pre-wrap break-words">
            {renderTextSegmentWithMath(line, `line-${lineIdx}`)}
          </div>
        );
      })}
    </div>
  );
}

// Helper function to extract LaTeX from text
export function extractLaTeX(content: string): string[] {
  const latexMatches = content.match(/\$\$.*?\$\$|\$.*?\$/g);
  return latexMatches || [];
}

// Helper function to check if content contains LaTeX
export function hasLaTeX(content: string): boolean {
  return /\$\$.*?\$\$|\$.*?\$/.test(content);
}
