import { OllamaModel, RunningModel } from '../types';

// Default Ollama local URL
export const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

// Popular models to recommend or pull
export const POPULAR_MODELS = [
  { name: 'llama3:8b', size: '4.7 GB', desc: 'Meta\'s powerful 8B parameter model' },
  { name: 'mistral:7b', size: '4.1 GB', desc: 'Dense 7B model, strong reasoning' },
  { name: 'phi3:3.8b', size: '2.2 GB', desc: 'Microsoft\'s ultra-lightweight but capable model' },
  { name: 'gemma2:9b', size: '5.5 GB', desc: 'Google\'s open, highly-efficient model' },
  { name: 'deepseek-coder:6.7b', size: '3.8 GB', desc: 'Exceptional model for code and math' },
  { name: 'qwen2.5:7b', size: '4.7 GB', desc: 'Strong multi-lingual and reasoning capabilities' },
];

// Helper to check connection to Ollama
export async function testOllamaConnection(url: string): Promise<boolean> {
  try {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), 2000); // 2s timeout
    
    const response = await fetch(`${url}/api/tags`, {
      method: 'GET',
      signal: controller.signal,
    });
    
    clearTimeout(id);
    return response.ok;
  } catch (err) {
    return false;
  }
}

// Fetch installed models
export async function fetchOllamaModels(url: string): Promise<OllamaModel[]> {
  const response = await fetch(`${url}/api/tags`, {
    method: 'GET',
  });
  
  if (!response.ok) {
    throw new Error(`Failed to fetch models: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.models || [];
}

// Fetch running/loaded models in RAM
export async function fetchLoadedModels(url: string): Promise<RunningModel[]> {
  try {
    const response = await fetch(`${url}/api/ps`, {
      method: 'GET',
    });
    if (!response.ok) return [];
    const data = await response.json();
    return data.models || [];
  } catch (e) {
    return [];
  }
}

// Unload model from RAM
export async function unloadOllamaModel(url: string, modelName: string): Promise<boolean> {
  try {
    const response = await fetch(`${url}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: modelName,
        messages: [],
        keep_alive: 0
      })
    });
    return response.ok;
  } catch (err) {
    console.error('Failed to unload model:', err);
    return false;
  }
}

// Pull (download) a new model
export async function pullOllamaModel(
  url: string,
  modelName: string,
  onProgress: (status: string, percentage: number) => void
): Promise<void> {
  const response = await fetch(`${url}/api/pull`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: modelName, stream: true }),
  });

  if (!response.ok) {
    throw new Error(`Failed to pull model: ${response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No readable stream available');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || ''; // Keep trailing incomplete line

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        const status = data.status || 'Downloading...';
        
        let percentage = 0;
        if (data.total && data.completed) {
          percentage = Math.round((data.completed / data.total) * 100);
        } else if (status.includes('success')) {
          percentage = 100;
        }
        
        onProgress(status, percentage);
      } catch (e) {
        console.warn('Error parsing pull progress:', e);
      }
    }
  }
}

// Stream chat completions
export async function streamOllamaChat(
  url: string,
  model: string,
  messages: { role: string; content: string }[],
  onChunk: (chunk: string) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(`${url}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, messages, stream: true }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Ollama Chat Error (${response.status}): ${errorText || response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No readable stream available');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        if (data.message?.content) {
          onChunk(data.message.content);
        }
      } catch (e) {
        console.warn('Error parsing chat stream chunk:', e);
      }
    }
  }
}

// Stream standard text generation (continuation)
export async function streamOllamaGenerate(
  url: string,
  model: string,
  prompt: string,
  onChunk: (chunk: string) => void,
  signal?: AbortSignal,
  raw?: boolean
): Promise<void> {
  const response = await fetch(`${url}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      model, 
      prompt, 
      stream: true,
      ...(raw !== undefined ? { raw } : {})
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Ollama Generate Error (${response.status}): ${errorText || response.statusText}`);
  }

  const reader = response.body?.getReader();
  if (!reader) throw new Error('No readable stream available');

  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split('\n');
    buffer = lines.pop() || '';

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const data = JSON.parse(line);
        if (data.response) {
          onChunk(data.response);
        }
      } catch (e) {
        console.warn('Error parsing generate stream chunk:', e);
      }
    }
  }
}

