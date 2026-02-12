# Quiz Selection and Scoring Fixes

## Issues Fixed

Your quiz app had problems with:
1. **Option format inconsistency** - Options could be strings, numbers, or objects, but weren't being normalized consistently
2. **Answer comparison mismatch** - User answers weren't being compared properly to correct answers
3. **Format conversion issues** - Answers weren't being converted to the right format for submission and checking

## Solutions Implemented

### 1. **Option Normalization** (`normalizeOptions` function)

**Problem**: Options from your API could come in various formats:
- Plain strings: `["Option A", "Option B"]`
- Numbers (indices): `[0, 1, 2]`
- Objects: `[{id: "a", text: "Option A"}]`

**Solution**: Created a centralized `normalizeOptions()` function that converts all option formats to a consistent structure:
```typescript
interface Option {
  id: string;
  text: string;
  index?: number;
}
```

This ensures all options are stored with both `id` and `text`, making comparison reliable.

### 2. **Correct Answer Normalization** (`getNormalizedCorrectAnswer` & `getNormalizedSingleAnswer`)

**Problem**: `correctAnswer` could be:
- An index number: `"2"` (should map to option at index 2)
- Option text: `"Glacier"`
- Pipe-separated for multi-select: `"Option A|Option B"`

**Solution**: Created functions to normalize correct answers to option text values:
- `getNormalizedSingleAnswer()` - Converts index-based or text answers to the actual option text
- `getNormalizedCorrectAnswer()` - Handles arrays and single values

### 3. **Answer Submission Normalization** (`prepareAnswersForSubmit`)

**Updated to**:
- Parse answers from JSON array or pipe-separated format
- Normalize each answer value using `getNormalizedSingleAnswer()`
- Maintain proper format for backend:
  - Single/True-False: option text
  - Multi-select: pipe-separated option text (e.g., `"A|B"`)
  - Fill-in-blank: trimmed text

### 4. **Answer Comparison Logic** (`isAnswerCorrect`)

**Now properly**:
1. Normalizes both correct answer and user answer using the same normalization functions
2. For multi-select: converts both to sorted arrays and compares
3. For fill-in-blank: case-insensitive comparison
4. For single-choice/true-false: normalized text comparison

## How This Fixes Your Issues

### ✅ Correct Option Selection
- Options are now consistently formatted regardless of API format
- User selections are stored against normalized option text
- UI correctly shows which options are selected

### ✅ Correct Answer Display
- When user clicks "Check Answer", the correct answer is properly identified
- The correct option highlights in green
- Wrong options highlight in red

### ✅ Accurate Scoring
- Server receives answers in the correct format
- Scoring compares answers using consistent logic
- Multi-select answers work even with different option formats
- Score calculation is accurate

### ✅ Instant Check Feature
- `handleCheckAnswer()` now uses the updated `isAnswerCorrect()` function
- Haptic feedback trigger correctly on correct/incorrect answers
- Questions lock properly when checked

## Testing Recommendations

1. **Test different option formats**:
   - Quiz with string options
   - Quiz with numbered indices
   - Quiz with object-based options

2. **Test all question types**:
   - MULTIPLE_CHOICE
   - MULTI_SELECT (test with multiple selections)
   - TRUE_FALSE
   - FILL_IN_BLANK

3. **Test the check answer feature**:
   - Verify correct answers highlight
   - Verify explanations show
   - Verify questions lock

4. **Test submission**:
   - Submit with all question types
   - Verify score calculation is correct
   - Check that the result page shows accurate scores

## Code Location

Main changes in: `app/quiz/[id].tsx`

New helper functions (module level):
- `normalizeOptions()` - lines ~68-105
- `getNormalizedCorrectAnswer()` - lines ~107-118
- `getNormalizedSingleAnswer()` - lines ~120-143
- `prepareAnswersForSubmit()` - lines ~145-177

Updated functions:
- `QuestionView()` - Now uses normalized options
- `isAnswerCorrect()` - Now uses normalization in main component - lines ~544-579
