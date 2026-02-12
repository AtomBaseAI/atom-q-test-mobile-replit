/**
 * Mobile API Client for Atom-Q
 *
 * Aligned with React Native components:
 * - app/home.tsx - Quiz listing page
 * - app/quiz/[id].tsx - Quiz taking screen
 * - app/result.tsx - Results display page
 *
 * Supports all quiz features:
 * - Negative marking
 * - Random order
 * - Check answer during quiz
 * - All question types
 */

import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://atom-q-beta-v12-demo-gani.vercel.app/api/mobile";

// ==================== TYPE DEFINITIONS ====================

/**
 * Quiz Status for home.tsx display
 */
export type QuizAttemptStatus =
  | 'not_started'      // Quiz is available to start
  | 'in_progress'      // User has an active attempt
  | 'completed'         // User has finished the quiz
  | 'expired'           // Quiz has ended
  | 'not_started_yet'; // Quiz hasn't started yet

/**
 * Quiz item as expected by home.tsx
 */
export interface QuizListItem {
  id: string;
  title: string;
  description: string;
  timeLimit: number | null;
  difficulty: string;
  maxAttempts: number | null;
  startTime: string;
  endTime: string;
  questionCount: number;
  attempts: number;              // Number of completed attempts
  bestScore: number | null;      // Best score from completed attempts
  lastAttemptDate: string | null;
  canAttempt: boolean;           // Whether user can start the quiz
  attemptStatus: QuizAttemptStatus;
  hasInProgress: boolean;       // Has an in-progress attempt
  inProgressAttemptId: string | null; // ID of in-progress attempt
}

/**
 * Question Types
 */
export type QuestionType = "MULTIPLE_CHOICE" | "MULTI_SELECT" | "TRUE_FALSE" | "FILL_IN_BLANK";
export type DifficultyLevel = "EASY" | "MEDIUM" | "HARD";

/**
 * Question Option
 */
export interface QuestionOption {
  id: string;
  text: string;
}

/**
 * Question Data (for quiz/[id].tsx)
 */
export interface Question {
  id: string;
  title?: string;
  content: string;
  type: QuestionType;
  options: QuestionOption[];
  explanation?: string;
  difficulty: DifficultyLevel;
  order: number;
  displayOrder?: number;        // Display order when randomOrder is enabled
  points: number;
  correctAnswer?: string | string[]; // Only included if checkAnswerEnabled is true
}

/**
 * Quiz Configuration (for quiz/[id].tsx)
 */
export interface QuizConfig {
  id: string;
  title: string;
  description: string;
  timeLimit: number | null;
  showAnswers: boolean;
  checkAnswerEnabled: boolean;   // Can check answers during quiz
  negativeMarking: boolean;      // Whether negative marking is enabled
  negativePoints: number | null; // Points deducted for wrong answers
  randomOrder: boolean;         // Whether questions/options are shuffled
  questions: Question[];
}

/**
 * Quiz Data (for taking quiz - quiz/[id].tsx)
 */
export interface QuizData {
  attemptId: string;
  quiz: QuizConfig;
  timeRemaining: number;
  startedAt: string;
  answers: Record<string, string>;
}

/**
 * Quiz Submission Result (for result.tsx)
 */
export interface SubmissionResult {
  attemptId: string;
  score: number;              // Percentage score (0-100)
  totalPoints: number;         // Total possible points
  timeTaken: number;           // Time in seconds
  submittedAt: string;
  quiz: {
    id: string;
    title: string;
  };
}

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean;
  message?: string;
  data?: T;
}

// ==================== UTILITY FUNCTIONS ====================

async function getToken(): Promise<string | null> {
  if (Platform.OS === "web") {
    return AsyncStorage.getItem("auth_token");
  }
  return SecureStore.getItemAsync("auth_token");
}

async function setToken(token: string): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.setItem("auth_token", token);
  } else {
    await SecureStore.setItemAsync("auth_token", token);
  }
}

async function removeToken(): Promise<void> {
  if (Platform.OS === "web") {
    await AsyncStorage.removeItem("auth_token");
  } else {
    await SecureStore.deleteItemAsync("auth_token");
  }
}

async function setUserData(user: any): Promise<void> {
  await AsyncStorage.setItem("user_data", JSON.stringify(user));
}

async function getUserData(): Promise<any | null> {
  const data = await AsyncStorage.getItem("user_data");
  return data ? JSON.parse(data) : null;
}

async function removeUserData(): Promise<void> {
  await AsyncStorage.removeItem("user_data");
}

