import Anthropic from '@anthropic-ai/sdk';
import { config } from '../config.js';
import { logger } from '../logger.js';
import { LANGUAGES, TRANSLATION_STYLES } from '../../shared/types.js';

const anthropic = new Anthropic({
  apiKey: config.ANTHROPIC_API_KEY,
});

interface TranslationResult {
  id?: string;
  translation: string;
  tokensInput: number;
  tokensOutput: number;
}

function getLanguageName(code: string): string {
  return LANGUAGES.find((l) => l.code === code)?.name || code;
}

function getStylePrompt(style: string): string {
  const styleInfo = TRANSLATION_STYLES.find((s) => s.id === style);
  if (!styleInfo) return '';

  const stylePrompts: Record<string, string> = {
    standard: 'Translate naturally while preserving the original meaning and tone.',
    formal: 'Use formal, professional language suitable for business communication. Avoid contractions and casual expressions.',
    informal: 'Use casual, conversational language. Feel free to use contractions and common expressions.',
    technical: 'Preserve technical terminology accurately. Maintain precision and use industry-standard terms.',
    legal: 'Use formal legal language. Preserve exact legal terminology and maintain formal structure.',
    marketing: 'Create engaging, persuasive copy that resonates with the target audience. Adapt cultural references as needed.',
    literary: 'Preserve artistic style, rhythm, and literary devices. Maintain the author\'s voice.',
    medical: 'Use precise medical terminology. Maintain clinical accuracy and professional tone.',
    academic: 'Use scholarly language suitable for academic publications. Maintain formal structure.',
    conversational: 'Translate as natural spoken dialogue. Preserve speech patterns and colloquialisms.',
  };

  return stylePrompts[style] || stylePrompts.standard;
}

export async function translateText(
  text: string,
  sourceLanguage: string,
  targetLanguage: string,
  model: string,
  style: string,
  glossaryTerms?: Map<string, string>
): Promise<TranslationResult> {
  const sourceLang = getLanguageName(sourceLanguage);
  const targetLang = getLanguageName(targetLanguage);
  const stylePrompt = getStylePrompt(style);

  let glossaryContext = '';
  if (glossaryTerms && glossaryTerms.size > 0) {
    const relevantTerms: string[] = [];
    glossaryTerms.forEach((target, source) => {
      if (text.toLowerCase().includes(source)) {
        relevantTerms.push(`"${source}" → "${target}"`);
      }
    });
    if (relevantTerms.length > 0) {
      glossaryContext = `\n\nUse these specific term translations:\n${relevantTerms.join('\n')}`;
    }
  }

  const systemPrompt = `You are a professional translator. Translate the following text from ${sourceLang} to ${targetLang}.

${stylePrompt}${glossaryContext}

Important instructions:
- Translate ONLY the text, do not add explanations or notes
- Preserve formatting (line breaks, spacing, punctuation style)
- Do not translate proper nouns unless they have standard translations
- Maintain the same level of formality as specified
- Output ONLY the translated text, nothing else`;

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 4096,
      messages: [
        {
          role: 'user',
          content: text,
        },
      ],
      system: systemPrompt,
    });

    const translation = response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : '';

    return {
      translation,
      tokensInput: response.usage.input_tokens,
      tokensOutput: response.usage.output_tokens,
    };
  } catch (error) {
    logger.error('Translation API error:', error);
    throw new Error(`Translation failed: ${(error as Error).message}`);
  }
}

export async function translateBatch(
  segments: { id: string; text: string }[],
  sourceLanguage: string,
  targetLanguage: string,
  model: string,
  style: string,
  glossaryTerms?: Map<string, string>
): Promise<TranslationResult[]> {
  const sourceLang = getLanguageName(sourceLanguage);
  const targetLang = getLanguageName(targetLanguage);
  const stylePrompt = getStylePrompt(style);

  // Build glossary context
  let glossaryContext = '';
  if (glossaryTerms && glossaryTerms.size > 0) {
    const allText = segments.map((s) => s.text).join(' ').toLowerCase();
    const relevantTerms: string[] = [];
    glossaryTerms.forEach((target, source) => {
      if (allText.includes(source)) {
        relevantTerms.push(`"${source}" → "${target}"`);
      }
    });
    if (relevantTerms.length > 0) {
      glossaryContext = `\n\nUse these specific term translations:\n${relevantTerms.join('\n')}`;
    }
  }

  const systemPrompt = `You are a professional translator. Translate texts from ${sourceLang} to ${targetLang}.

${stylePrompt}${glossaryContext}

Important instructions:
- Translate each segment separately
- Preserve formatting within each segment
- Do not translate proper nouns unless they have standard translations
- Output ONLY translations in JSON format`;

  // Format segments for batch translation
  const batchContent = segments.map((s, i) => `[${i}] ${s.text}`).join('\n\n');

  try {
    const response = await anthropic.messages.create({
      model,
      max_tokens: 8192,
      messages: [
        {
          role: 'user',
          content: `Translate these ${segments.length} text segments. Return a JSON array with translations in the same order.

${batchContent}

Return ONLY a JSON array of strings with translations, like: ["translation1", "translation2", ...]`,
        },
      ],
      system: systemPrompt,
    });

    const responseText = response.content[0].type === 'text'
      ? response.content[0].text.trim()
      : '[]';

    // Parse JSON response
    let translations: string[];
    try {
      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      translations = jsonMatch ? JSON.parse(jsonMatch[0]) : [];
    } catch {
      // Fallback: split by common patterns
      logger.warn('Failed to parse batch translation response as JSON, using fallback');
      translations = responseText
        .split(/\n\n|\[\d+\]/)
        .filter((t) => t.trim())
        .map((t) => t.trim());
    }

    // Ensure we have the right number of translations
    if (translations.length !== segments.length) {
      logger.warn(`Translation count mismatch: expected ${segments.length}, got ${translations.length}`);
      // Pad or truncate
      while (translations.length < segments.length) {
        translations.push(segments[translations.length].text);
      }
      translations = translations.slice(0, segments.length);
    }

    // Calculate per-segment token estimate
    const tokensPerSegment = {
      input: Math.ceil(response.usage.input_tokens / segments.length),
      output: Math.ceil(response.usage.output_tokens / segments.length),
    };

    return segments.map((seg, i) => ({
      id: seg.id,
      translation: translations[i] || seg.text,
      tokensInput: tokensPerSegment.input,
      tokensOutput: tokensPerSegment.output,
    }));
  } catch (error) {
    logger.error('Batch translation API error:', error);
    throw new Error(`Batch translation failed: ${(error as Error).message}`);
  }
}
