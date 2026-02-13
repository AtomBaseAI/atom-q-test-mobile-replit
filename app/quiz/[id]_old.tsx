import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
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
import { api } from "@/lib/api";
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
  correctAnswer: string | string[]; // Always included now
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

interface QuestionResult {
  questionId: string;
  questionContent: string;
  userAnswer: string;
  correctAnswer: string | string[];
  isCorrect: boolean;
  pointsEarned: number;
  pointsPossible: number;
  explanation?: string;
  questionType: string;
}

interface QuizResultData {
  score: number;
  totalPoints: number;
  timeTaken: number;
  correctCount: number;
  incorrectCount: number;
  questionResults: QuestionResult[];
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

/**
 * Normalize options from API to a consistent format
 */
function normalizeOptions(options: any[]): Option[] {
  if (!options || !Array.isArray(options)) return [];

  return options.map((opt: any, index: number) => {
    let id: string;
    let text: string;

    if (typeof opt === "string") {
      id = opt;
      text = opt;
    } else if (typeof opt === "number") {
      id = String.fromCharCode(65 + index);
      text = String(opt);
    } else if (typeof opt === "object" && opt !== null) {
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
      id = String.fromCharCode(65 + index);
      text = String(opt || "");
    }

    return { id, text: String(text).trim() };
  }).filter((opt) => opt.text && opt.text.length > 0);
}

/**
 * Get the text(s) of the correct answer(s) from options
 */
function getCorrectAnswerTexts(correctAnswer: any, options: Option[]): string[] {
  if (correctAnswer == null) return [];

  if (Array.isArray(correctAnswer)) {
    return correctAnswer
      .map((ans) => getSingleCorrectAnswerText(ans, options))
      .filter(Boolean);
  }

  const single = getSingleCorrectAnswerText(correctAnswer, options);
  return single ? [single] : [];
}

/**
 * Get the text of a single correct answer
 */
function getSingleCorrectAnswerText(answer: any, options: Option[]): string {
  if (answer == null) return "";

  const answerStr = String(answer).trim().toLowerCase();

  // Handle true/false answers
  if (answerStr === "true" || answerStr === "false") {
    return answerStr === "true" ? "True" : "False";
  }

  // If answer is a number, try to use it as an index
  const numAnswer = Number(answerStr);
  if (!isNaN(numAnswer) && options.length > 0) {
    if (numAnswer > 0 && numAnswer <= options.length) {
      return options[numAnswer - 1].text;
    }
    if (numAnswer >= 0 && numAnswer < options.length) {
      return options[numAnswer].text;
    }
  }

  // Try to find by ID
  const optionById = options.find((opt) => opt.id.toLowerCase() === answerStr);
  if (optionById) {
    return optionById.text;
  }

  // Try to find by text
  const optionByText = options.find(
    (opt) => opt.text.toLowerCase() === answerStr
  );
  if (optionByText) {
    return optionByText.text;
  }

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

  // Handle MULTI_SELECT questions
  if (question.type === "MULTI_SELECT") {
    let userSelected: string[] = [];
    try {
      userSelected = JSON.parse(userAnswer);
    } catch {
      userSelected = userAnswer.split("|").map((s) => s.trim()).filter(Boolean);
    }

    let correctArray: string[] = [];
    if (typeof correctAnswer === "string") {
      try {
        const parsed = JSON.parse(correctAnswer);
        correctArray = Array.isArray(parsed) ? parsed.map(String) : [String(parsed)];
      } catch {
        correctArray = [String(correctAnswer)];
      }
    } else if (Array.isArray(correctAnswer)) {
      correctArray = correctAnswer.map(String);
    } else {
      correctArray = [String(correctAnswer)];
    }

    // Compare by IDs
    const userIds = userSelected
      .map((sel) => {
        const opt = options.find((o) => o.text === sel);
        return opt?.id;
      })
      .filter(Boolean);

    const sortedUserIds = [...userIds].sort();
    const sortedCorrectIds = [...correctArray].sort();

    const idsMatch = JSON.stringify(sortedUserIds) === JSON.stringify(sortedCorrectIds);

    if (idsMatch) return true;

    // Fallback: Compare by texts
    const sortedUserTexts = [...userSelected].sort();
    const sortedCorrectTexts = correctArray
      .map((corr) => {
        const opt = options.find((o) => o.id === corr || o.text === corr);
        return opt?.text || corr;
      })
      .filter(Boolean)
      .sort();

    return JSON.stringify(sortedUserTexts) === JSON.stringify(sortedCorrectTexts);
  }

  // Handle FILL_IN_BLANK questions
  if (question.type === "FILL_IN_BLANK") {
    let correctStr: string;
    if (typeof correctAnswer === "string") {
      try {
        const parsed = JSON.parse(correctAnswer);
        correctStr = Array.isArray(parsed) ? parsed[0] : parsed;
      } catch {
        correctStr = correctAnswer;
      }
    } else if (Array.isArray(correctAnswer)) {
      correctStr = correctAnswer[0];
    } else {
      correctStr = String(correctAnswer);
    }

    const correctLower = correctStr.trim().toLowerCase();
    const userStr = userAnswer.trim().toLowerCase();
    return userStr === correctLower;
  }

  // Handle TRUE_FALSE questions
  if (question.type === "TRUE_FALSE") {
    let correctStr: string;
    if (typeof correctAnswer === "string") {
      try {
        const parsed = JSON.parse(correctAnswer);
        correctStr = String(parsed);
      } catch {
        correctStr = correctAnswer;
      }
    } else if (Array.isArray(correctAnswer)) {
      correctStr = correctAnswer[0];
    } else {
      correctStr = String(correctAnswer);
    }

    const correctLower = correctStr.trim().toLowerCase();
    const userStr = userAnswer.trim().toLowerCase();

    const normalizedCorrect = correctLower === "true" ? "true" : "false";
    const normalizedUser = userStr === "true" ? "true" : "false";

    return normalizedUser === normalizedCorrect;
  }

  // Handle MULTIPLE_CHOICE questions
  let correctIdOrText: string;
  if (typeof correctAnswer === "string") {
    try {
      const parsed = JSON.parse(correctAnswer);
      correctIdOrText = Array.isArray(parsed) ? parsed[0] : parsed;
    } catch {
      correctIdOrText = correctAnswer;
    }
  } else if (Array.isArray(correctAnswer)) {
    correctIdOrText = correctAnswer[0];
  } else {
    correctIdOrText = String(correctAnswer);
  }

  // Try matching by ID
  const userOptionById = options.find((opt) => opt.id === userAnswer);
  if (userOptionById) {
    return userOptionById.id === correctIdOrText;
  }

  // Fallback: Try matching by text
  const userOptionByText = options.find((opt) => opt.text === userAnswer);
  if (userOptionByText) {
    return userOptionByText.text.toLowerCase() === correctIdOrText.toLowerCase();
  }

  return userAnswer.toLowerCase().trim() === correctIdOrText.toLowerCase().trim();
}

/**
 * Calculate quiz results locally
 */
function calculateResults(quizData: QuizData, answers: Record<string, string>): QuizResultData {
  const questions = quizData.quiz.questions;
  const negativeMarking = quizData.quiz.negativeMarking || false;
  const negativePoints = quizData.quiz.negativePoints || 0;

  let totalScore = 0;
  let totalPossiblePoints = 0;
  const questionResults: QuestionResult[] = [];
  let correctCount = 0;
  let incorrectCount = 0;

  for (const question of questions) {
    const userAnswer = answers[question.id] || "";
    const isCorrect = isAnswerCorrect(question, userAnswer);
    const pointsPossible = question.points || 1;

    let pointsEarned = 0;

    if (isCorrect) {
      pointsEarned = pointsPossible;
      correctCount++;
    } else if (negativeMarking && userAnswer) {
      pointsEarned = -negativePoints;
      incorrectCount++;
    } else if (userAnswer) {
      incorrectCount++;
    }

    totalScore += pointsEarned;
    totalPossiblePoints += pointsPossible;

    questionResults.push({
      questionId: question.id,
      questionContent: question.content,
      userAnswer: userAnswer,
      correctAnswer: question.correctAnswer,
      isCorrect,
      pointsEarned,
      pointsPossible,
      explanation: question.explanation,
      questionType: question.type,
    });
  }

  const finalScore = totalPossiblePoints > 0 ? (totalScore / totalPossiblePoints) * 100 : 0;

  return {
    score: Math.max(0, finalScore),
    totalPoints: totalScore,
    timeTaken: Math.floor((Date.now() - new Date(quizData.startedAt).getTime()) / 1000),
    correctCount,
    incorrectCount,
    questionResults,
  };
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
  const scrollRef = useRef<ScrollView>(null);
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

  useEffect(() => {
    quizDataRef.current = quizData;
  }, [quizData]);

  // Load quiz data
  useEffect(() => {
    loadQuiz();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [id]);

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

    if (Platform.OS !== "web") {
      if (correct) {
        await playSuccessSound();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        await playErrorSound();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }

    setCheckedQuestions((prev) => new Set(prev).add(qId));
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

    // Clear timer
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      // Calculate results locally
      const results = calculateResults(quizData, answers);
      
      // Still submit to server to record the attempt
      const preparedAnswers: Record<string, string> = {};
      for (const q of quizData.quiz.questions) {
        const qId = q.id;
        const answer = answers[qId] || "";
        if (!answer) continue;

        const options = normalizeOptions(q.options);
        if (q.type === "FILL_IN_BLANK") {
          preparedAnswers[qId] = answer.trim();
        } else if (q.type === "MULTI_SELECT") {
          let selected: string[] = [];
          try {
            selected = JSON.parse(answer);
          } catch {
            selected = answer.split("|").map((s) => s.trim()).filter(Boolean);
          }
          const selectedIds = selected
            .map((sel) => {
              const opt = options.find((o) => o.text === sel || o.id === sel);
              return opt?.id || sel;
            })
            .filter(Boolean);
          preparedAnswers[qId] = JSON.stringify(selectedIds);
        } else if (q.type === "TRUE_FALSE") {
          const normalized = answer.trim().toLowerCase();
          const trueOption = options.find((o) => o.text.toLowerCase() === "true");
          const falseOption = options.find((o) => o.text.toLowerCase() === "false");

          if (trueOption && falseOption) {
            preparedAnswers[qId] = normalized === "true" ? "true" : "false";
          } else {
            const selectedOpt = options.find((o) => o.text === answer || o.id === answer);
            preparedAnswers[qId] = selectedOpt?.id || answer;
          }
        } else {
          const opt = options.find((o) => o.text === answer || o.id === answer);
          preparedAnswers[qId] = opt?.id || answer;
        }
      }

      // Submit to server (but use our calculated results)
      await api.submitQuiz(
        quizData.quiz.id,
        quizData.attemptId,
        preparedAnswers
      );

      if (Platform.OS !== "web") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }

      showToast("Quiz submitted successfully!", "success");

      // Pass detailed results to result page
      router.replace({
        pathname: "/result",
        params: {
          score: results.score.toFixed(2),
          totalPoints: results.totalPoints.toString(),
          timeTaken: results.timeTaken.toString(),
          quizTitle: quizData.quiz.title,
          showAnswers: quizData.quiz.showAnswers ? "1" : "0",
          correctCount: results.correctCount.toString(),
          incorrectCount: results.incorrectCount.toString(),
          questionResults: JSON.stringify(results.questionResults),
        },
      });
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
            </Pressable>
          ) : currentIndex === questions.length - 1 ? (
            <Pressable
              style={({ pressed }) => [
                styles.navBtn,
                styles.submitBtn,
                {
                  backgroundColor: Colors.primary,
                  opacity: submitting ? 0.6 : pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
              onPress={() => handleSubmit(false)}
              disabled={submitting}
            >
              <Ionicons name="send" size={18} color="#fff" />
            </Pressable>
          ) : (
            <Pressable
              style={({ pressed }) => [
                styles.navBtn,
                {
                  backgroundColor: Colors.primary,
                  opacity: pressed ? 0.9 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                },
              ]}
              onPress={() => setCurrentIndex((prev) => prev + 1)}
              disabled={submitting}
            >
              <Ionicons name="chevron-forward" size={18} color="#fff" />
            </Pressable>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    gap: 12,
  },
  topBarCenter: {
    flex: 1,
    alignItems: "center",
  },
  topBarTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  timerBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
  },
  timerText: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  progressBar: {
    height: 3,
    width: "100%",
  },
  progressFill: {
    height: "100%",
    borderRadius: 1.5,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 16,
  },
  questionContainer: {
    gap: 16,
  },
  questionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  questionNum: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  pointsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  pointsText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  questionTypeLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    marginBottom: 4,
  },
  questionContent: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
    lineHeight: 24,
    marginBottom: 16,
  },
  fillInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 4,
  },
  fillTextInput: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  optionsList: {
    gap: 8,
  },
  optionBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderWidth: 1,
    borderRadius: 8,
    gap: 12,
  },
  optionIndicator: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  optionText: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
  feedbackSection: {
    gap: 12,
    marginTop: 8,
  },
  resultHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  resultTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  correctAnswerBlock: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    gap: 6,
  },
  correctAnswerLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  correctAnswerText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  userAnswerBlock: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
  },
  userAnswerLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  explanationBlock: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
  },
  explanationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  explanationLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  explanationText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  navRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  navBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
  },
  navBtnText: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  counterText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    flex: 1,
    textAlign: "center",
  },
  checkBtn: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  checkBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  submitBtn: {
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 4,
  },
  submitBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
  nextBtnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
  },
});
