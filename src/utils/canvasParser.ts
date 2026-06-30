export interface MessagePart {
  type: 'text' | 'canvas';
  content: string; // original raw text of this part
  command?: 'create' | 'edit' | 'append';
  title?: string;
  canvasContent?: string;
}

interface RawCanvasMatch {
  command: 'create' | 'edit' | 'append';
  rawLength: number;
  title: string;
  content?: string;
}

interface Segment {
  content: string;
  endIndex: number; // index of closing ']' in the original string
  isComplete: boolean;
}

function parseSegment(text: string, startIdx: number): Segment | null {
  // Find first opening bracket '[' starting from startIdx
  const openBracket = text.indexOf('[', startIdx);
  if (openBracket === -1) return null;
  
  let bracketCount = 1;
  let endIdx = -1;
  for (let i = openBracket + 1; i < text.length; i++) {
    if (text[i] === '[') {
      bracketCount++;
    } else if (text[i] === ']') {
      bracketCount--;
      if (bracketCount === 0) {
        endIdx = i;
        break;
      }
    }
  }
  
  if (endIdx !== -1) {
    return {
      content: text.substring(openBracket + 1, endIdx),
      endIndex: endIdx,
      isComplete: true
    };
  } else {
    // Incomplete segment (e.g. still streaming)
    return {
      content: text.substring(openBracket + 1),
      endIndex: text.length - 1,
      isComplete: false
    };
  }
}

function findCanvasMatch(text: string, startIdx: number): RawCanvasMatch | null {
  const appendPrefix = '@CANVAS_APPEND-';
  const editPrefix = '@CANVAS!-';
  const createPrefix = '@CANVAS-';
  
  let command: 'create' | 'edit' | 'append' | null = null;
  let prefixLen = 0;
  
  if (text.startsWith(appendPrefix, startIdx)) {
    command = 'append';
    prefixLen = appendPrefix.length;
  } else if (text.startsWith(editPrefix, startIdx)) {
    command = 'edit';
    prefixLen = editPrefix.length;
  } else if (text.startsWith(createPrefix, startIdx)) {
    command = 'create';
    prefixLen = createPrefix.length;
  } else {
    return null;
  }
  
  const remaining = text.substring(startIdx + prefixLen);
  if (!remaining) return null;
  
  // 1. If it doesn't start with '[', let's check for fallback (only for simple create/edit)
  if (!remaining.startsWith('[')) {
    if (command === 'create' || command === 'edit') {
      const hyphenIdx = remaining.indexOf('-');
      if (hyphenIdx !== -1) {
        const title = remaining.substring(0, hyphenIdx).trim();
        const content = remaining.substring(hyphenIdx + 1).trim();
        return {
          command,
          rawLength: text.length - startIdx,
          title,
          content
        };
      }
    }
    return null;
  }
  
  // 2. Parse Segments using our robust segment parser!
  const seg1 = parseSegment(text, startIdx + prefixLen);
  if (!seg1) return null;
  const title = seg1.content.trim();
  
  // We expect 2 segments: Title, Content
  const seg2 = parseSegment(text, seg1.endIndex + 1);
  if (!seg2) {
    // Still typing content segment
    return {
      command,
      rawLength: text.length - startIdx,
      title,
      content: text.substring(seg1.endIndex + 1).replace(/^-\[?/, '').replace(/\]$/, '')
    };
  }
  const content = seg2.content;
  
  return {
    command,
    rawLength: (seg2.endIndex + 1) - startIdx,
    title,
    content
  };
}

export function splitMessageContent(text: string): MessagePart[] {
  const parts: MessagePart[] = [];
  let index = 0;

  const prefixes = ['@CANVAS_APPEND-', '@CANVAS!-', '@CANVAS-'];

  while (index < text.length) {
    // Find the earliest occurrence of any prefix
    let earliestPrefixIdx = -1;
    let selectedPrefix = '';
    
    for (const prefix of prefixes) {
      const idx = text.indexOf(prefix, index);
      if (idx !== -1) {
        if (earliestPrefixIdx === -1 || idx < earliestPrefixIdx) {
          earliestPrefixIdx = idx;
          selectedPrefix = prefix;
        }
      }
    }

    if (earliestPrefixIdx === -1) {
      parts.push({ type: 'text', content: text.substring(index) });
      break;
    }

    // Add preceding text if any
    if (earliestPrefixIdx > index) {
      parts.push({ type: 'text', content: text.substring(index, earliestPrefixIdx) });
    }

    const match = findCanvasMatch(text, earliestPrefixIdx);
    if (!match) {
      // Not a real match, treat the prefix as text to avoid infinite loops, advance past prefix
      parts.push({ type: 'text', content: selectedPrefix });
      index = earliestPrefixIdx + selectedPrefix.length;
      continue;
    }

    parts.push({
      type: 'canvas',
      content: text.substring(earliestPrefixIdx, earliestPrefixIdx + match.rawLength),
      command: match.command,
      title: match.title,
      canvasContent: match.content
    });

    index = earliestPrefixIdx + match.rawLength;
  }

  return parts;
}

export interface ParsedCanvasBlock {
  command: 'create' | 'edit' | 'append';
  title: string;
  content?: string;
}

export function parseCanvasBlocks(text: string): ParsedCanvasBlock[] {
  const parts = splitMessageContent(text);
  const blocks: ParsedCanvasBlock[] = [];

  for (const part of parts) {
    if (part.type === 'canvas' && part.title && part.command) {
      blocks.push({
        command: part.command,
        title: part.title,
        content: part.canvasContent
      });
    }
  }

  return blocks;
}
