/**
 * Markdown Conversion Utilities
 *
 * Converts markdown to HTML for use with TipTap editor.
 * For production, consider using a library like 'marked' or 'remark'.
 */

/**
 * Convert markdown to HTML
 * Handles common markdown syntax for educational content
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return '';

  let html = markdown;

  // Escape HTML entities first
  html = html
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');

  // Headers (must be done before other replacements)
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Bold and Italic
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
  html = html.replace(/\_\_\_(.*?)\_\_\_/g, '<strong><em>$1</em></strong>');
  html = html.replace(/\_\_(.*?)\_\_/g, '<strong>$1</strong>');
  html = html.replace(/\_(.*?)\_/g, '<em>$1</em>');

  // Links
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2">$1</a>');

  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

  // Code blocks
  html = html.replace(/```([^`]+)```/gs, '<pre><code>$1</code></pre>');

  // Unordered lists (must process multi-line)
  html = html.replace(/^\* (.+)$/gim, '<li>$1</li>');
  html = html.replace(/^- (.+)$/gim, '<li>$1</li>');

  // Ordered lists
  html = html.replace(/^\d+\. (.+)$/gim, '<li>$1</li>');

  // Wrap consecutive list items in ul/ol tags
  html = html.replace(/(<li>.*<\/li>\n?)+/gs, (match) => {
    // Check if it's an ordered or unordered list based on the original markdown
    // For simplicity, we'll wrap in <ul> by default
    return `<ul>${match}</ul>`;
  });

  // Blockquotes
  html = html.replace(/^> (.+)$/gim, '<blockquote>$1</blockquote>');

  // Horizontal rules
  html = html.replace(/^---$/gim, '<hr>');
  html = html.replace(/^\*\*\*$/gim, '<hr>');

  // Paragraphs (wrap lines that aren't already wrapped in tags)
  const lines = html.split('\n');
  const processedLines = lines.map((line) => {
    const trimmedLine = line.trim();
    // Skip if empty or already has HTML tags
    if (!trimmedLine || trimmedLine.startsWith('<')) {
      return line;
    }
    return `<p>${line}</p>`;
  });

  html = processedLines.join('\n');

  // Clean up extra whitespace
  html = html.replace(/\n\s*\n/g, '\n');

  return html;
}

/**
 * Simple markdown to plain text converter
 * Strips all markdown syntax
 */
export function markdownToPlainText(markdown: string): string {
  if (!markdown) return '';

  let text = markdown;

  // Remove headers
  text = text.replace(/^#{1,6}\s+/gim, '');

  // Remove bold/italic
  text = text.replace(/\*\*\*(.+?)\*\*\*/g, '$1');
  text = text.replace(/\*\*(.+?)\*\*/g, '$1');
  text = text.replace(/\*(.+?)\*/g, '$1');
  text = text.replace(/___(.+?)___/g, '$1');
  text = text.replace(/__(.+?)__/g, '$1');
  text = text.replace(/_(.+?)_/g, '$1');

  // Remove links (keep text)
  text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1');

  // Remove inline code
  text = text.replace(/`([^`]+)`/g, '$1');

  // Remove code blocks
  text = text.replace(/```[^`]*```/gs, '');

  // Remove list markers
  text = text.replace(/^\* /gim, '');
  text = text.replace(/^- /gim, '');
  text = text.replace(/^\d+\. /gim, '');

  // Remove blockquotes
  text = text.replace(/^> /gim, '');

  // Remove horizontal rules
  text = text.replace(/^---$/gim, '');
  text = text.replace(/^\*\*\*$/gim, '');

  // Clean up whitespace
  text = text.replace(/\n\s*\n/g, '\n').trim();

  return text;
}

/**
 * Estimate reading time for markdown content
 * Assumes average reading speed of 200 words per minute
 */
export function estimateReadingTime(markdown: string): number {
  if (!markdown) return 0;

  const plainText = markdownToPlainText(markdown);
  const wordCount = plainText.split(/\s+/).filter((word) => word.length > 0).length;
  const minutes = Math.ceil(wordCount / 200);

  return minutes;
}

/**
 * Get word count from markdown
 */
export function getWordCount(markdown: string): number {
  if (!markdown) return 0;

  const plainText = markdownToPlainText(markdown);
  return plainText.split(/\s+/).filter((word) => word.length > 0).length;
}

/**
 * Validate markdown structure
 * Returns warnings for potential formatting issues
 */
export function validateMarkdown(markdown: string): string[] {
  const warnings: string[] = [];

  if (!markdown) {
    warnings.push('Content is empty');
    return warnings;
  }

  // Check for unmatched bold markers
  const boldCount = (markdown.match(/\*\*/g) || []).length;
  if (boldCount % 2 !== 0) {
    warnings.push('Unmatched bold markers (**)');
  }

  // Check for unmatched italic markers
  const italicCount = (markdown.match(/(?<!\*)\*(?!\*)/g) || []).length;
  if (italicCount % 2 !== 0) {
    warnings.push('Unmatched italic markers (*)');
  }

  // Check for unmatched code blocks
  const codeBlockCount = (markdown.match(/```/g) || []).length;
  if (codeBlockCount % 2 !== 0) {
    warnings.push('Unmatched code block markers (```)');
  }

  // Check for very long paragraphs (readability issue)
  const lines = markdown.split('\n');
  lines.forEach((line, index) => {
    if (line.trim() && !line.startsWith('#') && !line.startsWith('-') && !line.startsWith('*') && !line.startsWith('>')) {
      const wordCount = line.split(/\s+/).length;
      if (wordCount > 100) {
        warnings.push(`Line ${index + 1}: Very long paragraph (${wordCount} words). Consider breaking it up.`);
      }
    }
  });

  return warnings;
}
