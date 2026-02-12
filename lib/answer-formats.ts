// Alternative submission format handler
// This file provides methods to handle different answer format expectations

export function convertAnswersToAlternateFormat(
  answers: Record<string, string>,
  questions: { id: string; type: string }[]
): Record<string, any> {
  /**
   * Some backends might expect:
   * - Arrays for multi-select: instead of "A|B" use ["A", "B"]
   * - Different ID formats
   * - Different answer value formats
   */
  const result: Record<string, any> = {};
  
  for (const q of questions) {
    const answer = answers[q.id];
    if (answer === undefined || answer === null) {
      result[q.id] = q.type === "MULTI_SELECT" ? [] : "";
      continue;
    }
    
    if (q.type === "MULTI_SELECT" && typeof answer === "string") {
      // Convert pipe-separated to array
      result[q.id] = answer
        .split("|")
        .map(s => s.trim())
        .filter(s => s.length > 0);
    } else {
      result[q.id] = answer;
    }
  }
  
  return result;
}

export function convertAnswersToIndexFormat(
  answers: Record<string, string>,
  options: Record<string, any>
): Record<string, string> {
  /**
   * Some backends store correct answers as indices (0, 1, 2)
   * instead of option text. This converts answers to that format.
   * options: { questionId: ["opt1", "opt2", "opt3"], ... }
   */
  const result: Record<string, string> = {};
  
  for (const [qId, answer] of Object.entries(answers)) {
    const opts = options[qId] || [];
    
    if (!answer) {
      result[qId] = "";
      continue;
    }
    
    if (answer.includes("|")) {
      // Multi-select: convert to indices
      const answers_arr = answer.split("|").map(s => s.trim());
      const indices = answers_arr
        .map(ans => opts.indexOf(ans))
        .filter(idx => idx >= 0);
      result[qId] = indices.join("|");
    } else {
      // Single select: convert to index
      const idx = opts.indexOf(answer);
      result[qId] = idx >= 0 ? String(idx) : answer;
    }
  }
  
  return result;
}
