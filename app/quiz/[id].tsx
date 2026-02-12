import React, { useState, useEffect, useRef, useCallback } from "react";
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
import { useTheme } from "@/lib/theme-context";
import { useToast } from "@/lib/toast-context";
import { api } from "@/lib/api";
import Colors from "@/constants/colors";
import HexagonLoader from "@/components/HexagonLoader";

interface Option {
  id: string;
  text: string;
  index?: number; // Track original index for fallback comparison
}

interface Question {
  id: string;
  title: string;
  content: string;
  type: "MULTIPLE_CHOICE" | "MULTI_SELECT" | "TRUE_FALSE" | "FILL_IN_BLANK";
  options: string[] | Option[] | any[]; // Raw options from API
  explanation: string;
  difficulty: string;
  order: number;
  points: number;
  correctAnswer?: string | string[] | number; // Can be index, text, or array
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

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
}

function getQuestionId(q: Question): string {
  return q.id ?? (q as any)._id;
}

function normalizeOptions(options: any[]): Option[] {
  return (options || []).map((opt: any, index: number) => {
    let id: string;
    let text: string;
    
    if (typeof opt === "string") {
      id = opt;
      text = opt;
    } else if (typeof opt === "number") {
      id = String.fromCharCode(65 + index);
      text = String.fromCharCode(65 + index);
    } else if (typeof opt === "object" && opt !== null) {
      text = String(
        opt?.text ?? 
        opt?.optionText ?? 
        opt?.option_text ?? 
        opt?.label ?? 
        opt?.content ?? 
        opt?.body ?? 
        opt?.title ?? 
        opt?.name ?? 
        opt?.value ?? 
        opt?.option ?? 
        ""
      );
      id = text || String.fromCharCode(65 + index);
    } else {
      id = String.fromCharCode(65 + index);
      text = String.fromCharCode(65 + index);
    }
    
    return { id, text, index };
  }).filter((opt) => opt.text !== "");
}

function getNormalizedCorrectAnswer(correctAnswer: any, options: Option[]): string | string[] {
  if (correctAnswer == null) return "";
  
  if (Array.isArray(correctAnswer)) {
    return correctAnswer.map((ca) => getNormalizedSingleAnswer(ca, options)).filter(String);
  }
  
  return getNormalizedSingleAnswer(correctAnswer, options);
}

function getNormalizedSingleAnswer(answer: any, options: Option[]): string {
  if (answer == null) return "";
  
  const answerStr = String(answer).trim();
  
  if (!isNaN(Number(answerStr))) {
    const index = Number(answerStr);
    if (index >= 0 && index < options.length) {
      return options[index].text;
    }
  }
  
  const matchedOption = options.find(
    (opt) => opt.id === answerStr || opt.text === answerStr
  );
  if (matchedOption) {
    return matchedOption.text;
  }
  
  return answerStr;
}