// Generate auto-title based on the first user-model exchange
export async function generateChatTitle(
  url: string,
  model: string,
  userPrompt: string,
  modelResponse: string
): Promise<string> {
  try {
    const prompt = `You are a helpful assistant. Please review the conversation summary below and respond with a brief, highly concise title (2 to 4 words maximum) that perfectly summarizes the chat. Do NOT include quotation marks, formatting, headers, or any punctuation.

Conversation:
User: "${userPrompt.substring(0, 300)}"
Assistant: "${modelResponse.substring(0, 300)}"

Respond with ONLY the 2-4 word title:`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000); // 4 seconds limit

    const response = await fetch(`${url}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          num_predict: 12,
          temperature: 0.5,
        }
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      const data = await response.json();
      const title = data.response?.trim();
      if (title && title.length > 2 && title.length < 50) {
        // Clean any potential trailing/leading quotes or markdown
        return title.replace(/^["'`]|["'`]$/g, '').trim();
      }
    }
  } catch (err) {
    console.warn('Failed to auto-generate title via Ollama, falling back to heuristic:', err);
  }

  // Fallback heuristic: First 4-5 words of user prompt
  const words = userPrompt.split(/\s+/).filter(Boolean);
  if (words.length <= 4) return userPrompt;
  return words.slice(0, 4).join(' ') + '...';
}

// Simulated replies for Demo Mode
export function getSimulatedReply(model: string, userMessage: string): string {
  const query = userMessage.toLowerCase();
  const modelClean = model.split(':')[0];

  if (query.includes('hello') || query.includes('hi ') || query.includes('hey')) {
    return `Hello! I am **${model}**, running via your simulated Ollama server. 

I'm ready to help you with code, brainstorming, text formatting, or answering questions. How can I assist you today?`;
  }

  if (query.includes('code') || query.includes('write a function') || query.includes('javascript') || query.includes('python')) {
    return `Here is a clean, modern implementation for you:

\`\`\`typescript
// Calculate the Fibonacci sequence up to N terms
function getFibonacciSequence(terms: number): number[] {
  if (terms <= 0) return [];
  if (terms === 1) return [0];
  
  const sequence = [0, 1];
  for (let i = 2; i < terms; i++) {
    sequence.push(sequence[i - 1] + sequence[i - 2]);
  }
  return sequence;
}

// Example usage:
const fib10 = getFibonacciSequence(10);
console.log("Fibonacci (10 terms):", fib10);
// Output: [0, 1, 1, 2, 3, 5, 8, 13, 21, 34]
\`\`\`

Let me know if you need any adjustments or a different programming language!`;
  }

  if (query.includes('why') && (query.includes('sky') || query.includes('blue'))) {
    return `The sky is blue because of a phenomenon called **Rayleigh scattering**.

Here's how it works step-by-step:
1. **Sunlight** reaches Earth's atmosphere and is scattered in all directions by all the gases and particles in the air.
2. Sunlight is made up of **all the colors** of the rainbow (different wavelengths).
3. **Blue and violet light** travel as smaller, shorter waves, which makes them scatter much more than other colors (like red or yellow).
4. Since violet light is scattered even more, you might wonder why we don't see a violet sky. This is because **our eyes are much more sensitive to blue** and because the sun emits a higher percentage of blue light compared to violet.

Therefore, we see a beautiful blue sky on a clear day!`;
  }

  if (query.includes('help') || query.includes('what can you do')) {
    return `I am highly optimized for various tasks:
- 💻 **Software Development**: Writing code, debugging, and explaining algorithms.
- 📝 **Writing & Editing**: Crafting essays, technical documentation, or refining copy.
- 💡 **Brainstorming**: Coming up with creative ideas, naming schemes, or strategies.
- 🔍 **Summarization**: Condensing long articles or chats into short summaries.

How would you like to start?`;
  }

  // General responsive answers based on model personality
  switch (modelClean) {
    case 'llama3':
      return `As **Meta's Llama 3**, I've parsed your message: "${userMessage}". 

This is an insightful question. From an analytical perspective, we should consider that:
1. **Context**: Every challenge has variables that define its scope.
2. **Analysis**: Breaking down the concept allows us to see patterns.
3. **Action**: The best next step is to explore the details.

Would you like me to elaborate on any particular aspect of this?`;

    case 'mistral':
      return `Greetings. I am **Mistral**, crafted to bring elegant reasoning and concise intelligence to your workspace.

Regarding your query about *"${userMessage}"*, here is a structured breakdown:
- **Core Concept**: Understanding the fundamental driver.
- **Key Insight**: Adapting to change with flexible frameworks.
- **Conclusion**: Applying this learning directly.

*"Intelligence is the ability to adapt to change."* Let me know how we can delve deeper.`;

    case 'phi3':
      return `Hi! **Phi-3** here, Microsoft's highly efficient small language model. 

Here is a quick, precise answer to your question:
- **Direct Answer**: I've processed your prompt about "${userMessage}".
- **Efficiency Tip**: When dealing with this topic, keeping variables clear and concise yields the highest accuracy.

Let's keep it simple! What's next?`;

    case 'gemma2':
      return `Hello! I'm **Gemma 2**, Google's open and highly optimized model. 🌟

I'd be happy to discuss "${userMessage}"! Here is a friendly summary of what we know:
* **Point A**: Exploring new horizons and data structures.
* **Point B**: Relying on robust foundations and user inputs.
* **Point C**: Synthesizing feedback loops into elegant designs.

What are your thoughts on this approach? Let's build something great!`;

    default:
      return `This is a response from **${model}**. 

I received your prompt: "${userMessage}". 

In a real local environment, I would execute high-speed token generation directly on your GPU or CPU cores. Here, I'm demonstrating the beautiful dark chat UI, scroll states, markdown code blocks, copy features, and sidebar controls.

Try checking the **connection indicator** in the top left or click the gear icon to set up your real local Ollama server!`;
  }
}

