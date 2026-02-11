import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Platform } from "react-native";
import { router } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSequence,
  withDelay,
  Easing,
} from "react-native-reanimated";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import Colors from "@/constants/colors";

export default function SplashIndex() {
  const { isLoading, isAuthenticated } = useAuth();
  const { theme } = useTheme();
  const scale = useSharedValue(0.5);
  const opacity = useSharedValue(0);
  const glowOpacity = useSharedValue(0);
  const hasNavigated = useRef(false);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 600, easing: Easing.out(Easing.cubic) });
    scale.value = withSequence(
      withTiming(1.1, { duration: 500, easing: Easing.out(Easing.cubic) }),
      withTiming(1, { duration: 300, easing: Easing.inOut(Easing.cubic) })
    );
    glowOpacity.value = withDelay(
      300,
      withSequence(
        withTiming(0.6, { duration: 600 }),
        withTiming(0.3, { duration: 400 })
      )
    );
  }, []);

  useEffect(() => {
    if (!isLoading && !hasNavigated.current) {
      hasNavigated.current = true;
      const timer = setTimeout(() => {
        if (isAuthenticated) {
          router.replace("/home");
        } else {
          router.replace("/login");
        }
      }, 1200);
      return () => clearTimeout(timer);
    }
  }, [isLoading, isAuthenticated]);

  const logoStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const glowStyle = useAnimatedStyle(() => ({
    opacity: glowOpacity.value,
  }));

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Animated.View style={[styles.glowCircle, glowStyle]} />
      <Animated.View style={logoStyle}>
        <View style={styles.logoContainer}>
          <View style={[styles.logoPiece, styles.logoLeft, { backgroundColor: Colors.primary }]} />
          <View style={[styles.logoPiece, styles.logoRight, { backgroundColor: Colors.accent }]} />
          <View style={[styles.logoDot, { backgroundColor: Colors.primaryDark }]} />
        </View>
      </Animated.View>
      <Animated.Text
        style={[
          styles.title,
          { color: theme.text, opacity },
        ]}
      >
        AtomQ
      </Animated.Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  glowCircle: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: Colors.primary,
  },
  logoContainer: {
    width: 80,
    height: 80,
    justifyContent: "center",
    alignItems: "center",
  },
  logoPiece: {
    position: "absolute",
    width: 50,
    height: 50,
    borderRadius: 4,
  },
  logoLeft: {
    left: 5,
    top: 5,
    transform: [{ rotate: "15deg" }],
  },
  logoRight: {
    right: 5,
    bottom: 5,
    transform: [{ rotate: "-15deg" }],
  },
  logoDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
  },
  title: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
    marginTop: 20,
    letterSpacing: 2,
  },
});
