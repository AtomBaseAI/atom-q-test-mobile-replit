import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { Audio } from "expo-av";
import { useTheme } from "@/lib/theme-context";
import { useToast } from "@/lib/toast-context";
import { api} from "@/lib/api";
// Your code uses QuizData interface (not QuizListItem)
import Colors from "@/constants/colors";
import HexagonLoader from "@/components/HexagonLoader";

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  title?: string;
  content: string;
  type: "MULTIPLE_CHOICE" | "MULTI_SELECT" | "TRUE_FALSE" | "FILL_IN_BLANK";
  options: any[];
  explanation?: string;
  difficulty: string;
  order: number;
  points: number;
  correctAnswer?: string | string[];
}

interface QuizData {
  attemptId: string;
  quiz: {
    id: string;
    title: string;
    description: string;
    timeLimit: number | null;
    showAnswers: boolean;
    checkAnswerEnabled: boolean;
    negativeMarking: boolean;
    negativePoints: number | null;
    questions: Question[];
  };
  timeRemaining: number;
  startedAt: string;
  answers: Record<string, string>;
}

// Sound cache
let successSound: Audio.Sound | null = null;
let errorSound: Audio.Sound | null = null;

async function loadSounds() {
  if (Platform.OS === "web") return;
  try {
    if (!successSound) {
      const { sound } = await Audio.Sound.createAsync(
        require("@/assets/sounds/success.mp3"),
        { shouldPlay: false, volume: 1.0 }
      );
      successSound = sound;
    }
    if (!errorSound) {
      const { sound } = await Audio.Sound.createAsync(
        require("@/assets/sounds/error.mp3"),
        { shouldPlay: false, volume: 0.7 }
      );
      errorSound = sound;
    }
  } catch (error) {
    console.warn("Failed to load sounds:", error);
  }
}

async function playSuccessSound() {
  if (Platform.OS === "web") return;
  try {
    if (successSound) {
      await successSound.setPositionAsync(0);
      await successSound.playAsync();
    }
  } catch (error) {
    console.warn("Failed to play success sound:", error);
  }
}

