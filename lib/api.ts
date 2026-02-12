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
      message: json.message,
      error: json.error,
      details: json.details || json.data,
    });
    throw new Error(json.message || json.error || `Request failed with status ${res.status}`);
  }
  return json;
}

export const api = {
  getToken,
  setToken,
  removeToken,
  setUserData,
  getUserData,
  removeUserData,

  async login(email: string, password: string) {
    const res = await apiRequest<{ token: string; user: any }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (res.success && res.data) {
      await setToken(res.data.token);
      await setUserData(res.data.user);
    }
    return res;
  },

  async getQuizzes() {
    return apiRequest<any[]>("/quiz");
  },

  async getQuiz(id: string) {
    return apiRequest<any>(`/quiz/${id}`);
  },

  async submitQuiz(quizId: string, attemptId: string, answers: Record<string, string>) {
    const answerIds = Object.keys(answers || {});
    const sampleAnswers = Object.fromEntries(answerIds.slice(0, 3).map((id) => [id, answers[id]]));
    
    console.log("[submitQuiz] Endpoint: /quiz/" + quizId + "/submit");
    console.log("[submitQuiz] Attempt ID:", attemptId);
    console.log("[submitQuiz] Total answers:", answerIds.length);
    console.log("[submitQuiz] Sample answers:", sampleAnswers);
    console.log("[submitQuiz] First 5 question IDs:", answerIds.slice(0, 5));
    console.log("Submitting quiz:", {
      quizId,
      attemptId,
      answerCount: Object.keys(answers || {}).length,
    });
    
    const result = await apiRequest<any>(`/quiz/${quizId}/submit`, {
      method: "POST",
      body: JSON.stringify({ attemptId, answers }),
    });
    
    // Validate response
    if (!result.success) {
      throw new Error(result.message || "Server returned success=false");
    }
    
    if (!result.data) {
      throw new Error("No result data from server");
    }
    
    return result;
  },

  async getProfile() {
    return apiRequest<any>("/profile");
  },

  async updateProfile(data: { name?: string; phone?: string; avatar?: string }) {
    return apiRequest<any>("/profile", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async logout() {
    await removeToken();
    await removeUserData();
  },
};
