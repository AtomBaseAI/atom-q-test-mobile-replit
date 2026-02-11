import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Alert,
  Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { useToast } from "@/lib/toast-context";
import { api } from "@/lib/api";
import Colors from "@/constants/colors";

export default function ProfileScreen() {
  const { user, setUser, logout } = useAuth();
  const { theme } = useTheme();
  const { showToast } = useToast();
  const insets = useSafeAreaInsets();

  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(user?.name || "");
  const [phone, setPhone] = useState(user?.phone || "");

  useEffect(() => {
    if (user) {
      setName(user.name || "");
      setPhone(user.phone || "");
    }
  }, [user]);

  async function handleSave() {
    setLoading(true);
    try {
      const res = await api.updateProfile({ name: name.trim(), phone: phone.trim() });
      if (res.success && res.data) {
        setUser(res.data);
        await api.setUserData(res.data);
        showToast("Profile updated", "success");
        setEditing(false);
      }
    } catch (err: any) {
      showToast(err.message || "Update failed", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleLogout() {
    Alert.alert("Logout", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Logout",
        style: "destructive",
        onPress: async () => {
          await logout();
          router.replace("/login");
        },
      },
    ]);
  }

  function getInitials() {
    if (!user?.name) return "?";
    return user.name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View
        style={[
          styles.topBar,
          {
            paddingTop: Platform.OS === "web" ? 67 + 8 : insets.top + 8,
            backgroundColor: theme.surface,
            borderBottomColor: theme.cardBorder,
          },
        ]}
      >
        <Pressable onPress={() => router.back()} hitSlop={12}>
          <Ionicons name="arrow-back" size={22} color={theme.text} />
        </Pressable>
        <Text style={[styles.topBarTitle, { color: theme.text }]}>Profile</Text>
        {!editing ? (
          <Pressable onPress={() => setEditing(true)} hitSlop={12}>
            <Feather name="edit-2" size={18} color={Colors.primary} />
          </Pressable>
        ) : (
          <Pressable
            onPress={() => {
              setEditing(false);
              setName(user?.name || "");
              setPhone(user?.phone || "");
            }}
            hitSlop={12}
          >
            <Ionicons name="close" size={22} color={theme.textSecondary} />
          </Pressable>
        )}
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: Platform.OS === "web" ? 34 + 20 : insets.bottom + 20 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <Animated.View entering={FadeInDown.duration(400)} style={styles.avatarSection}>
          <View style={[styles.avatar, { backgroundColor: Colors.primary + "20" }]}>
            <Text style={[styles.avatarText, { color: Colors.primary }]}>{getInitials()}</Text>
          </View>
          {!editing && (
            <>
              <Text style={[styles.userName, { color: theme.text }]}>
                {user?.name || "No Name"}
              </Text>
              <Text style={[styles.userEmail, { color: theme.textSecondary }]}>
                {user?.email}
              </Text>
            </>
          )}
        </Animated.View>

        {editing ? (
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.editForm}>
            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Name</Text>
              <View
                style={[
                  styles.fieldInput,
                  { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
                ]}
              >
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  value={name}
                  onChangeText={setName}
                  placeholder="Your name"
                  placeholderTextColor={theme.textTertiary}
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Phone</Text>
              <View
                style={[
                  styles.fieldInput,
                  { backgroundColor: theme.inputBg, borderColor: theme.inputBorder },
                ]}
              >
                <TextInput
                  style={[styles.textInput, { color: theme.text }]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Phone number"
                  placeholderTextColor={theme.textTertiary}
                  keyboardType="phone-pad"
                />
              </View>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={[styles.fieldLabel, { color: theme.textSecondary }]}>Email</Text>
              <View
                style={[
                  styles.fieldInput,
                  {
                    backgroundColor: theme.inputBg,
                    borderColor: theme.inputBorder,
                    opacity: 0.6,
                  },
                ]}
              >
                <Text style={[styles.textInput, { color: theme.textSecondary }]}>
                  {user?.email}
                </Text>
              </View>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.saveBtn,
                {
                  backgroundColor: Colors.primary,
                  opacity: loading ? 0.6 : pressed ? 0.85 : 1,
                },
              ]}
              onPress={handleSave}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" size="small" />
              ) : (
                <Text style={styles.saveBtnText}>Save Changes</Text>
              )}
            </Pressable>
          </Animated.View>
        ) : (
          <Animated.View entering={FadeInDown.delay(100).duration(400)} style={styles.infoSection}>
            <View style={[styles.infoCard, { backgroundColor: theme.card, borderColor: theme.cardBorder }]}>
              <InfoRow icon="person-outline" label="Name" value={user?.name || "—"} theme={theme} />
              <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />
              <InfoRow icon="mail-outline" label="Email" value={user?.email || "—"} theme={theme} />
              <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />
              <InfoRow icon="call-outline" label="Phone" value={user?.phone || "—"} theme={theme} />
              <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />
              <InfoRow icon="id-card-outline" label="UOID" value={user?.uoid || "—"} theme={theme} />
              <View style={[styles.divider, { backgroundColor: theme.cardBorder }]} />
              <InfoRow icon="school-outline" label="Section" value={user?.section || "—"} theme={theme} />
            </View>
          </Animated.View>
        )}

        <Animated.View entering={FadeInDown.delay(300).duration(400)} style={{ marginTop: 24 }}>
          <Pressable
            style={({ pressed }) => [
              styles.logoutBtn,
              {
                backgroundColor: theme.error + "10",
                borderColor: theme.error + "30",
                opacity: pressed ? 0.85 : 1,
              },
            ]}
            onPress={handleLogout}
          >
            <Ionicons name="log-out-outline" size={18} color={theme.error} />
            <Text style={[styles.logoutText, { color: theme.error }]}>Sign Out</Text>
          </Pressable>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

