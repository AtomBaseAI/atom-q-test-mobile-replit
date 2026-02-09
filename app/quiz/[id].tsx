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
import Animated, { FadeIn, FadeInRight } from "react-native-reanimated";
import { useTheme } from "@/lib/useTheme";
import { useToast } from "@/lib/toast-context";
import { api } from "@/lib/api";
import Colors from "@/constants/colors";

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: string;
  title: string;
  content: string;
  type: "MULTIPLE_CHOICE" | "MULTI_SELECT" | "TRUE_FALSE" | "FILL_IN_BLANK";
  options: Option[];
  explanation: string;
  difficulty: string;
  order: number;
  points: number;
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

function OptionButton({
  option,
  selected,
  onPress,
  theme,
}: {
  option: Option;
  selected: boolean;
  onPress: () => void;
  theme: any;
}) {
  return (
    <Pressable
      style={({ pressed }) => [
        styles.optionBtn,
        {
          backgroundColor: selected ? Colors.primary + "12" : theme.inputBg,
          borderColor: selected ? Colors.primary : theme.inputBorder,
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
            backgroundColor: selected ? Colors.primary : "transparent",
            borderColor: selected ? Colors.primary : theme.textTertiary,
          },
        ]}
      >
        {selected && <Ionicons name="checkmark" size={12} color="#fff" />}
      </View>
      <Text style={[styles.optionText, { color: theme.text }]}>{option.text}</Text>
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
}: {
  question: Question;
  answer: string;
  onAnswer: (val: string) => void;
  questionNum: number;
  total: number;
  theme: any;
}) {
  const selectedMulti: string[] = (() => {
    if (!answer) return [];
    try {
      const parsed = JSON.parse(answer);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  })();

  function toggleMultiSelect(optId: string) {
    const current = [...selectedMulti];
    const idx = current.indexOf(optId);
    if (idx >= 0) {
      current.splice(idx, 1);
    } else {
      current.push(optId);
    }
    onAnswer(JSON.stringify(current));
    if (Platform.OS !== "web") Haptics.selectionAsync();
  }

  function selectSingle(optId: string) {
    onAnswer(optId);
    if (Platform.OS !== "web") Haptics.selectionAsync();
  }

  const diffColor =
    question.difficulty === "EASY"
      ? theme.success
      : question.difficulty === "MEDIUM"
      ? Colors.primary
      : theme.error;

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.questionContainer}>
      <View style={styles.questionHeader}>
        <Text style={[styles.questionNum, { color: theme.textTertiary }]}>
          Question {questionNum} of {total}
        </Text>
        <View style={{ flexDirection: "row", gap: 8, alignItems: "center" }}>
          <View style={[styles.pointsBadge, { backgroundColor: Colors.primary + "15" }]}>
            <Text style={[styles.pointsText, { color: Colors.primary }]}>
              {question.points} pt{question.points > 1 ? "s" : ""}
            </Text>
          </View>
          <View style={[styles.pointsBadge, { backgroundColor: diffColor + "15" }]}>
            <Text style={[styles.pointsText, { color: diffColor }]}>{question.difficulty}</Text>
          </View>
        </View>
      </View>

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
          {question.options.map((opt) => (
            <OptionButton
              key={opt.id}
              option={opt}
              selected={selectedMulti.includes(opt.id)}
              onPress={() => toggleMultiSelect(opt.id)}
              theme={theme}
            />
          ))}
        </View>
      ) : (
        <View style={styles.optionsList}>
          {question.options.map((opt) => (
            <OptionButton
              key={opt.id}
              option={opt}
              selected={answer === opt.id}
              onPress={() => selectSingle(opt.id)}
              theme={theme}
            />
          ))}
        </View>
      )}
    </Animated.View>
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
  const [timeLeft, setTimeLeft] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const scrollRef = useRef<ScrollView>(null);

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
        setAnswers(res.data.answers || {});
        if (res.data.timeRemaining > 0) {
          setTimeLeft(res.data.timeRemaining);
          startTimer(res.data.timeRemaining);
        }
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load quiz", "error");
      router.back();
    } finally {
      setLoading(false);
    }
  }

  function startTimer(initial: number) {
    let remaining = initial;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setTimeLeft(remaining);
      if (remaining <= 0) {
        if (timerRef.current) clearInterval(timerRef.current);
        handleSubmit(true);
      }
    }, 1000);
  }

  function setAnswer(questionId: string, value: string) {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
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

    try {
      const res = await api.submitQuiz(quizData.quiz.id, quizData.attemptId, answers);
      if (res.success && res.data) {
        if (Platform.OS !== "web") Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        showToast("Quiz submitted!", "success");
        router.replace({
          pathname: "/result",
          params: {
            score: res.data.score.toString(),
            totalPoints: res.data.totalPoints.toString(),
            timeTaken: res.data.timeTaken.toString(),
            quizTitle: res.data.quiz.title,
            showAnswers: quizData.quiz.showAnswers ? "1" : "0",
          },
        });
      }
    } catch (err: any) {
      showToast(err.message || "Failed to submit quiz", "error");
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  if (!quizData) return null;

  const questions = quizData.quiz.questions;
  const current = questions[currentIndex];
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
          answer={answers[current.id] || ""}
          onAnswer={(val) => setAnswer(current.id, val)}
          questionNum={currentIndex + 1}
          total={questions.length}
          theme={theme}
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

          {currentIndex === questions.length - 1 ? (
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
            const isAnswered = !!answers[q.id] && answers[q.id].length > 0;
            const isCurrent = i === currentIndex;
            return (
              <Pressable
                key={q.id}
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
