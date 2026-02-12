import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

const BASE_URL = "https://atom-q-beta-v12-demo-gani.vercel.app/api/mobile";

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
): Promise<{ success: boolean; message?: string; data?: T }> {
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
      
      // Return error response instead of throwing
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

export const api = {
  getToken,
  setToken,
  removeToken,
  setUserData,
  getUserData,
  removeUserData,

  // ============= AUTHENTICATION =============
  async login(email: string, password: string) {
    return apiRequest<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
  },

  async logout() {
    await removeToken();
    await removeUserData();
  },

  // ============= QUIZ MANAGEMENT =============
  
  /**
   * Get all quizzes assigned to the user
   * GET /api/mobile/quiz
   */
  async getQuizzes() {
    return apiRequest<any[]>("/quiz");
  },

  /**
   * Get quiz details and create/resume an attempt
   * GET /api/mobile/quiz/:id
   */
  async getQuiz(id: string) {
    return apiRequest<any>(`/quiz/${id}`);
  },

  /**
   * Save quiz answers without submitting
   * POST /api/mobile/quiz/:id/save
   */
  async saveQuizAnswers(quizId: string, attemptId: string, answers: Record<string, string>) {
    return apiRequest<any>(`/quiz/${quizId}/save`, {
      method: "POST",
      body: JSON.stringify({ attemptId, answers }),
    });
  },

  /**
   * Submit quiz for grading
   * POST /api/mobile/quiz/:id/submit
   */
  async submitQuiz(quizId: string, attemptId: string, answers: Record<string, string>) {
    return apiRequest<any>(`/quiz/${quizId}/submit`, {
      method: "POST",
      body: JSON.stringify({ attemptId, answers }),
    });
  },

  /**
   * Get detailed quiz results for a specific attempt
   * GET /api/mobile/quiz/:id/result?attemptId={attemptId}
   */
  async getQuizResult(quizId: string, attemptId: string) {
    return apiRequest<any>(`/quiz/${quizId}/result?attemptId=${attemptId}`);
  },

  /**
   * Get complete attempt history for a specific quiz
   * GET /api/mobile/quiz/:id/history
   */
  async getQuizHistory(quizId: string) {
    return apiRequest<any>(`/quiz/${quizId}/history`);
  },

  // ============= PROFILE MANAGEMENT =============
  
  /**
   * Get user profile with statistics and recent activity
   * GET /api/mobile/profile
   */
  async getProfile() {
    return apiRequest<any>("/profile");
  },

  /**
   * Update user profile
   * PUT /api/mobile/profile
   */
  async updateProfile(data: { name?: string; phone?: string; avatar?: string }) {
    return apiRequest<any>("/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  // ============= UTILITY FUNCTIONS =============
  
  /**
   * Check if user is authenticated
   */
  async isAuthenticated(): Promise<boolean> {
    const token = await getToken();
    return !!token;
  },

  /**
   * Get current user data from cache
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