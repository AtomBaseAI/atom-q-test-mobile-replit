import React, { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  withSequence,
  withDelay,
  runOnJS,
} from "react-native-reanimated";
import { useTheme } from "@/lib/useTheme";
import Colors from "@/constants/colors";

type ToastType = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  showToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  const { theme } = useTheme();
  const translateY = useSharedValue(-100);
  const opacity = useSharedValue(0);

  React.useEffect(() => {
    translateY.value = withTiming(0, { duration: 300 });
    opacity.value = withTiming(1, { duration: 300 });

    const timer = setTimeout(() => {
      opacity.value = withTiming(0, { duration: 250 });
      translateY.value = withTiming(-100, { duration: 250 }, () => {
        runOnJS(onDismiss)(toast.id);
      });
    }, 3000);

    return () => clearTimeout(timer);
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }));

  const iconMap: Record<ToastType, { name: keyof typeof Ionicons.glyphMap; color: string }> = {
    success: { name: "checkmark-circle", color: theme.success },
    error: { name: "close-circle", color: theme.error },
    info: { name: "information-circle", color: Colors.primary },
    warning: { name: "warning", color: theme.warning },
  };

  const icon = iconMap[toast.type];

  return (
    <Animated.View
      style={[
        styles.toast,
        {
          backgroundColor: theme.surface,
          borderColor: theme.cardBorder,
          borderLeftColor: icon.color,
        },
        animStyle,
      ]}
    >
      <Ionicons name={icon.name} size={20} color={icon.color} />
      <Text style={[styles.toastText, { color: theme.text }]} numberOfLines={2}>
        {toast.message}
      </Text>
      <Pressable onPress={() => onDismiss(toast.id)} hitSlop={8}>
        <Ionicons name="close" size={16} color={theme.textSecondary} />
      </Pressable>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const insets = useSafeAreaInsets();

  const showToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    setToasts((prev) => [...prev.slice(-2), { id, message, type }]);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const value = useMemo(() => ({ showToast }), [showToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <View
        style={[
          styles.container,
          { top: Platform.OS === "web" ? 67 + 8 : insets.top + 8 },
        ]}
        pointerEvents="box-none"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={dismissToast} />
        ))}
      </View>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    left: 16,
    right: 16,
    zIndex: 9999,
    gap: 8,
  },
  toast: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 4,
    borderWidth: 1,
    borderLeftWidth: 3,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  toastText: {
    flex: 1,
    fontSize: 14,
    fontFamily: "Inter_500Medium",
    lineHeight: 18,
  },
});
