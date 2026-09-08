import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
} from "react-native";
import { useRouter } from "expo-router";
import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import useAccount from "@/hooks/useAccountHooks";
import { getStoredUser } from "@/utils/api";
import humanizeError from "@/utils/humanizeError";

type AuthMode = "signIn" | "signUp";

interface AuthenticationFormProps {
  mode?: AuthMode;
  onModeChange?: (mode: AuthMode) => void;
  onSubmitted?: () => void | Promise<void>;
}

export default function AuthenticationForm({
  mode = "signIn",
  onModeChange,
  onSubmitted,
}: AuthenticationFormProps) {
  const router = useRouter();
  const { SignUpWithEmailAndPassword, SignInWithPassword, error } = useAccount();

  const [currentMode, setCurrentMode] = useState<AuthMode>(mode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [focusedField, setFocusedField] = useState<"email" | "password" | null>(null);

  useEffect(() => {
    setCurrentMode(mode);
  }, [mode]);

  const toggleMode = () => {
    const next = currentMode === "signIn" ? "signUp" : "signIn";
    setCurrentMode(next);
    onModeChange?.(next);
  };

  const handleSubmit = async () => {
    if (submitting) return;
    if (!email.trim() || !password) return;
    setSubmitting(true);

    if (currentMode === "signIn") {
      await SignInWithPassword({ email: email.trim(), password });
    } else {
      await SignUpWithEmailAndPassword({ email: email.trim(), password });
    }

    const user = await getStoredUser();
    if (!user) {
      setSubmitting(false);
      return;
    }

    if (onSubmitted) {
      await onSubmitted();
    } else {
      router.replace("/home");
    }
    setSubmitting(false);
  };

  const inputClass = (field: "email" | "password") =>
    `flex-row items-center px-4 h-14 rounded-2xl border ${
      focusedField === field
        ? "border-blue-500 bg-blue-50"
        : "border-slate-200 bg-slate-50"
    }`;

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
      className="flex-1"
    >
      <ScrollView
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ flexGrow: 1, justifyContent: "center" }}
      >
        <View className="w-full bg-white rounded-[28px] p-6 border border-slate-100 shadow-2xl shadow-slate-900/15">
          {/* Header */}
          <View className="flex-row justify-between items-center mb-1">
            <Text className="text-2xl font-black text-slate-900 tracking-tight">
              {currentMode === "signIn" ? "Welcome back" : "Create account"}
            </Text>
            <TouchableOpacity
              className="p-2 rounded-xl bg-slate-100"
              onPress={() => router.push("/(tabs)/home")}
            >
              <Feather name="x" color="#64748B" size={18} />
            </TouchableOpacity>
          </View>
          <Text className="text-sm text-slate-500 mb-6">
            {currentMode === "signIn"
              ? "Sign in to access your Kabayan community."
              : "Start earning or hiring in your community."}
          </Text>

          {/* Fields */}
          <View className="gap-y-4">
            {/* Email */}
            <View>
              <Text className="text-[10px] font-black uppercase tracking-[2px] text-slate-400 mb-1.5 ml-1">
                Email Address
              </Text>
              <View className={inputClass("email")}>
                <Feather name="mail" size={17} color={focusedField === "email" ? "#2563EB" : "#94A3B8"} />
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="name@gmail.com"
                  placeholderTextColor="#CBD5E1"
                  className="flex-1 ml-3 font-semibold text-slate-900 text-[15px]"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  autoComplete="email"
                  returnKeyType="next"
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                />
              </View>
            </View>

            {/* Password */}
            <View>
              <Text className="text-[10px] font-black uppercase tracking-[2px] text-slate-400 mb-1.5 ml-1">
                Password
              </Text>
              <View className={inputClass("password")}>
                <Feather name="lock" size={17} color={focusedField === "password" ? "#2563EB" : "#94A3B8"} />
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  placeholder="••••••••"
                  placeholderTextColor="#CBD5E1"
                  className="flex-1 ml-3 font-semibold text-slate-900 text-[15px]"
                  secureTextEntry={!showPassword}
                  autoComplete={currentMode === "signIn" ? "password" : "new-password"}
                  returnKeyType="done"
                  onSubmitEditing={handleSubmit}
                  onFocus={() => setFocusedField("password")}
                  onBlur={() => setFocusedField(null)}
                />
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} className="p-1">
                  <Feather name={showPassword ? "eye-off" : "eye"} size={16} color="#94A3B8" />
                </TouchableOpacity>
              </View>
              {currentMode === "signIn" && (
                <TouchableOpacity className="mt-2 self-end">
                  <Text className="text-blue-600 font-bold text-xs">Forgot password?</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* Submit button */}
            <TouchableOpacity
              onPress={handleSubmit}
              activeOpacity={0.88}
              disabled={submitting || !email.trim() || !password}
              className={`h-14 rounded-2xl items-center justify-center shadow-lg mt-1 ${
                submitting || !email.trim() || !password
                  ? "bg-blue-300"
                  : "bg-blue-600 shadow-blue-500/30"
              }`}
            >
              <Text className="text-white font-black uppercase text-[15px] tracking-widest">
                {submitting
                  ? "Please wait…"
                  : currentMode === "signIn"
                  ? "Sign In"
                  : "Create Account"}
              </Text>
            </TouchableOpacity>

            {/* Error */}
            {error && (
              <View className="bg-red-50 border border-red-100 px-4 py-3 rounded-2xl">
                <Text className="text-red-600 text-sm font-semibold">
                  {humanizeError(error, "Something went wrong. Please try again.")}
                </Text>
              </View>
            )}

            {/* Divider */}
            <View className="flex-row items-center">
              <View className="h-[1px] flex-1 bg-slate-100" />
              <Text className="mx-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                or continue with
              </Text>
              <View className="h-[1px] flex-1 bg-slate-100" />
            </View>

            {/* Social buttons */}
            <View className="flex-row gap-x-3">
              <TouchableOpacity
                className="flex-1 h-14 rounded-2xl border border-slate-200 items-center justify-center bg-white flex-row gap-x-2"
                activeOpacity={0.8}
                onPress={() => {
                  /* Google OAuth — wire up with supabase.auth.signInWithOAuth */
                }}
              >
                <MaterialCommunityIcons name="google" size={20} color="#EA4335" />
                <Text className="text-slate-700 font-bold text-sm">Google</Text>
              </TouchableOpacity>
              <TouchableOpacity
                className="flex-1 h-14 rounded-2xl border border-slate-200 items-center justify-center bg-white flex-row gap-x-2"
                activeOpacity={0.8}
                onPress={() => {
                  /* Apple Sign In — wire up with expo-apple-authentication */
                }}
              >
                <MaterialCommunityIcons name="apple" size={20} color="#000000" />
                <Text className="text-slate-700 font-bold text-sm">Apple</Text>
              </TouchableOpacity>
            </View>

            {/* Mode toggle */}
            <View className="flex-row justify-center">
              <Text className="text-slate-400 text-sm">
                {currentMode === "signIn" ? "New to Kabayan? " : "Already have an account? "}
              </Text>
              <Pressable onPress={toggleMode}>
                <Text className="text-blue-600 text-sm font-bold">
                  {currentMode === "signIn" ? "Create account" : "Sign in"}
                </Text>
              </Pressable>
            </View>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
