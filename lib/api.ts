import { fetch } from "expo/fetch";
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

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json.message || `Request failed with status ${res.status}`);
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
    return apiRequest<any>(`/quiz/${quizId}/submit`, {
      method: "POST",
      body: JSON.stringify({ attemptId, answers }),
    });
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
