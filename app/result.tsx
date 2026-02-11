import React from "react";
import {
  View,
  Text,
  Pressable,
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

export default function ResultScreen() {
  const { theme } = useTheme();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{
    score: string;
    totalPoints: string;
    timeTaken: string;
    quizTitle: string;
    showAnswers: string;
  }>();

  const score = parseFloat(params.score || "0");
  const totalPoints = parseFloat(params.totalPoints || "0");
  const timeTaken = parseInt(params.timeTaken || "0", 10);
  const quizTitle = params.quizTitle || "Quiz";
  const percentage = totalPoints > 0 ? (score / totalPoints) * 100 : 0;

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
          <Text style={[styles.gradeLabel, { color: gradeInfo.color }]}>{gradeInfo.label}</Text>
          <Text style={[styles.percentText, { color: theme.text }]}>
            {percentage.toFixed(1)}%
          </Text>
          <Text style={[styles.scoreBreakdown, { color: theme.textSecondary }]}>
            {score.toFixed(1)} / {totalPoints.toFixed(1)} points
          </Text>
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

      <View style={styles.actionsSection}>
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
    justifyContent: "center",
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 28,
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
    marginBottom: 28,
  },
  scoreBg: {
    width: "100%",
    alignItems: "center",
    paddingVertical: 32,
    borderRadius: 4,
    borderWidth: 1,
    gap: 8,
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
  statsRow: {
    flexDirection: "row",
    gap: 10,
    marginBottom: 36,
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
  actionsSection: {
    gap: 12,
  },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 50,
    borderRadius: 4,
    gap: 8,
  },
  primaryBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
});