/**
 * Fetches the complete non-streamed chat response from Ollama.
 */
export async function fetchOllamaChat(
  url: string,
  model: string,
  messages: { role: string; content: string }[],
  signal?: AbortSignal
): Promise<string> {
  const response = await fetch(`${url}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
    }),
    signal,
  });

  if (!response.ok) {
    const errorText = await response.text().catch(() => '');
    throw new Error(`Ollama Chat Error (${response.status}): ${errorText || response.statusText}`);
  }

  const data = await response.json();
  return data.message?.content || '';
}

/**
 * Checks if the generated content is safe for kids.
 * Returns true if safe, false if unsafe.
 */
export async function checkContentSafety(
  url: string,
  model: string,
  content: string,
  demoMode: boolean,
  ageGroup?: string
): Promise<boolean> {
  if (demoMode) {
    // Simulated safety check delay
    await new Promise((resolve) => setTimeout(resolve, 1200));
    
    // Teen mode is more lenient on violence (swears and really bad stuff like severe drugs or suicide/murder are blocked)
    const unsafeWords = ageGroup === 'teen'
      ? ['fuck', 'shit', 'asshole', 'bitch', 'cunt', 'dick', 'pussy', 'bastard', 'cocaine', 'heroin', 'meth', 'murder', 'bomb', 'terrorist', 'suicide']
      : ['kill', 'die', 'bomb', 'blood', 'murder', 'hack', 'steal', 'weapon', 'gun', 'drugs', 'exploding', 'hackers'];
      
    const lower = content.toLowerCase();
    const hasUnsafe = unsafeWords.some((word) => lower.includes(word));
    return !hasUnsafe;
  }

  try {
    let prompt = '';
    if (ageGroup === 'teen') {
      prompt = `You are a teen safety classifier. Review the following text generated by an AI assistant. Is it appropriate for a teenager (13+)?
We allow mild action, fantasy violence, adventure, coding/hacking, and reference to weapons/guns, but we strictly block severe/extreme graphic violence, explicit sexual content, vulgar/heavy swearing or profanity, hate speech, self-harm/suicide, and illegal drug abuse.
If the text contains any extreme violence, explicit sexual content, heavy swearing/profanity, illegal drugs, or self-harm, respond with ONLY the symbol '!'.
Otherwise, if it is appropriate for a teenager, respond with ONLY the symbol '$'.
Do not write any other letters, words, explanations, or punctuation.

Text to evaluate:
"""
${content}
"""

Safety Code (either '$' or '!'):`;
    } else {
      prompt = `You are a strict child safety classifier. Review the following text generated by an AI assistant. Is it completely safe, appropriate, and friendly for a young child?
If it contains any violent, scary, mature, drug, weapon, self-harm, cyber-attack/hacking, or highly inappropriate themes, respond with ONLY the symbol '!'.
Otherwise, if it is completely safe and appropriate, respond with ONLY the symbol '$'.
Do not write any other letters, words, explanations, or punctuation.

Text to evaluate:
"""
${content}
"""

Safety Code (either '$' or '!'):`;
    }

    const response = await fetch(`${url}/api/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model,
        prompt,
        stream: false,
        options: {
          num_predict: 5,
          temperature: 0.1,
        },
      }),
    });

    if (response.ok) {
      const data = await response.json();
      const result = data.response?.trim();
      if (result && result.includes('!')) {
        return false;
      }
      return true;
    }
  } catch (err) {
    console.warn('Ollama safety classification failed, defaulting to safe:', err);
  }
  return true;
}
