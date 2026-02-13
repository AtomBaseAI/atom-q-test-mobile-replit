import React, { useState } from "react";
import {
  View,
  Text,
  Pressable,
  ScrollView,
  StyleSheet,
  Platform,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn,
} from "react-native-reanimated";
import { useTheme } from "@/lib/theme-context";
import Colors from "@/constants/colors";

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

export default function ResultScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    score: string;
    totalPoints: string;
    timeTaken: string;
    quizTitle: string;
    showAnswers: string;
    correctCount: string;
    incorrectCount: string;
    questionResults: string;
  }>();

  const [showDetails, setShowDetails] = useState(false);

  const score = parseFloat(params.score || "0");
  const totalPoints = parseFloat(params.totalPoints || "0");
  const timeTaken = parseInt(params.timeTaken || "0", 10);
  const quizTitle = params.quizTitle || "Quiz";
  const showAnswers = params.showAnswers === "1";
  const correctCount = parseInt(params.correctCount || "0", 10);
  const incorrectCount = parseInt(params.incorrectCount || "0", 10);
  const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;
  
  let questionResults: QuestionResult[] = [];
  try {
    questionResults = JSON.parse(params.questionResults || "[]");
  } catch {
    questionResults = [];
  }

  const timeTakenMin = Math.floor(timeTaken / 60);
  const timeTakenSec = timeTaken % 60;

  const gradeInfo = getGrade(percentage);

  function getGrade(pct: number) {
    if (pct >= 90) return { label: "Excellent!", icon: "trophy", color: "#FFB800" };
    if (pct >= 75) return { label: "Great Job!", icon: "ribbon", color: theme.success };
    if (pct >= 50) return { label: "Good Effort", icon: "thumbs-up", color: Colors.primary };
    if (pct >= 25) return { label: "Keep Trying", icon: "fitness", color: theme.warning };
    return { label: "Don't Give Up", icon: "refresh", color: theme.error };
  }

  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: theme.background,
          paddingTop: Platform.OS === "web" ? 67 + 20 : insets.top + 20,
          paddingBottom: Platform.OS === "web" ? 34 + 20 : insets.bottom + 20,
        },
      ]}
    >
      <Animated.View entering={FadeInUp.duration(500)} style={styles.headerSection}>
        <Text style={[styles.quizTitle, { color: theme.textSecondary }]}>{quizTitle}</Text>
        <Text style={[styles.resultLabel, { color: theme.text }]}>Results</Text>
      </Animated.View>

      <Animated.View entering={ZoomIn.delay(200).duration(400)} style={styles.scoreSection}>
        <View
          style={[
            styles.scoreBg,
            { backgroundColor: gradeInfo.color + "10", borderColor: gradeInfo.color + "30" },
          ]}
        >
          <Ionicons name={gradeInfo.icon as any} size={36} color={gradeInfo.color} />
          {/* <Text style={[styles.gradeLabel, { color: gradeInfo.color }]}>{gradeInfo.label}</Text> */}
          {/* <Text style={[styles.percentText, { color: theme.text }]}>
            {percentage.toFixed(1)}%
          </Text> */}
          <Text style={[styles.scoreBreakdown, { color: theme.textSecondary }]}>
            {score.toFixed(1)} / {totalPoints.toFixed(1)} points
          </Text>
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <Ionicons name="checkmark-circle" size={14} color={theme.success} />
              <Text style={[styles.breakdownText, { color: theme.text }]}>
                {correctCount} correct
              </Text>
            </View>
            <View style={styles.breakdownItem}>
              <Ionicons name="close-circle" size={14} color={theme.error} />
              <Text style={[styles.breakdownText, { color: theme.text }]}>
                {incorrectCount} incorrect
              </Text>
            </View>
          </View>
        </View>
      </Animated.View>

      <Animated.View entering={FadeInDown.delay(400).duration(400)} style={styles.statsRow}>
        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Ionicons name="time-outline" size={20} color={Colors.primary} />
          <Text style={[styles.statValue, { color: theme.text }]}>
            {timeTakenMin}m {timeTakenSec}s
          </Text>
          <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Time Taken</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Ionicons name="checkmark-done-outline" size={20} color={theme.success} />
          <Text style={[styles.statValue, { color: theme.text }]}>
            {score.toFixed(1)}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Score</Text>
        </View>
        <View style={[styles.statCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
          <Ionicons name="analytics-outline" size={20} color={Colors.accent} />
          <Text style={[styles.statValue, { color: theme.text }]}>
            {totalPoints.toFixed(0)}
          </Text>
          <Text style={[styles.statLabel, { color: theme.textTertiary }]}>Total</Text>
        </View>
      </Animated.View>

      {showAnswers && questionResults.length > 0 && (
        <Animated.View entering={FadeInDown.delay(600).duration(400)} style={styles.questionsSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: theme.text }]}>Question Breakdown</Text>
          </View>
          <ScrollView
            style={styles.questionsList}
            showsVerticalScrollIndicator={false}
          >
            {questionResults.map((qr, index) => (
              <Animated.View
                key={qr.questionId}
                entering={FadeInDown.delay(600 + index * 50).duration(300)}
                style={[
                  styles.questionResultCard,
                  {
                    backgroundColor: theme.card,
                    borderColor: qr.isCorrect ? theme.success + "30" : theme.error + "30",
                  },
                ]}
              >
                <View style={styles.questionResultHeader}>
                  <View style={styles.questionResultLeft}>
                    <Text style={[styles.questionNumber, { color: theme.textSecondary }]}>
                      Q{index + 1}
                    </Text>
                    <View
                      style={[
                        styles.resultChip,
                        {
                          backgroundColor: qr.isCorrect
                            ? theme.success + "20"
                            : theme.error + "20",
                        },
                      ]}
                    >
                      <Ionicons
                        name={qr.isCorrect ? "checkmark-circle" : "close-circle"}
                        size={14}
                        color={qr.isCorrect ? theme.success : theme.error}
                      />
                      <Text
                        style={[
                          styles.resultChipText,
                          { color: qr.isCorrect ? theme.success : theme.error },
                        ]}
                      >
                        {qr.isCorrect ? "Correct" : "Incorrect"}
                      </Text>
                    </View>
                  </View>
                  <Text style={[styles.pointsBadge, { color: theme.textTertiary }]}>
                    {qr.pointsEarned > 0 ? "+" : ""}{qr.pointsEarned} / {qr.pointsPossible}
                  </Text>
                </View>

                <Text style={[styles.questionText, { color: theme.text }]}>
                  {qr.questionContent}
                </Text>

                <View style={styles.answerSection}>
                  <View style={styles.answerRow}>
                    <Text style={[styles.answerLabel, { color: theme.textSecondary }]}>
                      Your answer:
                    </Text>
                    <Text
                      style={[
                        styles.answerValue,
                        { color: qr.isCorrect ? theme.success : theme.error },
                      ]}
                    >
                      {qr.userAnswer || "Not answered"}
                    </Text>
                  </View>

                  <View style={styles.answerRow}>
                    <Text style={[styles.answerLabel, { color: theme.textSecondary }]}>
                      Correct answer:
                    </Text>
                    <Text
                      style={[
                        styles.answerValue,
                        { color: theme.success },
                      ]}
                    >
                      {Array.isArray(qr.correctAnswer)
                        ? qr.correctAnswer.join(", ")
                        : qr.correctAnswer}
                    </Text>
                  </View>
                </View>

                {qr.explanation && (
                  <View
                    style={[
                      styles.explanationBlock,
                      {
                        backgroundColor: Colors.primary + "08",
                        borderColor: Colors.primary + "30",
                      },
                    ]}
                  >
                    <View style={styles.explanationHeader}>
                      <Ionicons name="information-circle" size={16} color={Colors.primary} />
                      <Text
                        style={[styles.explanationTitle, { color: theme.textSecondary }]}
                      >
                        Explanation
                      </Text>
                    </View>
                    <Text style={[styles.explanationText, { color: theme.text }]}>
                      {qr.explanation}
                    </Text>
                  </View>
                )}
              </Animated.View>
            ))}
          </ScrollView>
        </Animated.View>
      )}

      <View style={styles.actionsSection}>
        {showAnswers && questionResults.length > 0 && (
          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              {
                backgroundColor: theme.card,
                borderColor: theme.inputBorder,
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
            onPress={() => setShowDetails(false)}
          >
            <Text style={[styles.secondaryBtnText, { color: theme.text }]}>Hide Details</Text>
          </Pressable>
        )}
        
        {!showDetails && questionResults.length > 0 && (
          <Pressable
            style={({ pressed }) => [
              styles.secondaryBtn,
              {
                backgroundColor: theme.card,
                borderColor: theme.inputBorder,
                opacity: pressed ? 0.8 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
            onPress={() => setShowDetails(true)}
          >
            <Text style={[styles.secondaryBtnText, { color: theme.text }]}>Show Details</Text>
          </Pressable>
        )}

        <Pressable
          style={({ pressed }) => [
            styles.primaryBtn,
            {
              backgroundColor: Colors.primary,
              opacity: pressed ? 0.85 : 1,
              transform: [{ scale: pressed ? 0.98 : 1 }],
            },
          ]}
          onPress={() => router.replace("/home")}
        >
          <Text style={styles.primaryBtnText}>Back to Quizzes</Text>
          <Ionicons name="arrow-forward" size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  quizTitle: {
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    marginBottom: 4,
  },
  resultLabel: {
    fontSize: 26,
    fontFamily: "Inter_700Bold",
  },
  scoreSection: {
    alignItems: "center",
    marginBottom: 24,
  },
  scoreBg: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 24,
    borderRadius: 4,
    borderWidth: 1,
    gap: 6,
  },
  gradeLabel: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
    marginTop: 4,
  },
  percentText: {
    fontSize: 44,
    fontFamily: "Inter_700Bold",
    marginTop: 4,
  },
  scoreBreakdown: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  breakdownRow: {
    flexDirection: "row",
    gap: 20,
    marginTop: 4,
  },
  breakdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  breakdownText: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 16,
    borderRadius: 4,
    borderWidth: 1,
    gap: 6,
  },
  statValue: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  questionsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  questionsList: {
    maxHeight: 400,
  },
  questionResultCard: {
    padding: 14,
    borderRadius: 4,
    borderWidth: 1,
    marginBottom: 12,
    gap: 10,
  },
  questionResultHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  questionResultLeft: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  questionNumber: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  resultChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  resultChipText: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
  },
  pointsBadge: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  questionText: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    lineHeight: 20,
    marginBottom: 10,
  },
  answerSection: {
    gap: 8,
  },
  answerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    flexWrap: "wrap",
  },
  answerLabel: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  answerValue: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    maxWidth: "60%",
    textAlign: "right",
  },
  explanationBlock: {
    padding: 12,
    borderRadius: 4,
    borderWidth: 1,
  },
  explanationHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  explanationTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  explanationText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  actionsSection: {
    gap: 10,
  },
  secondaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 46,
    borderRadius: 4,
    gap: 8,
    borderWidth: 1,
    paddingHorizontal: 20,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 4,
    gap: 8,
    paddingVertical: 0,
    paddingHorizontal: 20,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