async function playErrorSound() {
  if (Platform.OS === "web") return;
  try {
    if (errorSound) {
      await errorSound.setPositionAsync(0);
      await errorSound.playAsync();
    }
  } catch (error) {
    console.warn("Failed to play error sound:", error);
  }
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function getQuestionId(q: Question): string {
  return q.id;
}

/**
 * Normalize options from API to a consistent format
 * Options can be:
 * - Array of strings: ["Option A", "Option B", ...]
 * - Array of objects: [{id: "A", text: "Option A"}, ...]
 * - JSON string
 */
function normalizeOptions(options: any[]): Option[] {
  if (!options || !Array.isArray(options)) return [];

  return options.map((opt: any, index: number) => {
    let id: string;
    let text: string;

    if (typeof opt === "string") {
      // Option is just a string, use it as both id and text
      id = opt;
      text = opt;
    } else if (typeof opt === "number") {
      // Option is a number (e.g., for numeric choices)
      id = String.fromCharCode(65 + index); // A, B, C, ...
      text = String(opt);
    } else if (typeof opt === "object" && opt !== null) {
      // Option is an object, try to extract id and text
      id = opt.id || opt.optionId || opt.option_id || String.fromCharCode(65 + index);
      text =
        opt.text ||
        opt.optionText ||
        opt.option_text ||
        opt.label ||
        opt.content ||
        opt.value ||
        String.fromCharCode(65 + index);
    } else {
      // Fallback
      id = String.fromCharCode(65 + index);
      text = String(opt || "");
    }

    return { id, text: String(text).trim() };
  }).filter((opt) => opt.text && opt.text.length > 0);
}

/**
 * Parse correct answer from API format
 * Correct answer can be:
 * - JSON string: '["A", "B"]' for multi-select
 * - Plain string: 'A' for single choice
 * - Plain string: 'true' or 'false' for true/false
 */
function parseCorrectAnswer(correctAnswer: any): string | string[] | null {
  if (correctAnswer == null) return null;

  if (typeof correctAnswer === "string") {
    try {
      // Try to parse as JSON (for multi-select arrays)
      const parsed = JSON.parse(correctAnswer);
      if (Array.isArray(parsed)) {
        return parsed;
      }
      return correctAnswer;
    } catch {
      // Not JSON, return as is
      return correctAnswer;
    }
  } else if (Array.isArray(correctAnswer)) {
    return correctAnswer;
  }

  return String(correctAnswer);
}

/**
 * Get the text(s) of the correct answer(s) from options
 */
function getCorrectAnswerTexts(correctAnswer: any, options: Option[]): string[] {
  const parsed = parseCorrectAnswer(correctAnswer);
  if (!parsed) return [];

  if (Array.isArray(parsed)) {
    return parsed
      .map((ans) => getSingleCorrectAnswerText(ans, options))
      .filter(Boolean);
  }

  const single = getSingleCorrectAnswerText(parsed, options);
  return single ? [single] : [];
}

/**
 * Get the text of a single correct answer
 * The answer can be:
 * - Option ID: "A"
 * - Option index: "0" or "1"
 * - Option text: "Option A"
 * - True/False: "true" or "false"
 */
function getSingleCorrectAnswerText(answer: any, options: Option[]): string {
  if (answer == null) return "";

  const answerStr = String(answer).trim().toLowerCase();

  // Handle true/false answers
  if (answerStr === "true" || answerStr === "false") {
    return answerStr === "true" ? "True" : "False";
  }

  // If answer is a number, try to use it as an index (0-based or 1-based)
  const numAnswer = Number(answerStr);
  if (!isNaN(numAnswer) && options.length > 0) {
    if (numAnswer > 0 && numAnswer <= options.length) {
      // 1-based index
      return options[numAnswer - 1].text;
    }
    if (numAnswer >= 0 && numAnswer < options.length) {
      // 0-based index
      return options[numAnswer].text;
    }
  }

  // Try to find by ID (case-insensitive)
  const optionById = options.find((opt) => opt.id.toLowerCase() === answerStr);
  if (optionById) {
    return optionById.text;
  }

  // Try to find by text (case-insensitive)
  const optionByText = options.find(
    (opt) => opt.text.toLowerCase() === answerStr
  );
  if (optionByText) {
    return optionByText.text;
  }

  // For multi-select, the answer might be an option ID like "A", "B", etc.
  // Try to find option by first letter of ID
  if (answerStr.length === 1) {
    const optionByFirstLetter = options.find(
      (opt) => opt.id.toLowerCase().startsWith(answerStr)
    );
    if (optionByFirstLetter) {
      return optionByFirstLetter.text;
    }
  }

  // Return the answer as is if no match found
  return answer;
}

/**
 * Check if the user's answer is correct
 */
function isAnswerCorrect(
  question: Question,
  userAnswer: string
): boolean {
  if (!userAnswer) return false;

  const correctAnswer = question.correctAnswer;
  if (correctAnswer == null) return false;

  const options = normalizeOptions(question.options);
  const parsedCorrectAnswer = parseCorrectAnswer(correctAnswer);

  if (!parsedCorrectAnswer) return false;

  // Handle MULTI_SELECT questions
  if (question.type === "MULTI_SELECT") {
    let userSelected: string[] = [];
    try {
      userSelected = JSON.parse(userAnswer);
    } catch {
      userSelected = userAnswer.split("|").map((s) => s.trim()).filter(Boolean);
    }

    const correctArray = Array.isArray(parsedCorrectAnswer)
      ? parsedCorrectAnswer.map(String)
      : [String(parsedCorrectAnswer)];

    // Convert user selection to option texts
    const userTexts = userSelected
      .map((sel) => {
        const opt = options.find((o) => o.id === sel || o.text === sel);
        return opt?.text || sel;
      })
      .filter(Boolean)
      .sort();

    // Convert correct answers to option texts
    const correctTexts = correctArray
      .map((corr) => {
        const opt = options.find((o) => o.id === corr || o.text === corr);
        return opt?.text || corr;
      })
      .filter(Boolean)
      .sort();

    // Compare arrays as JSON strings for deep equality
    return JSON.stringify(userTexts) === JSON.stringify(correctTexts);
  }

  // Handle FILL_IN_BLANK questions
  if (question.type === "FILL_IN_BLANK") {
    const correct = Array.isArray(parsedCorrectAnswer)
      ? parsedCorrectAnswer[0]
      : parsedCorrectAnswer;
    const correctStr = String(correct || "").trim().toLowerCase();
    const userStr = userAnswer.trim().toLowerCase();
    return userStr === correctStr;
  }

  // Handle TRUE_FALSE questions
  if (question.type === "TRUE_FALSE") {
    const correctStr = String(parsedCorrectAnswer).toLowerCase();
    const userStr = userAnswer.trim().toLowerCase();

    // Normalize to "true" or "false"
    const normalizedCorrect = correctStr === "true" ? "true" : "false";
    const normalizedUser = userStr === "true" ? "true" : "false";

    return normalizedUser === normalizedCorrect;
  }

  // Handle MULTIPLE_CHOICE questions
  const correctText = getSingleCorrectAnswerText(parsedCorrectAnswer, options);
  const userOption = options.find(
    (opt) => opt.id === userAnswer || opt.text === userAnswer
  );
  const userText = userOption?.text || userAnswer;

  return userText.toLowerCase() === correctText.toLowerCase();
}

/**
 * Prepare answers for submission to the API
 * Converts user answers to the format expected by the backend
 */
function prepareAnswersForSubmit(
  questions: Question[],
  answers: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};

  for (const q of questions) {
    const qId = q.id;
    const answer = answers[qId] || "";

    if (!answer) continue;

    const options = normalizeOptions(q.options);

    if (q.type === "FILL_IN_BLANK") {
      // For fill-in-blank, submit as plain text
      result[qId] = answer.trim();
    } else if (q.type === "MULTI_SELECT") {
      // For multi-select, parse and format as JSON array of option IDs
      let selected: string[] = [];
      try {
        selected = JSON.parse(answer);
      } catch {
        selected = answer.split("|").map((s) => s.trim()).filter(Boolean);
      }

      // Convert option texts to IDs for submission
      const selectedIds = selected
        .map((sel) => {
          const opt = options.find((o) => o.text === sel || o.id === sel);
          return opt?.id || sel;
        })
        .filter(Boolean);

      result[qId] = JSON.stringify(selectedIds);
    } else if (q.type === "TRUE_FALSE") {
      // For true/false, normalize to "true" or "false"
      const normalized = answer.trim().toLowerCase();
      result[qId] = normalized === "true" ? "true" : "false";
    } else {
      // For multiple choice, submit the option ID
      const opt = options.find((o) => o.text === answer || o.id === answer);
      result[qId] = opt?.id || answer;
    }
  }

  return result;
}

