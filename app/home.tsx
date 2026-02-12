import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  Pressable,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons, Feather } from "@expo/vector-icons";
import { useQuery } from "@tanstack/react-query";
import Animated, {
  FadeInDown,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useTheme } from "@/lib/theme-context";
import { useToast } from "@/lib/toast-context";
import { api, QuizListItem, QuizAttemptStatus } from "@/lib/api";
import Colors from "@/constants/colors";
import HexagonLoader from "@/components/HexagonLoader";

function QuizCard({ quiz, index }: { quiz: QuizListItem; index: number }) {
  const { theme, isDark } = useTheme();

  const difficultyColor =
    quiz.difficulty === "EASY"
      ? theme.success
      : quiz.difficulty === "MEDIUM"
      ? Colors.primary
      : theme.error;

  const statusInfo = getStatusInfo(quiz, theme);

  function handlePress() {
    if (quiz.attemptStatus === "expired" || quiz.attemptStatus === "not_started_yet") {
      return;
    }
    if (!quiz.canAttempt && quiz.attemptStatus === "completed") {
      return;
    }
    router.push({ pathname: "/quiz/[id]", params: { id: quiz.id } });
  }

  return (
    <Animated.View entering={FadeInDown.delay(index * 80).duration(400).springify()}>
      <Pressable
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: theme.card,
            borderColor: theme.cardBorder,
            opacity: pressed ? 0.92 : 1,
            transform: [{ scale: pressed ? 0.98 : 1 }],
          },
        ]}
        onPress={handlePress}
        disabled={
          quiz.attemptStatus === "expired" ||
          quiz.attemptStatus === "not_started_yet" ||
          (!quiz.canAttempt && quiz.attemptStatus === "completed")
        }
      >
        <View style={styles.cardHeader}>
          <View style={styles.cardTitleRow}>
            <Text style={[styles.cardTitle, { color: theme.text }]} numberOfLines={1}>
              {quiz.title}
            </Text>
            <View style={[styles.diffBadge, { backgroundColor: difficultyColor + "18" }]}>
              <Text style={[styles.diffText, { color: difficultyColor }]}>
                {quiz.difficulty}
              </Text>
            </View>
          </View>
          <Text style={[styles.cardDesc, { color: theme.textSecondary }]} numberOfLines={2}>
            {quiz.description}
          </Text>
        </View>

        <View style={[styles.cardMeta, { borderTopColor: theme.cardBorder }]}>
          <View style={styles.metaItem}>
            <Ionicons name="help-circle-outline" size={14} color={theme.textTertiary} />
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
              {quiz.questionCount} Qs
            </Text>
          </View>
          {quiz.timeLimit && (
            <View style={styles.metaItem}>
              <Ionicons name="time-outline" size={14} color={theme.textTertiary} />
              <Text style={[styles.metaText, { color: theme.textSecondary }]}>
                {quiz.timeLimit} min
              </Text>
            </View>
          )}
          <View style={styles.metaItem}>
            <Ionicons name="repeat-outline" size={14} color={theme.textTertiary} />
            <Text style={[styles.metaText, { color: theme.textSecondary }]}>
              {quiz.attempts}/{quiz.maxAttempts ?? "∞"}
            </Text>
          </View>
          {quiz.bestScore !== null && (
            <View style={styles.metaItem}>
              <Ionicons name="trophy-outline" size={14} color={Colors.primary} />
              <Text style={[styles.metaText, { color: Colors.primary }]}>
                {quiz.bestScore.toFixed(0)}%
              </Text>
            </View>
          )}
        </View>

        <View style={styles.cardFooter}>
          <View style={[styles.statusChip, { backgroundColor: statusInfo.bg }]}>
            <Ionicons name={statusInfo.icon as any} size={12} color={statusInfo.color} />
            <Text style={[styles.statusText, { color: statusInfo.color }]}>
              {statusInfo.label}
            </Text>
          </View>
          {quiz.canAttempt && quiz.attemptStatus !== "expired" && quiz.attemptStatus !== "not_started_yet" && (
            <Ionicons name="chevron-forward" size={18} color={theme.textTertiary} />
          )}
        </View>
    </Pressable>
    </Animated.View>
  );
}

