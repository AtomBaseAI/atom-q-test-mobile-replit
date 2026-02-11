import React, { useState, useRef } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Keyboard,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  FadeIn,
} from "react-native-reanimated";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useToast } from "@/lib/toast-context";
import Colors from "@/constants/colors";

export default function LoginScreen() {
  const { login } = useAuth();
  const { theme, isDark } = useTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailFocused, setEmailFocused] = useState(false);
  const [passFocused, setPassFocused] = useState(false);
  const passwordRef = useRef<TextInput>(null);

  const headerOpacity = useSharedValue(0);
  const formOpacity = useSharedValue(0);

  React.useEffect(() => {
    headerOpacity.value = withTiming(1, { duration: 500 });
    formOpacity.value = withDelay(200, withTiming(1, { duration: 500 }));
  }, []);

  const headerAnim = useAnimatedStyle(() => ({ opacity: headerOpacity.value }));
  const formAnim = useAnimatedStyle(() => ({ opacity: formOpacity.value }));

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
      showToast("Please enter both email and password", "warning");
      return;
    }
    Keyboard.dismiss();
    setLoading(true);
    try {
      await login(email.trim(), password);
      showToast("Login successful!", "success");
      router.replace("/home");
    } catch (err: any) {
      showToast(err?.message || "Login failed", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <KeyboardAwareScrollViewCompat
        style={{ flex: 1 }}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingTop: Platform.OS === "web" ? 67 + 40 : insets.top + 40,
            paddingBottom: Platform.OS === "web" ? 34 + 20 : insets.bottom + 20,
          },
        ]}
        bottomOffset={80}
      >
        <Animated.View style={[styles.header, headerAnim]}>
          <View style={styles.logoContainer}>
            <View style={[styles.logoPiece, styles.logoLeft, { backgroundColor: Colors.primary }]} />
            <View style={[styles.logoPiece, styles.logoRight, { backgroundColor: Colors.accent }]} />
            <View style={[styles.logoDot, { backgroundColor: Colors.primaryDark }]} />
          </View>
          <Text style={[styles.appTitle, { color: theme.text }]}>AtomQ</Text>
          <Text style={[styles.subtitle, { color: theme.textSecondary }]}>
            Sign in to continue
          </Text>
        </Animated.View>

        <Animated.View style={[styles.form, formAnim]}>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Email</Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: emailFocused ? Colors.primary : theme.inputBorder,
                },
              ]}
            >
              <Ionicons
                name="mail-outline"
                size={18}
                color={emailFocused ? Colors.primary : theme.textTertiary}
              />
              <TextInput
                style={[styles.input, { color: theme.text }]}
                placeholder="Enter your email"
                placeholderTextColor={theme.textTertiary}
                value={email}
                onChangeText={setEmail}
                autoCapitalize="none"
                keyboardType="email-address"
                returnKeyType="next"
                onSubmitEditing={() => passwordRef.current?.focus()}
                onFocus={() => setEmailFocused(true)}
                onBlur={() => setEmailFocused(false)}
                testID="email-input"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: theme.textSecondary }]}>Password</Text>
            <View
              style={[
                styles.inputContainer,
                {
                  backgroundColor: theme.inputBg,
                  borderColor: passFocused ? Colors.primary : theme.inputBorder,
                },
              ]}
            >
              <Ionicons
                name="lock-closed-outline"
                size={18}
                color={passFocused ? Colors.primary : theme.textTertiary}
              />
              <TextInput
                ref={passwordRef}
                style={[styles.input, { color: theme.text }]}
                placeholder="Enter your password"
                placeholderTextColor={theme.textTertiary}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                returnKeyType="go"
                onSubmitEditing={handleLogin}
                onFocus={() => setPassFocused(true)}
                onBlur={() => setPassFocused(false)}
                testID="password-input"
              />
              <Pressable onPress={() => setShowPassword(!showPassword)} hitSlop={8}>
                <Ionicons
                  name={showPassword ? "eye-off-outline" : "eye-outline"}
                  size={18}
                  color={theme.textTertiary}
                />
              </Pressable>
            </View>
          </View>

          <Pressable
            style={({ pressed }) => [
              styles.loginButton,
              {
                backgroundColor: Colors.primary,
                opacity: pressed ? 0.85 : loading ? 0.7 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
            onPress={handleLogin}
            disabled={loading}
            testID="login-button"
          >
            {loading ? (
              <ActivityIndicator color="#FAFAFA" size="small" />
            ) : (
              <Text style={styles.loginButtonText}>Sign In</Text>
            )}
          </Pressable>

          <View style={styles.hintContainer}>
            <Ionicons name="information-circle-outline" size={14} color={theme.textTertiary} />
            <Text style={[styles.hintText, { color: theme.textTertiary }]}>
              Use your organization credentials
            </Text>
          </View>
        </Animated.View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 24,
    justifyContent: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 48,
  },
  logoContainer: {
    width: 64,
    height: 64,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  logoPiece: {
    position: "absolute",
    width: 40,
    height: 40,
    borderRadius: 4,
  },
  logoLeft: {
    left: 3,
    top: 3,
    transform: [{ rotate: "15deg" }],
  },
  logoRight: {
    right: 3,
    bottom: 3,
    transform: [{ rotate: "-15deg" }],
  },
  logoDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  appTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    letterSpacing: 2,
  },
  subtitle: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    marginTop: 6,
  },
  form: {
    gap: 20,
  },
  inputGroup: {
    gap: 6,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 14,
    height: 50,
    gap: 10,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Inter_400Regular",
    height: "100%",
  },
  loginButton: {
    height: 50,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  loginButtonText: {
    color: "#FAFAFA",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  hintContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: 4,
  },
  hintText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
  },
});