function OptionButton({
  option,
  selected,
  onPress,
  theme,
  wrong,
  correct,
  disabled = false,
}: {
  option: Option;
  selected: boolean;
  onPress: () => void;
  theme: any;
  wrong?: boolean;
  correct?: boolean;
  disabled?: boolean;
}) {
  const bgColor = correct
    ? theme.success + "20"
    : wrong
    ? theme.error + "20"
    : selected
    ? Colors.primary + "15"
    : theme.inputBg;

  const borderColor = correct
    ? theme.success
    : wrong
    ? theme.error
    : selected
    ? Colors.primary
    : theme.inputBorder;

  const textColor = correct
    ? theme.success
    : wrong
    ? theme.error
    : selected
    ? Colors.primary
    : theme.text;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.optionBtn,
        {
          backgroundColor: bgColor,
          borderColor,
          opacity: disabled ? 0.6 : pressed ? 0.9 : 1,
        },
      ]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
    >
      <View
        style={[
          styles.optionIndicator,
          {
            borderColor:
              correct || wrong
                ? borderColor
                : selected
                ? Colors.primary
                : theme.textTertiary,
            backgroundColor:
              correct || wrong
                ? borderColor
                : selected
                ? Colors.primary
                : "transparent",
          },
        ]}
      >
        {(selected || correct) && (
          <Ionicons
            name={correct ? "checkmark-circle" : "checkmark"}
            size={correct ? 14 : 12}
            color="#fff"
          />
        )}
        {wrong && selected && <Ionicons name="close" size={12} color="#fff" />}
      </View>
      <Text style={[styles.optionText, { color: textColor }]}>{option.text}</Text>
    </Pressable>
  );
}

