/**
 * Duration estimation utilities
 * Estimates reading/viewing time based on content
 */

/**
 * Sanitize HTML to plain text for word counting
 */
function sanitizeHtml(html: string): string {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Count words in text
 */
function countWords(text: string): number {
  if (!text) return 0;
  return text.trim().split(/\s+/).filter(word => word.length > 0).length;
}

/**
 * Estimate reading time for article content
 * Assumes 250 words per minute (average reading speed)
 *
 * @param articleHtml - HTML content of the article
 * @returns Estimated duration in minutes
 */
export function estimateArticleDuration(articleHtml: string): number {
  const plainText = sanitizeHtml(articleHtml);
  const wordCount = countWords(plainText);

  // 250 words per minute is average reading speed
  const minutes = wordCount / 250;

  // Round to nearest minute, minimum 1 minute
  return Math.max(1, Math.round(minutes));
}

/**
 * Estimate duration for video transcript
 * Assumes 150 words per minute (average speaking speed)
 *
 * @param transcript - Array of transcript segments with text
 * @returns Estimated duration in minutes
 */
export function estimateTranscriptDuration(transcript: { text: string; start?: number; duration?: number }[]): number {
  if (!transcript || transcript.length === 0) return 0;

  // If transcript has duration info, use that
  const totalSeconds = transcript.reduce((sum, segment) => {
    if (segment.duration) {
      return sum + segment.duration;
    }
    return sum;
  }, 0);

  if (totalSeconds > 0) {
    return Math.max(1, Math.round(totalSeconds / 60));
  }

  // Otherwise, estimate based on word count
  // Speaking speed is typically 150 words per minute
  const allText = transcript.map(t => t.text).join(' ');
  const wordCount = countWords(allText);
  const minutes = wordCount / 150;

  return Math.max(1, Math.round(minutes));
}

/**
 * Estimate duration for a lesson based on its content
 *
 * @param lesson - Lesson object with content
 * @returns Estimated duration in minutes
 */
export function estimateLessonDuration(lesson: {
  contentType: 'video' | 'article' | 'video-article';
  duration?: number;
  content: {
    articleHtml?: string;
    transcript?: { text: string; start?: number; duration?: number }[];
    videoUrl?: string;
  };
}): number {
  // If duration is already provided and non-zero, use it
  if (lesson.duration && lesson.duration > 0) {
    return lesson.duration;
  }

  let totalDuration = 0;

  // Estimate article duration
  if ((lesson.contentType === 'article' || lesson.contentType === 'video-article') && lesson.content.articleHtml) {
    totalDuration += estimateArticleDuration(lesson.content.articleHtml);
  }

  // Estimate video duration from transcript
  if ((lesson.contentType === 'video' || lesson.contentType === 'video-article') && lesson.content.transcript) {
    totalDuration += estimateTranscriptDuration(lesson.content.transcript);
  }

  // If we have a video but no transcript and no duration, assume 5 minutes
  if ((lesson.contentType === 'video' || lesson.contentType === 'video-article') && lesson.content.videoUrl && !lesson.content.transcript && totalDuration === 0) {
    totalDuration = 5;
  }

  return Math.max(1, totalDuration);
}

/**
 * Calculate total course duration from all modules and lessons
 *
 * @param modules - Array of course modules with lessons
 * @returns Total estimated duration in minutes
 */
export function calculateCourseDuration(modules: Array<{
  lessons: Array<{
    duration: number;
  }>;
}>): number {
  if (!modules || modules.length === 0) return 0;

  return modules.reduce((courseTotal, module) => {
    const moduleDuration = module.lessons?.reduce((moduleTotal, lesson) => {
      return moduleTotal + (lesson.duration || 0);
    }, 0) || 0;

    return courseTotal + moduleDuration;
  }, 0);
}