async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const token = await getToken();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options.headers as Record<string, string>),
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(`${BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    let json: any;
    try {
      json = await res.json();
    } catch {
      if (!res.ok) {
        throw new Error(`Request failed with status ${res.status}`);
      }
      throw new Error("Invalid response from server");
    }

    if (!res.ok) {
      console.error("[API Error Response]", {
        endpoint,
        status: res.status,
        statusText: res.statusText,
        message: json?.message,
        error: json?.error,
        details: json?.details || json?.data,
      });

      return {
        success: false,
        message: json?.message || json?.error || `Request failed with status ${res.status}`,
        data: json?.data
      };
    }

    return json;
  } catch (error: any) {
    console.error("[API Request Failed]", {
      endpoint,
      error: error.message,
      stack: error.stack
    });

    return {
      success: false,
      message: error.message || "Network request failed",
    };
  }
}

// ==================== API CLIENT ====================

export const api = {
  getToken,
  setToken,
  removeToken,
  setUserData,
  getUserData,
  removeUserData,

  // ==================== AUTHENTICATION ====================

  /**
   * Login user and receive authentication token
   * POST /auth/login
   *
   * @param email - User email
   * @param password - User password
   * @returns Promise with token and user data
   */
  async login(email: string, password: string) {
    return apiRequest<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  /**
   * Logout user and clear local data
   */
  async logout() {
    await removeToken();
    await removeUserData();
  },

  // ==================== QUIZ MANAGEMENT ====================

  /**
   * Get all quizzes assigned to user
   * GET /quiz
   *
   * Returns data structure expected by app/home.tsx:
   * - id, title, description, timeLimit, difficulty
   * - maxAttempts, startTime, endTime
   * - questionCount, attempts, bestScore
   * - lastAttemptDate, canAttempt, attemptStatus
   * - hasInProgress, inProgressAttemptId
   *
   * @returns Array of Quiz objects
   */
  async getQuizzes(): Promise<ApiResponse<QuizListItem[]>> {
    return apiRequest<QuizListItem[]>("/quiz");
  },

  /**
   * Get quiz details and create/resume an attempt
   * GET /quiz/:id
   *
   * Returns:
   * - Quiz configuration (timeLimit, negativeMarking, randomOrder, checkAnswerEnabled)
   * - Questions with options and correct answers (if checkAnswerEnabled)
   * - Attempt data (attemptId, timeRemaining, existing answers)
   *
   * @param quizId - Quiz ID
   * @returns QuizData object
   */
  async getQuiz(quizId: string): Promise<ApiResponse<QuizData>> {
    return apiRequest<QuizData>(`/quiz/${quizId}`);
  },

  /**
   * Save quiz answers without submitting
   * POST /quiz/:id/save
   *
   * Used for auto-save functionality in app/quiz/[id].tsx
   * Saves progress without finalizing the attempt
   *
   * @param quizId - Quiz ID
   * @param attemptId - Current attempt ID
   * @param answers - Object mapping question ID to user answer
   * @returns Save statistics
   */
  async saveQuizAnswers(
    quizId: string,
    attemptId: string,
    answers: Record<string, string>
  ) {
    return apiRequest<{
      attemptId: string;
      saved: number;
      updated: number;
      total: number;
      savedAt: string;
    }>(`/quiz/${quizId}/save`, {
      method: "POST",
      body: JSON.stringify({ attemptId, answers }),
    });
  },

  /**
   * Submit quiz for grading and calculate final score
   * POST /quiz/:id/submit
   *
   * Handles:
   * - Score calculation with negative marking
   * - Points earned per question
   * - Final percentage score
   *
   * @param quizId - Quiz ID
   * @param attemptId - Current attempt ID
   * @param answers - All user answers
   * @returns Submission result with score
   */
  async submitQuiz(
    quizId: string,
    attemptId: string,
    answers: Record<string, string>
  ): Promise<ApiResponse<SubmissionResult>> {
    return apiRequest<SubmissionResult>(`/quiz/${quizId}/submit`, {
      method: "POST",
      body: JSON.stringify({ attemptId, answers }),
    });
  },

  /**
   * Get detailed quiz results for a specific attempt
   * GET /quiz/:id/result?attemptId={attemptId}
   *
   * Returns:
   * - Quiz configuration
   * - Attempt summary (score, timeTaken, isAutoSubmitted)
   * - Detailed question results (if showAnswers is true)
   *
   * @param quizId - Quiz ID
   * @param attemptId - Attempt ID to get results for
   * @returns Detailed quiz results
   */
  async getQuizResult(quizId: string, attemptId: string) {
    return apiRequest<any>(`/quiz/${quizId}/result?attemptId=${attemptId}`);
  },

  /**
   * Get complete attempt history for a specific quiz
   * GET /quiz/:id/history
   *
   * @param quizId - Quiz ID
   * @returns All attempts for the quiz
   */
  async getQuizHistory(quizId: string) {
    return apiRequest<any>(`/quiz/${quizId}/history`);
  },

  // ==================== PROFILE MANAGEMENT ====================

  /**
   * Get user profile with statistics and recent activity
   * GET /profile
   *
   * @returns User profile data with stats
   */
  async getProfile() {
    return apiRequest<any>("/profile");
  },

  /**
   * Update user profile
   * PUT /profile
   *
   * @param data - Profile data to update (name, phone, avatar)
   * @returns Updated user profile
   */
  async updateProfile(data: { name?: string; phone?: string; avatar?: string }) {
    return apiRequest<any>("/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // ==================== UTILITY FUNCTIONS ====================

  /**
   * Check if user is authenticated
   * @returns True if token exists
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await getToken();
    return !!token;
  },

  /**
   * Get current user data from cache
   * @returns User data or null
   */
  async getCurrentUser() {
    return getUserData();
  },

  /**
   * Clear all stored data
   */
  async clearAllData() {
    await removeToken();
    await removeUserData();
    await AsyncStorage.clear();
  },
};

// ==================== EXPORTED TYPES ====================