function InfoRow({
  icon,
  label,
  value,
  theme,
}: {
  icon: string;
  label: string;
  value: string;
  theme: any;
}) {
  return (
    <View style={styles.infoRow}>
      <View style={styles.infoRowLeft}>
        <Ionicons name={icon as any} size={18} color={theme.textTertiary} />
        <Text style={[styles.infoLabel, { color: theme.textTertiary }]}>{label}</Text>
      </View>
      <Text style={[styles.infoValue, { color: theme.text }]} numberOfLines={1}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
  },
  topBarTitle: {
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  scrollContent: {
    padding: 20,
  },
  avatarSection: {
    alignItems: "center",
    marginBottom: 24,
    gap: 8,
  },
  avatar: {
    width: 76,
    height: 76,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    fontSize: 28,
    fontFamily: "Inter_700Bold",
  },
  userName: {
    fontSize: 20,
    fontFamily: "Inter_600SemiBold",
  },
  userEmail: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
  },
  infoSection: {},
  infoCard: {
    borderWidth: 1,
    borderRadius: 4,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  infoRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  infoLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
  },
  infoValue: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    maxWidth: "55%",
    textAlign: "right",
  },
  divider: {
    height: 1,
    marginHorizontal: 16,
  },
  editForm: {
    gap: 18,
  },
  fieldGroup: {
    gap: 6,
  },
  fieldLabel: {
    fontSize: 13,
    fontFamily: "Inter_500Medium",
    marginLeft: 2,
  },
  fieldInput: {
    borderWidth: 1,
    borderRadius: 4,
    paddingHorizontal: 14,
    height: 48,
    justifyContent: "center",
  },
  textInput: {
    fontSize: 15,
    fontFamily: "Inter_400Regular",
  },
  saveBtn: {
    height: 50,
    borderRadius: 4,
    justifyContent: "center",
    alignItems: "center",
    marginTop: 8,
  },
  saveBtnText: {
    color: "#fff",
    fontSize: 16,
    fontFamily: "Inter_600SemiBold",
  },
  logoutBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    height: 48,
    borderRadius: 4,
    borderWidth: 1,
    gap: 8,
  },
  logoutText: {
    fontSize: 15,
    fontFamily: "Inter_500Medium",
  },
});
