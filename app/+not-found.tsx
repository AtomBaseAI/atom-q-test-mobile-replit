import { Stack, router } from "expo-router";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/lib/theme-context";
import Colors from "@/constants/colors";

export default function NotFoundScreen() {
  const { theme } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <Ionicons name="alert-circle-outline" size={48} color={theme.textTertiary} />
      <Text style={[styles.title, { color: theme.text }]}>Page Not Found</Text>
      <Pressable
        style={[styles.btn, { backgroundColor: Colors.primary }]}
        onPress={() => router.replace("/")}
      >
        <Text style={styles.btnText}>Go Home</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    padding: 20,
  },
  title: {
    fontSize: 18,
    fontFamily: "Inter_600SemiBold",
  },
  btn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 4,
    marginTop: 8,
  },
  btnText: {
    color: "#fff",
    fontSize: 14,
    fontFamily: "Inter_500Medium",
  },
});