function QuestionView({
  question,
  answer,
  onAnswer,
  questionNum,
  total,
  theme,
  checkAnswerEnabled,
  isChecked,
}: {
  question: Question;
  answer: string;
  onAnswer: (val: string) => void;
  questionNum: number;
  total: number;
  theme: any;
  checkAnswerEnabled?: boolean;
  isChecked?: boolean;
}) {
  const showAnswerBlock = !!(checkAnswerEnabled && isChecked);
  const options = normalizeOptions(question.options);
  const isCorrect = isChecked ? isAnswerCorrect(question, answer) : false;

  // Parse multi-select answers
  const selectedMulti: string[] = React.useMemo(() => {
    if (!answer) return [];
    try {
      return JSON.parse(answer);
    } catch {
      return answer.split("|").map((s) => s.trim()).filter(Boolean);
    }
  }, [answer]);

  function toggleMultiSelect(optText: string) {
    const current = [...selectedMulti];
    const index = current.indexOf(optText);
    if (index >= 0) {
      current.splice(index, 1);
    } else {
      current.push(optText);
    }
    onAnswer(JSON.stringify(current));
    if (Platform.OS !== "web") Haptics.selectionAsync();
  }

  function selectSingle(optText: string) {
    onAnswer(optText);
    if (Platform.OS !== "web") Haptics.selectionAsync();
  }

  // Get correct answer texts
  const correctAnswerTexts = React.useMemo(() => {
    return getCorrectAnswerTexts(question.correctAnswer, options);
  }, [question.correctAnswer, options]);

  const diffColor =
    question.difficulty?.toUpperCase() === "EASY"
      ? theme.success
      : question.difficulty?.toUpperCase() === "MEDIUM"
      ? Colors.primary
      : theme.error;

  const questionTypeLabel = {
    MULTIPLE_CHOICE: "Multiple Choice",
    MULTI_SELECT: "Multi Select",
    TRUE_FALSE: "True / False",
    FILL_IN_BLANK: "Fill in the Blank",
  }[question.type] || question.type;

  return (
    <View style={styles.questionContainer}>
      <View style={styles.questionHeader}>
        <Text style={[styles.questionNum, { color: theme.textTertiary }]}>
          Question {questionNum} of {total}
        </Text>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <View
            style={[styles.pointsBadge, { backgroundColor: Colors.primary + "15" }]}
          >
            <Text style={[styles.pointsText, { color: Colors.primary }]}>
              {question.points || 1} pt{question.points !== 1 ? "s" : ""}
            </Text>
          </View>
          <View
            style={[styles.pointsBadge, { backgroundColor: diffColor + "15" }]}
          >
            <Text style={[styles.pointsText, { color: diffColor }]}>
              {question.difficulty || "MEDIUM"}
            </Text>
          </View>
        </View>
      </View>

      <Text style={[styles.questionTypeLabel, { color: theme.textTertiary }]}>
        {questionTypeLabel}
      </Text>

      <Text style={[styles.questionContent, { color: theme.text }]}>
        {question.content}
      </Text>

      {question.type === "FILL_IN_BLANK" ? (
        <View
          style={[
            styles.fillInput,
            {
              backgroundColor: theme.inputBg,
              borderColor:
                showAnswerBlock && isCorrect
                  ? theme.success
                  : showAnswerBlock && !isCorrect && answer
                  ? theme.error
                  : theme.inputBorder,
            },
          ]}
        >
          <TextInput
            editable={!showAnswerBlock}
            style={[styles.fillTextInput, { color: theme.text }]}
            placeholder="Type your answer..."
            placeholderTextColor={theme.textTertiary}
            value={answer || ""}
            onChangeText={onAnswer}
            autoCapitalize="none"
            autoCorrect={false}
          />
        </View>
      ) : (
        <View style={styles.optionsList}>
          {options.map((opt, idx) => {
            const isSelected =
              question.type === "MULTI_SELECT"
                ? selectedMulti.includes(opt.text)
                : answer === opt.text;

            const isCorrectOption =
              showAnswerBlock && correctAnswerTexts.includes(opt.text);
            const isWrongOption =
              showAnswerBlock &&
              !isCorrect &&
              isSelected &&
              !correctAnswerTexts.includes(opt.text);

            return (
              <OptionButton
                key={opt.id || idx}
                option={opt}
                selected={isSelected}
                onPress={() =>
                  question.type === "MULTI_SELECT"
                    ? toggleMultiSelect(opt.text)
                    : selectSingle(opt.text)
                }
                theme={theme}
                correct={isCorrectOption}
                wrong={isWrongOption}
                disabled={showAnswerBlock}
              />
            );
          })}
        </View>
      )}

      {showAnswerBlock && (
        <View style={styles.feedbackSection}>
          {/* Correct/Wrong Header */}
          <View
            style={[
              styles.resultHeader,
              {
                backgroundColor: isCorrect
                  ? theme.success + "15"
                  : theme.error + "15",
                borderColor: isCorrect ? theme.success : theme.error,
              },
            ]}
          >
            <Ionicons
              name={isCorrect ? "checkmark-circle" : "close-circle"}
              size={24}
              color={isCorrect ? theme.success : theme.error}
            />
            <Text
              style={[
                styles.resultTitle,
                { color: isCorrect ? theme.success : theme.error },
              ]}
            >
              {isCorrect ? "Correct!" : "Incorrect"}
            </Text>
          </View>

          {/* Correct Answer Display */}
          {correctAnswerTexts.length > 0 && (
            <View
              style={[
                styles.correctAnswerBlock,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                },
              ]}
            >
              <Text
                style={[styles.correctAnswerLabel, { color: theme.textSecondary }]}
              >
                {question.type === "MULTI_SELECT"
                  ? "Correct options:"
                  : "Correct answer:"}
              </Text>
              <Text style={[styles.correctAnswerText, { color: theme.success }]}>
                {correctAnswerTexts.join(", ")}
              </Text>
            </View>
          )}

          {/* User Answer Display for Fill in Blank */}
          {question.type === "FILL_IN_BLANK" && !isCorrect && answer && (
            <View
              style={[
                styles.userAnswerBlock,
                {
                  backgroundColor: theme.error + "08",
                  borderColor: theme.error + "30",
                },
              ]}
            >
              <Text style={[styles.userAnswerLabel, { color: theme.error }]}>
                Your answer: {answer}
              </Text>
            </View>
          )}

          {/* Explanation */}
          {question.explanation && (
            <View
              style={[
                styles.explanationBlock,
                {
                  backgroundColor: theme.info + "08",
                  borderColor: theme.info + "30",
                },
              ]}
            >
              <View style={styles.explanationHeader}>
                <Ionicons name="information-circle" size={18} color={theme.info} />
                <Text
                  style={[styles.explanationLabel, { color: theme.textSecondary }]}
                >
                  Explanation
                </Text>
              </View>
              <Text style={[styles.explanationText, { color: theme.text }]}>
                {question.explanation}
              </Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const [quizData, setQuizData] = useState<QuizData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [checkedQuestions, setCheckedQuestions] = useState<Set<string>>(new Set());
  const [timeLeft, setTimeLeft] = useState(0);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<ScrollView>(null);
  const answersRef = useRef<Record<string, string>>({});
  const quizDataRef = useRef<QuizData | null>(null);
  const soundsLoadedRef = useRef(false);

  // Load sounds
  useEffect(() => {
    if (Platform.OS !== "web" && !soundsLoadedRef.current) {
      loadSounds();
      soundsLoadedRef.current = true;
    }
    return () => {
      if (successSound) {
        successSound.unloadAsync();
        successSound = null;
      }
      if (errorSound) {
        errorSound.unloadAsync();
        errorSound = null;
      }
    };
  }, []);

  // Update refs when state changes
  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    quizDataRef.current = quizData;
  }, [quizData]);

  // Load quiz data
  useEffect(() => {
    loadQuiz();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);
    };
  }, [id]);

  // Auto-save answers
  // useEffect(() => {
  //   if (quizData && !submitting) {
  //     if (autoSaveTimerRef.current) {
  //       clearInterval(autoSaveTimerRef.current);
  //     }
  //     autoSaveTimerRef.current = setInterval(autoSaveAnswers, 30000);
  //   }
  //   return () => {
  //     if (autoSaveTimerRef.current) {
  //       clearInterval(autoSaveTimerRef.current);
  //     }
  //   };
  // }, [quizData, submitting]);

  async function loadQuiz() {
    try {
      const res = await api.getQuiz(id);
      if (res.success && res.data) {
        setQuizData(res.data);
        setAnswers(res.data.answers || {});

        // Setup timer
        if (res.data.quiz.timeLimit) {
          let remaining = res.data.timeRemaining;
          if (!remaining && res.data.startedAt) {
            const timeLimitSec = res.data.quiz.timeLimit * 60;
            const elapsed = Math.floor(
              (Date.now() - new Date(res.data.startedAt).getTime()) / 1000
            );
            remaining = Math.max(0, timeLimitSec - elapsed);
          }

          if (remaining > 0) {
            setTimeLeft(remaining);
            startTimer(remaining);
          }
        }
      } else {
        showToast(res.message || "Failed to load quiz", "error");
        router.back();
      }
    } catch (error: any) {
      showToast(error.message || "Failed to load quiz", "error");
      router.back();
    } finally {
      setLoading(false);
    }
  }

  function startTimer(initialSeconds: number) {
    if (timerRef.current) clearInterval(timerRef.current);

    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      const elapsed = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, initialSeconds - elapsed);
      setTimeLeft(remaining);

      if (remaining <= 0) {
        clearInterval(timerRef.current!);
        timerRef.current = null;
        handleTimeUp();
      }
    }, 1000);
  }

  async function autoSaveAnswers() {
    if (!quizDataRef.current || submitting) return;

    try {
      const prepared = prepareAnswersForSubmit(
        quizDataRef.current.quiz.questions,
        answersRef.current
      );

      if (Object.keys(prepared).length > 0) {
        await api.saveQuizAnswers(
          quizDataRef.current.quiz.id,
          quizDataRef.current.attemptId,
          prepared
        );
      }
    } catch (error) {
      console.error("Auto-save failed:", error);
    }
  }

  async function handleTimeUp() {
    if (!quizDataRef.current || submitting) return;

    showToast("Time's up! Submitting quiz...", "info");
    await handleSubmit(true);
  }

  async function handleCheckAnswer() {
    if (!quizData) return;

    const question = quizData.quiz.questions[currentIndex];
    const qId = question.id;
    const answer = answers[qId] || "";
    const correct = isAnswerCorrect(question, answer);

    // Haptic feedback
    if (Platform.OS !== "web") {
      if (correct) {
        await playSuccessSound();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await playErrorSound();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }

    // Mark as checked
    setCheckedQuestions((prev) => new Set(prev).add(qId));

    // Show toast
    showToast(
      correct ? "Correct answer! ✓" : "Incorrect answer ✗",
      correct ? "success" : "error"
    );
  }

  async function handleSubmit(auto = false) {
    if (!quizData || submitting) return;

    if (!auto) {
      const unanswered = quizData.quiz.questions.filter((q) => {
        const ans = answers[q.id];
        return !ans || ans.length === 0;
      }).length;

      if (unanswered > 0) {
        Alert.alert(
          "Submit Quiz?",
          `You have ${unanswered} unanswered question${
            unanswered > 1 ? "s" : ""
          }. Are you sure?`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Submit", style: "destructive", onPress: () => doSubmit() },
          ]
        );
        return;
      }

      Alert.alert(
        "Submit Quiz?",
        "Are you sure you want to submit your answers?",
        [
          { text: "Cancel", style: "cancel" },
          { text: "Submit", onPress: () => doSubmit() },
        ]
      );
      return;
    }

    doSubmit();
  }

  async function doSubmit() {
    if (!quizData) return;

    setSubmitting(true);

    // Clear timers
    if (timerRef.current) clearInterval(timerRef.current);
    if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current);

    try {
      const prepared = prepareAnswersForSubmit(quizData.quiz.questions, answers);

      const res = await api.submitQuiz(
        quizData.quiz.id,
        quizData.attemptId,
        prepared
      );

      if (res.success && res.data) {
        const totalPoints = quizData.quiz.questions.reduce(
          (sum, q) => sum + (q.points || 1),
          0
        );
        const finalScore =
          res.data.totalPoints > 0
            ? (res.data.score / res.data.totalPoints) * totalPoints
            : 0;

        if (Platform.OS !== "web") {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        }

        showToast("Quiz submitted successfully!", "success");

        router.replace({
          pathname: "/result",
          params: {
            attemptId: quizData.attemptId,
            score: finalScore.toFixed(2),
            totalPoints: totalPoints.toString(),
            timeTaken: res.data.timeTaken?.toString() || "0",
            quizTitle: quizData.quiz.title,
            showAnswers: quizData.quiz.showAnswers ? "1" : "0",
          },
        });
      } else {
        throw new Error(res.message || "Failed to submit quiz");
      }
    } catch (error: any) {
      showToast(error.message || "Failed to submit quiz", "error");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View
        style={[styles.container, styles.centered, { backgroundColor: theme.background }]}
      >
        <HexagonLoader />
      </View>
    );
  }

  if (!quizData) return null;

  const questions = quizData.quiz.questions;
  const currentQuestion = questions[currentIndex];
  const currentAnswer = answers[currentQuestion.id] || "";
  const hasAnswered =
    currentQuestion.type === "MULTI_SELECT"
      ? (() => {
          try {
            const parsed = JSON.parse(currentAnswer);
            return Array.isArray(parsed) && parsed.length > 0;
          } catch {
            return false;
          }
        })()
      : currentAnswer.length > 0;

  const answeredCount = Object.values(answers).filter(
    (a) => a && a.length > 0
  ).length;
  const isTimeLow = timeLeft > 0 && timeLeft <= 60;
  const isCheckEnabled = quizData.quiz.checkAnswerEnabled;
  const isQuestionChecked = checkedQuestions.has(currentQuestion.id);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Top Bar */}
      <View
        style={[
          styles.topBar,
          {
            paddingTop: Platform.OS === "web" ? 16 : insets.top + 8,
            backgroundColor: theme.surface,
            borderBottomColor: theme.cardBorder,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.topBarCenter}>
          <Text
            style={[styles.topBarTitle, { color: theme.text }]}
            numberOfLines={1}
          >
            {quizData.quiz.title}
          </Text>
        </View>
        {quizData.quiz.timeLimit && timeLeft > 0 && (
          <View
            style={[
              styles.timerBadge,
              {
                backgroundColor: isTimeLow
                  ? theme.error + "15"
                  : Colors.primary + "15",
              },
            ]}
          >
            <Ionicons
              name="time-outline"
              size={14}
              color={isTimeLow ? theme.error : Colors.primary}
            />
            <Text
              style={[
                styles.timerText,
                { color: isTimeLow ? theme.error : Colors.primary },
              ]}
            >
              {formatTime(timeLeft)}
            </Text>
          </View>
        )}
      </View>

      {/* Progress Bar */}
      <View style={[styles.progressBar, { backgroundColor: theme.inputBg }]}>
        <View
          style={[
            styles.progressFill,
            {
              backgroundColor: Colors.primary,
              width: `${((currentIndex + 1) / questions.length) * 100}%`,
            },
          ]}
        />
      </View>

      {/* Question */}
      <ScrollView
        ref={scrollRef}
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <QuestionView
          question={currentQuestion}
          answer={currentAnswer}
          onAnswer={(val) =>
            setAnswers((prev) => ({ ...prev, [currentQuestion.id]: val }))
          }
          questionNum={currentIndex + 1}
          total={questions.length}
          theme={theme}
          checkAnswerEnabled={isCheckEnabled}
          isChecked={isQuestionChecked}
        />
      </ScrollView>

      {/* Bottom Bar */}
      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.surface,
            borderTopColor: theme.cardBorder,
            paddingBottom: Platform.OS === "web" ? 16 : insets.bottom + 12,
          },
        ]}
      >
        <View style={styles.navRow}>
          <Pressable
            style={({ pressed }) => [
              styles.navBtn,
              {
                backgroundColor: theme.inputBg,
                borderColor: theme.inputBorder,
                opacity: currentIndex === 0 ? 0.5 : pressed ? 0.8 : 1,
              },
            ]}
            onPress={() => setCurrentIndex((prev) => prev - 1)}
            disabled={currentIndex === 0}
          >
            <Ionicons name="chevron-back" size={18} color={theme.text} />
            <Text style={[styles.navBtnText, { color: theme.text }]}>Prev</Text>
          </Pressable>

          <Text style={[styles.counterText, { color: theme.textSecondary }]}>
            {answeredCount}/{questions.length} answered
          </Text>

          {isCheckEnabled && !isQuestionChecked ? (
            <Pressable
              style={({ pressed }) => [
                styles.navBtn,
                styles.checkBtn,
                {
                  backgroundColor: Colors.primary,
                  opacity: hasAnswered ? (pressed ? 0.9 : 1) : 0.5,
                },
              ]}
              onPress={handleCheckAnswer}
              disabled={!hasAnswered || submitting}
            >
              <Ionicons name="checkmark-circle" size={18} color="#fff" />
              <Text style={styles.checkBtnText}>Check</Text>
            </Pressable>
          ) : currentIndex === questions.length - 1 ? (
            <Pressable
              style={({ pressed }) => [
                styles.navBtn,
                styles.submitBtn,
                {
                  backgroundColor: Colors.primary,
                  opacity: submitting ? 0.6 : pressed ? 0.9 : 1,
                },
              ]}
              onPress={() => handleSubmit(false)}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text style={styles.submitBtnText}>Submit</Text>
                  <Ionicons name="checkmark" size={18} color="#fff" />
                </>
              )}
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.navBtn,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: theme.inputBorder,
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
              onPress={() => setCurrentIndex((prev) => prev + 1)}
            >
              <Text style={[styles.navBtnText, { color: theme.text }]}>Next</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.text} />
            </Pressable>
          )}
        </View>

        {/* Question Dots */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dotsRow}
        >
          {questions.map((q, i) => {
            const isAnswered = !!(answers[q.id] && answers[q.id].length > 0);
            const isCurrent = i === currentIndex;
            const isChecked = checkedQuestions.has(q.id);
            const isCorrect = isChecked && isAnswerCorrect(q, answers[q.id] || "");

            let bgColor = theme.inputBg;
            if (isCurrent) bgColor = Colors.primary;
            else if (isChecked)
              bgColor = isCorrect ? theme.success + "40" : theme.error + "40";
            else if (isAnswered) bgColor = Colors.primary + "30";

            let textColor = theme.textTertiary;
            if (isCurrent) textColor = "#fff";
            else if (isChecked) textColor = isCorrect ? theme.success : theme.error;
            else if (isAnswered) textColor = Colors.primary;

            return (
              <Pressable
                key={q.id}
                style={[
                  styles.dot,
                  {
                    backgroundColor: bgColor,
                    borderColor: isCurrent ? Colors.primary : theme.inputBorder,
                  },
                ]}
                onPress={() => setCurrentIndex(i)}
              >
                <Text style={[styles.dotText, { color: textColor }]}>
                  {i + 1}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { justifyContent: "center", alignItems: "center" },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  topBarCenter: { flex: 1 },
  topBarTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 2,
  },
  timerText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
    fontVariant: ["tabular-nums"],
  },
  progressBar: {
    height: 3,
  },
  progressFill: {
    height: 3,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  questionContainer: {
    gap: 20,
  },
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  questionNum: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  pointsBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
  },
  pointsText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
  },
  questionTypeLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 4,
  },
  questionContent: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    lineHeight: 24,
  },
  optionsList: { gap: 10 },
  multiHint: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    marginBottom: 2,
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderRadius: 4,
    gap: 12,
  },
  optionIndicator: {
    width: 22,
    height: 22,
    borderRadius: 2,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
  },
  optionText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  fillInput: {
    borderWidth: 1,
    borderRadius: 4,
    overflow: "hidden",
  },
  fillTextInput: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  feedbackSection: {
    marginTop: 20,
    gap: 12,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    borderWidth: 1,
    borderRadius: 4,
    gap: 12,
  },
  resultTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  correctAnswerBlock: {
    padding: 16,
    borderRadius: 4,
    borderWidth: 1,
    gap: 8,
  },
  correctAnswerLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  correctAnswerText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  userAnswerBlock: {
    padding: 16,
    borderRadius: 4,
    borderWidth: 1,
  },
  userAnswerLabel: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  explanationBlock: {
    padding: 16,
    borderRadius: 4,
    borderWidth: 1,
    gap: 8,
  },
  explanationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  explanationLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  explanationText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  bottomBar: {
    borderTopWidth: 1,
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 4,
    borderWidth: 1,
    gap: 4,
  },
  navBtnText: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
  submitBtn: {
    borderWidth: 0,
  },
  checkBtn: {
    borderWidth: 0,
  },
  checkBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  submitBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
  counterText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  dotsRow: {
    gap: 6,
    paddingVertical: 4,
  },
  dot: {
    width: 30,
    height: 30,
    borderRadius: 2,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dotText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
});