function getStatusInfo(quiz: QuizListItem, theme: any) {
  switch (quiz.attemptStatus) {
    case "not_started":
      return {
        label: "Start Quiz",
        icon: "play-circle",
        color: Colors.primary,
        bg: Colors.primary + "15",
      };
    case "in_progress":
      return {
        label: "Continue",
        icon: "arrow-forward-circle",
        color: "#3B82F6",
        bg: "#3B82F6" + "15",
      };
    case "completed":
      return {
        label: quiz.canAttempt ? "Retake" : "Completed",
        icon: quiz.canAttempt ? "refresh-circle" : "checkmark-circle",
        color: theme.success,
        bg: theme.success + "15",
      };
    case "expired":
      return {
        label: "Closed",
        icon: "close-circle",
        color: theme.error,
        bg: theme.error + "15",
      };
    case "not_started_yet":
      return {
        label: "Upcoming",
        icon: "hourglass",
        color: theme.textTertiary,
        bg: theme.textTertiary + "15",
      };
    default:
      return {
        label: "View",
        icon: "eye",
        color: theme.textSecondary,
        bg: theme.textSecondary + "15",
      };
  }
}

export default function HomeScreen() {
  const { theme, isDark, toggleTheme } = useTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const {
    data: quizData,
    isLoading,
    refetch,
    isRefetching,
  } = useQuery({
    queryKey: ["/quiz"],
    queryFn: async () => {
      const res = await api.getQuizzes();
      return res.data || [];
    },
  });

  const quizzes = (quizData || []) as QuizListItem[];

  const sortedQuizzes = [...quizzes].sort((a, b) => {
    const order: Record<QuizAttemptStatus, number> = {
      in_progress: 0,
      not_started: 1,
      completed: 2,
      not_started_yet: 3,
      expired: 4,
    };
    return (order[a.attemptStatus] ?? 5) - (order[b.attemptStatus] ?? 5);
  });

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.headerBar,
          {
            paddingTop: Platform.OS === "web" ? 67 + 12 : insets.top + 12,
            backgroundColor: theme.background,
            borderBottomColor: theme.cardBorder,
          },
        ]}
      >
        <View style={{ flex: 1 }}>
          <Text style={[styles.greeting, { color: theme.textSecondary }]}>Welcome back</Text>
          <Text style={[styles.headerTitle, { color: theme.text }]}>Your Quizzes</Text>
        </View>
        <Pressable
          style={({ pressed }) => [
            styles.themeToggle,
            {
              backgroundColor: theme.inputBg,
              borderColor: theme.inputBorder,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
          onPress={toggleTheme}
          hitSlop={8}
        >
          <Ionicons
            name={isDark ? "sunny" : "moon"}
            size={18}
            color={theme.text}
          />
        </Pressable>
      </View>

      {isLoading ? (
        <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
          <HexagonLoader />
        </View>
      ) : sortedQuizzes.length === 0 ? (
        <View style={styles.centered}>
          <MaterialCommunityIcons name="clipboard-text-outline" size={48} color={theme.textTertiary} />
          <Text style={[styles.emptyText, { color: theme.textSecondary }]}>
            No quizzes available
          </Text>
          <Text style={[styles.emptySubtext, { color: theme.textTertiary }]}>
            Pull down to refresh
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedQuizzes}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => <QuizCard quiz={item} index={index} />}
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Platform.OS === "web" ? 34 + 80 : insets.bottom + 80 },
          ]}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={isRefetching}
              onRefresh={refetch}
              tintColor={Colors.primary}
              colors={[Colors.primary]}
            />
          }
        />
      )}

      <Pressable
        style={({ pressed }) => [
          styles.fab,
          {
            backgroundColor: Colors.primary,
            bottom: Platform.OS === "web" ? 34 + 20 : insets.bottom + 20,
            opacity: pressed ? 0.85 : 1,
            transform: [{ scale: pressed ? 0.92 : 1 }],
          },
        ]}
        onPress={() => router.push("/profile")}
        testID="profile-fab"
      >
        <Ionicons name="person" size={22} color="#FAFAFA" />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  headerBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    gap: 12,
  },
  themeToggle: {
    width: 36,
    height: 36,
    borderRadius: 4,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  greeting: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  headerTitle: {
    fontSize: 22,
    fontFamily: "Inter_700Bold",
    marginTop: 2,
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  emptyText: {
    fontSize: 16,
    fontFamily: "Inter_500Medium",
  },
  emptySubtext: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  listContent: {
    padding: 16,
    gap: 12,
  },
  card: {
    borderWidth: 1,
    borderRadius: 4,
    overflow: "hidden",
  },
  cardHeader: {
    padding: 16,
    gap: 6,
  },
  cardTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  diffBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 2,
  },
  diffText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  cardDesc: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
  cardMeta: {
    flexDirection: "row",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    gap: 16,
    flexWrap: "wrap",
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  metaText: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  cardFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    paddingTop: 4,
  },
  statusChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 2,
  },
  statusText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  fab: {
    position: "absolute",
    right: 20,
    width: 52,
    height: 52,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
});