function prepareAnswersForSubmit(
  questions: Question[],
  answers: Record<string, string>
): Record<string, string> {
  const result: Record<string, string> = {};
  
  for (const q of questions) {
    const qId = getQuestionId(q);
    if (!qId) {
      console.warn("Question has no ID:", q);
      continue;
    }
    
    const val = answers[qId] ?? answers[q.id] ?? "";
    const normalizedOpts = normalizeOptions(q.options);
    
    if (q.type === "FILL_IN_BLANK") {
      result[qId] = String(val || "").trim();
    } else if (q.type === "MULTI_SELECT") {
      let arr: string[] = [];
      if (val) {
        try {
          const parsed = JSON.parse(val);
          arr = Array.isArray(parsed) ? parsed.map(String).filter(Boolean) : [];
        } catch {
          arr = val.includes("|") ? val.split("|").map((s) => s.trim()).filter(Boolean) : (val ? [val] : []);
        }
      }
      
      arr = arr.map((a) => getNormalizedSingleAnswer(a, normalizedOpts)).filter(Boolean);
      result[qId] = JSON.stringify(arr);
    } else {
      const normalized = getNormalizedSingleAnswer(val || "", normalizedOpts);
      result[qId] = normalized || "";
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
}: {
  option: Option;
  selected: boolean;
  onPress: () => void;
  theme: any;
  wrong?: boolean;
  correct?: boolean;
}) {
  const bgColor = correct
    ? theme.success + "18"
    : wrong
    ? theme.error + "18"
    : selected
    ? Colors.primary + "12"
    : theme.inputBg;
  const borderColor = correct
    ? theme.success
    : wrong
    ? theme.error
    : selected
    ? Colors.primary
    : theme.inputBorder;
  const indicatorColor = correct ? theme.success : wrong ? theme.error : selected ? Colors.primary : "transparent";
  const indicatorBorder = correct ? theme.success : wrong ? theme.error : selected ? Colors.primary : theme.textTertiary;
  const textColor = correct ? theme.success : wrong ? theme.error : theme.text;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.optionBtn,
        {
          backgroundColor: bgColor,
          borderColor,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      onPress={onPress}
      testID={`option-${option.id}`}
      accessibilityRole="button"
      accessibilityState={{ selected }}
    >
      <View
        style={[
          styles.optionIndicator,
          {
            backgroundColor: indicatorColor,
            borderColor: indicatorBorder,
          },
        ]}
      >
        {(selected || correct) && <Ionicons name="checkmark" size={12} color="#fff" />}
      </View>
      <Text style={[styles.optionText, { color: textColor }]}>{option.text || option.id}</Text>
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
  isCorrectResult,
}: {
  question: Question;
  answer: string;
  onAnswer: (val: string) => void;
  questionNum: number;
  total: number;
  theme: any;
  checkAnswerEnabled?: boolean;
  isChecked?: boolean;
  isCorrectResult?: boolean;
}) {
  const showAnswerBlock = !!(checkAnswerEnabled && isChecked);
  
  const options = normalizeOptions(question.options);
  
  const selectedMulti: string[] = (() => {
    if (!answer) return [];
    try {
      const parsed = JSON.parse(answer);
      return Array.isArray(parsed) ? parsed.map(String) : [];
    } catch {
      return answer.includes("|") ? answer.split("|").map((s) => s.trim()).filter(Boolean) : [];
    }
  })();

  function toggleMultiSelect(optText: string) {
    const text = String(optText);
    const current = [...selectedMulti].map(String);
    const idx = current.indexOf(text);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(text);
    }
    onAnswer(JSON.stringify(current));
    if (Platform.OS !== "web") Haptics.selectionAsync();
  }

  function selectSingle(optText: string) {
    onAnswer(String(optText));
    if (Platform.OS !== "web") Haptics.selectionAsync();
  }

  const diffColor =
    question.difficulty === "EASY"
      ? theme.success
      : question.difficulty === "MEDIUM"
      ? Colors.primary
      : theme.error;

  const rawCorrectAnswer = (question as any).correctAnswer ?? (question as any).correct_answer ?? question.correctAnswer;
  const hasCorrectAnswer = rawCorrectAnswer != null && (Array.isArray(rawCorrectAnswer) ? rawCorrectAnswer.length > 0 : String(rawCorrectAnswer).length > 0);

  const normalizedCorrect = getNormalizedCorrectAnswer(rawCorrectAnswer, options);
  const correctTexts: string[] = Array.isArray(normalizedCorrect) ? normalizedCorrect : normalizedCorrect ? [normalizedCorrect] : [];

  const userSelectedTexts: string[] =
    question.type === "MULTI_SELECT"
      ? selectedMulti
      : answer ? [getNormalizedSingleAnswer(String(answer).trim(), options)] : [];

  const questionTypeLabel =
    question.type === "MULTIPLE_CHOICE"
      ? "Multiple Choice"
      : question.type === "MULTI_SELECT"
      ? "Multi Select"
      : question.type === "TRUE_FALSE"
      ? "True / False"
      : question.type === "FILL_IN_BLANK"
      ? "Fill in the Blank"
      : question.type;

  return (
    <View style={styles.questionContainer}>
      <View style={styles.questionHeader}>
        <Text style={[styles.questionNum, { color: theme.textTertiary }]}>
          Question {questionNum} of {total}
        </Text>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <View style={[styles.pointsBadge, { backgroundColor: Colors.primary + "15" }]}>
            <Text style={[styles.pointsText, { color: Colors.primary }]}>
              1 pt
            </Text>
          </View>
          <View style={[styles.pointsBadge, { backgroundColor: diffColor + "15" }]}>
            <Text style={[styles.pointsText, { color: diffColor }]}>{question.difficulty}</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.questionTypeLabel, { color: theme.textTertiary }]}>{questionTypeLabel}</Text>
      <Text style={[styles.questionContent, { color: theme.text }]}>{question.content}</Text>

      {question.type === "FILL_IN_BLANK" ? (
        <View
          style={[
            styles.fillInput,
            {
              backgroundColor: theme.inputBg,
              borderColor: theme.inputBorder,
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
          />
        </View>
      ) : question.type === "MULTI_SELECT" ? (
        <View style={styles.optionsList}>
          <Text style={[styles.multiHint, { color: theme.textTertiary }]}>
            Select all that apply
          </Text>
          {options.map((opt, idx) => {
            const optText = opt.text || opt.id;
            const isCorrect = showAnswerBlock && correctTexts.includes(optText);
            const isWrong = showAnswerBlock && !isCorrectResult && userSelectedTexts.includes(optText);
            return (
              <OptionButton
                key={opt.id || idx}
                option={opt}
                selected={selectedMulti.includes(optText)}
                onPress={() => !showAnswerBlock && toggleMultiSelect(optText)}
                theme={theme}
                correct={isCorrect}
                wrong={isWrong}
              />
            );
          })}
        </View>
      ) : (
        <View style={styles.optionsList}>
          {options.map((opt, idx) => {
            const optText = opt.text || opt.id;
            const isCorrect = showAnswerBlock && correctTexts.includes(optText);
            const isWrong = showAnswerBlock && !isCorrectResult && userSelectedTexts.includes(optText);
            return (
              <OptionButton
                key={opt.id || idx}
                option={opt}
                selected={String(answer).trim() === optText}
                onPress={() => !showAnswerBlock && selectSingle(optText)}
                theme={theme}
                correct={isCorrect}
                wrong={isWrong}
              />
            );
          })}
        </View>
      )}

      {showAnswerBlock && hasCorrectAnswer && (
        <View style={[styles.optionBtn, { backgroundColor: theme.success + "18", borderColor: theme.success, marginTop: 12 }]}>
          <View
            style={[
              styles.optionIndicator,
              {
                backgroundColor: theme.success,
                borderColor: theme.success,
              },
            ]}
          >
            <Ionicons name="checkmark" size={12} color="#fff" />
          </View>
          <Text style={[styles.optionText, { color: theme.success }]}>
            {question.type === "MULTI_SELECT"
              ? correctTexts.join(", ")
              : question.type === "FILL_IN_BLANK"
              ? correctTexts[0] ?? ""
              : correctTexts[0] ?? correctTexts[0] ?? ""}
          </Text>
        </View>
      )}

      {showAnswerBlock && question.explanation ? (
        <View
          style={[
            styles.answerBlock,
            {
              backgroundColor: theme.inputBg,
              borderColor: theme.inputBorder,
              marginTop: 12,
            },
          ]}
        >
          <Text style={[styles.answerLabel, { color: theme.textSecondary }]}>Explanation</Text>
          <Text style={[styles.answerText, { color: theme.text }]}>{question.explanation}</Text>
        </View>
      ) : null}
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
  const answersRef = useRef<Record<string, string>>({});
  const quizDataRef = useRef<QuizData | null>(null);
  const submittingRef = useRef(false);
  const autoSubmittedRef = useRef(false);

  useEffect(() => {
    answersRef.current = answers;
  }, [answers]);

  useEffect(() => {
    quizDataRef.current = quizData;
  }, [quizData]);

  useEffect(() => {
    submittingRef.current = submitting;
  }, [submitting]);

  useEffect(() => {
    loadQuiz();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function loadQuiz() {
    try {
      const res = await api.getQuiz(id);
      if (res.success && res.data) {
        setQuizData(res.data);
        const initialAnswers = res.data.answers || {};
        setAnswers(initialAnswers);
        answersRef.current = initialAnswers;
        quizDataRef.current = res.data;
        if (res.data.quiz.timeLimit && res.data.timeRemaining > 0) {
          setTimeLeft(res.data.timeRemaining);
          startTimer(res.data.timeRemaining, res.data.startedAt);
        } else if (res.data.quiz.timeLimit && res.data.quiz.timeLimit > 0) {
          const timeLimitSec = res.data.quiz.timeLimit * 60;
          const elapsed = Math.floor(
            (Date.now() - new Date(res.data.startedAt).getTime()) / 1000
          );
          const remaining = Math.max(0, timeLimitSec - elapsed);
          setTimeLeft(remaining);
          if (remaining > 0) {
            startTimer(remaining, res.data.startedAt);
          }
        }
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load quiz", "error");
      router.back();
    } finally {
      setLoading(false);
    }
  }

  function startTimer(initial: number, startedAt: string) {
    if (timerRef.current) clearInterval(timerRef.current);
    const startTime = Date.now();
    timerRef.current = setInterval(() => {
      const elapsedSinceStart = Math.floor((Date.now() - startTime) / 1000);
      const remaining = Math.max(0, initial - elapsedSinceStart);
      setTimeLeft(remaining);
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        timerRef.current = null;
        if (!autoSubmittedRef.current) {
          autoSubmittedRef.current = true;
          doSubmitFromTimer();
        }
      }
    }, 1000);
  }

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
  }

  function isAnswerCorrect(question: Question, answer: string): boolean {
    const rawCorrect = (question as any).correctAnswer ?? (question as any).correct_answer ?? question.correctAnswer;
    if (rawCorrect == null) return false;
    
    const opts = normalizeOptions(question.options);
    const normalizedCorrect = getNormalizedCorrectAnswer(rawCorrect, opts);
    
    if (question.type === "MULTI_SELECT") {
      const correctArr = (Array.isArray(normalizedCorrect) ? normalizedCorrect : normalizedCorrect ? [normalizedCorrect] : [])
        .map(String).sort();
      
      let userArr: string[] = [];
      try {
        const p = JSON.parse(answer || "[]");
        userArr = Array.isArray(p) ? p.map(String) : answer.split("|").map((s) => s.trim()).filter(Boolean);
      } catch {
        userArr = answer.split("|").map((s) => s.trim()).filter(Boolean);
      }
      
      userArr = userArr.map((a) => getNormalizedSingleAnswer(a, opts)).filter(Boolean).sort();
      
      return correctArr.length === userArr.length && correctArr.every((c, i) => c === userArr[i]);
    }
    
    if (question.type === "FILL_IN_BLANK") {
      const correct = Array.isArray(normalizedCorrect) ? normalizedCorrect[0] : normalizedCorrect;
      return String(answer || "").trim().toLowerCase() === String(correct || "").trim().toLowerCase();
    }
    
    const correct = Array.isArray(normalizedCorrect) ? normalizedCorrect[0] : normalizedCorrect;
    const normalized = getNormalizedSingleAnswer(answer, opts);
    return String(normalized).trim() === String(correct || "").trim();
  }

  function handleCheckAnswer() {
    if (!quizData) return;
    const q = quizData.quiz.questions[currentIndex];
    const ans = answers[getQuestionId(q)] ?? answers[q.id] ?? "";
    const correct = isAnswerCorrect(q, ans);
    if (Platform.OS !== "web") {
      if (correct) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    }
    setCheckedQuestions((prev) => new Set(prev).add(getQuestionId(q)));
  }

  async function doSubmitFromTimer() {
    const qd = quizDataRef.current;
    const ans = answersRef.current;
    if (!qd) return;
    if (submittingRef.current) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    try {
      const prepared = prepareAnswersForSubmit(qd.quiz.questions, ans);
      
      const res = await api.submitQuiz(qd.quiz.id, qd.attemptId, prepared);
      if (res.success && res.data) {
        const numQuestions = qd.quiz.questions.length;
        const newTotalPoints = numQuestions;
        const newScore = res.data.totalPoints > 0 ? (res.data.score / res.data.totalPoints) * newTotalPoints : 0;

        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast("Time's up! Quiz submitted.", "info");
        router.replace({
          pathname: "/result",
          params: {
            score: newScore.toString(),
            totalPoints: newTotalPoints.toString(),
            timeTaken: res.data.timeTaken.toString(),
            quizTitle: res.data.quiz.title,
            showAnswers: qd.quiz.showAnswers ? "1" : "0",
          },
        });
      } else {
        throw new Error(res.message || "Failed to auto-submit quiz");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to submit quiz", "error");
      setSubmitting(false);
    }
  }

  async function handleSubmit(auto = false) {
    if (!quizData) return;
    if (submitting) return;

    if (!auto) {
      const unanswered =
        quizData.quiz.questions.length -
        Object.keys(answers).filter((k) => answers[k] && answers[k].length > 0).length;

      if (unanswered > 0) {
        Alert.alert(
          "Submit Quiz?",
          `You have ${unanswered} unanswered question${unanswered > 1 ? "s" : ""}. Are you sure you want to submit?`,
          [
            { text: "Cancel", style: "cancel" },
            { text: "Submit", style: "destructive", onPress: () => doSubmit() },
          ]
        );
        return;
      }

      Alert.alert("Submit Quiz?", "Are you sure you want to submit your answers?", [
        { text: "Cancel", style: "cancel" },
        { text: "Submit", onPress: () => doSubmit() },
      ]);
      return;
    }

    doSubmit();
  }

  async function doSubmit() {
    if (!quizData) return;
    setSubmitting(true);
    if (timerRef.current) clearInterval(timerRef.current);

    let prepared: Record<string, string> = {};
    try {
      prepared = prepareAnswersForSubmit(quizData.quiz.questions, answers);
      
      const res = await api.submitQuiz(quizData.quiz.id, quizData.attemptId, prepared);
      
      if (res.success && res.data) {
        const numQuestions = quizData.quiz.questions.length;
        const newTotalPoints = numQuestions;
        const newScore = res.data.totalPoints > 0 ? (res.data.score / res.data.totalPoints) * newTotalPoints : 0;

        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast("Quiz submitted!", "success");
        router.replace({
          pathname: "/result",
          params: {
            score: newScore.toString(),
            totalPoints: newTotalPoints.toString(),
            timeTaken: res.data.timeTaken.toString(),
            quizTitle: res.data.quiz.title,
            showAnswers: quizData.quiz.showAnswers ? "1" : "0",
          },
        });
      } else {
        throw new Error(res.message || "Unknown error during submission");
      }
    } catch (err: any) {
      showToast(err.message || "Failed to submit quiz", "error");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <HexagonLoader />
      </View>
    );
  }

  if (!quizData) return null;

  const questions = quizData.quiz.questions;
  const current = questions[currentIndex];
  const currentAnswer = answers[getQuestionId(current)] ?? answers[current.id] ?? "";
  const hasAnswered =
    current.type === "MULTI_SELECT"
      ? (() => {
          try {
            const p = JSON.parse(currentAnswer);
            return Array.isArray(p) && p.length > 0;
          } catch {
            return false;
          }
        })()
      : currentAnswer.trim().length > 0;

  const answeredCount = Object.keys(answers).filter(
    (k) => answers[k] && answers[k].length > 0
  ).length;

  const isTimeLow = timeLeft > 0 && timeLeft <= 60;

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.topBar,
          {
            paddingTop: Platform.OS === "web" ? 67 + 8 : insets.top + 8,
            backgroundColor: theme.surface,
            borderBottomColor: theme.cardBorder,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </Pressable>
        <View style={styles.topBarCenter}>
          <Text style={[styles.topBarTitle, { color: theme.text }]} numberOfLines={1}>
            {quizData.quiz.title}
          </Text>
        </View>
        {quizData.quiz.timeLimit && (
          <View
            style={[
              styles.timerBadge,
              {
                backgroundColor: isTimeLow ? theme.error + "15" : Colors.primary + "15",
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
          question={current}
          answer={answers[getQuestionId(current)] ?? answers[current.id] ?? ""}
          onAnswer={(val) => setAnswer(getQuestionId(current), val)}
          questionNum={currentIndex + 1}
          total={questions.length}
          theme={theme}
          checkAnswerEnabled={quizData.quiz.checkAnswerEnabled}
          isChecked={checkedQuestions.has(getQuestionId(current))}
          isCorrectResult={checkedQuestions.has(getQuestionId(current)) && isAnswerCorrect(current, answers[getQuestionId(current)] ?? answers[current.id] ?? "")}
        />
      </ScrollView>

      <View
        style={[
          styles.bottomBar,
          {
            backgroundColor: theme.surface,
            borderTopColor: theme.cardBorder,
            paddingBottom: Platform.OS === "web" ? 34 + 12 : insets.bottom + 12,
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
                opacity: currentIndex === 0 ? 0.4 : pressed ? 0.8 : 1,
              },
            ]}
            onPress={() => {
              if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
            }}
            disabled={currentIndex === 0}
          >
            <Ionicons name="chevron-back" size={18} color={theme.text} />
            <Text style={[styles.navBtnText, { color: theme.text }]}>Prev</Text>
          </Pressable>

          <Text style={[styles.counterText, { color: theme.textSecondary }]}>
            {answeredCount}/{questions.length} answered
          </Text>

          {quizData.quiz.checkAnswerEnabled && !checkedQuestions.has(getQuestionId(current)) ? (
            <Pressable
              style={({ pressed }) => [
                styles.navBtn,
                styles.checkBtn,
                {
                  backgroundColor: Colors.primary,
                  borderWidth: 0,
                  opacity: hasAnswered ? (pressed ? 0.85 : 1) : 0.5,
                },
              ]}
              onPress={hasAnswered ? handleCheckAnswer : undefined}
              disabled={!hasAnswered}
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
                  opacity: submitting ? 0.6 : pressed ? 0.85 : 1,
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
              onPress={() => {
                if (currentIndex < questions.length - 1) setCurrentIndex(currentIndex + 1);
              }}
            >
              <Text style={[styles.navBtnText, { color: theme.text }]}>Next</Text>
              <Ionicons name="chevron-forward" size={18} color={theme.text} />
            </Pressable>
          )}
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dotsRow}
        >
          {questions.map((q, i) => {
            const qId = getQuestionId(q);
            const isAnswered = !!(answers[qId] ?? answers[q.id]) && (answers[qId] ?? answers[q.id]).length > 0;
            const isCurrent = i === currentIndex;
            return (
              <Pressable
                key={qId}
                style={[
                  styles.dot,
                  {
                    backgroundColor: isCurrent
                      ? Colors.primary
                      : isAnswered
                      ? Colors.primary + "40"
                      : theme.inputBg,
                    borderColor: isCurrent ? Colors.primary : theme.inputBorder,
                  },
                ]}
                onPress={() => setCurrentIndex(i)}
              >
                <Text
                  style={[
                    styles.dotText,
                    {
                      color: isCurrent
                        ? "#fff"
                        : isAnswered
                        ? Colors.primary
                        : theme.textTertiary,
                    },
                  ]}
                >
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
  answerBlock: {
    marginTop: 16,
    padding: 14,
    borderRadius: 4,
    borderWidth: 1,
    gap: 4,
  },
  answerLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  answerText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
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
