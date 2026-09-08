import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  FlatList,
} from "react-native";
import { Feather, Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/hooks/useTheme";
import { api, getStoredUser } from "@/utils/api";
import AppFlashMessage from "@/components/CustomComponents/AppFlashMessage";
import useFlashMessage from "@/hooks/useFlashMessage";
import humanizeError from "@/utils/humanizeError";

export default function ChatRoomLayout() {
  const { t } = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { roomId = "demo-room", name, jobTitle } = useLocalSearchParams<{
    roomId?: string;
    name?: string;
    jobTitle?: string;
  }>();

  const [message, setMessage] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const flatListRef = useRef<FlatList>(null);
  const { flashMessage, showFlashMessage, hideFlashMessage } = useFlashMessage();

  useEffect(() => {
    getStoredUser().then((user) => setUserId(user?.id ?? null));
  }, []);

  useEffect(() => {
    let isMounted = true;
    const loadMessages = async () => {
      try {
        const data = await api.get<any[]>(`/api/messages/${roomId}`);
        if (isMounted && data) {
          setMessages(data.map(mapMessage));
        }
      } catch {
        /* silently fail */
      }
    };
    loadMessages();
    const interval = setInterval(() => {
      if (isMounted) loadMessages();
    }, 5000);
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, [roomId]);

  const handleSend = async () => {
    const text = message.trim();
    if (!text || sending) return;
    if (!userId) {
      showFlashMessage("Sign in required", "Please sign in before sending a message.", "warning");
      return;
    }
    setSending(true);
    setMessage("");
    try {
      const newMessageId = await api.post<string>("/api/messages", {
        room_id: roomId,
        content: text,
      });
      if (newMessageId) {
        setMessages((prev) => {
          if (prev.some((msg) => msg.id === newMessageId)) return prev;
          return [
            ...prev,
            {
              id: newMessageId,
              text,
              senderId: userId,
              createdAt: new Date().toISOString(),
            },
          ];
        });
      }
    } catch {
      setMessage(text);
      showFlashMessage("Send failed", "Unable to send message.", "error");
    }
    setSending(false);
  };

  const headerName = name ?? "Chat Partner";
  const headerJob = jobTitle ?? "Conversation";

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={0}
      style={{ flex: 1 }}
      className={`flex-1 ${t.bgPage}`}
    >
      <View
        className={`${t.bgCard} border-b ${t.border} flex-row items-center justify-between shadow-sm`}
        style={{ paddingTop: insets.top + 8, paddingBottom: 14, paddingHorizontal: 18 }}
      >
        <View className="flex-row items-center flex-1">
          <TouchableOpacity
            onPress={() => router.back()}
            className="p-2 mr-1"
            accessibilityLabel="Go back"
            accessibilityRole="button"
          >
            <Feather name="chevron-left" size={26} color={t.icon} />
          </TouchableOpacity>

          <View className="relative">
            <View className="w-10 h-10 rounded-full bg-blue-600 items-center justify-center">
              <Text className="text-white font-black text-base">
                {headerName.slice(0, 1).toUpperCase()}
              </Text>
            </View>
            <View className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white" />
          </View>

          <View className="ml-3">
            <Text className={`font-black text-sm tracking-tight ${t.text}`}>{headerName}</Text>
            <Text className={`text-[10px] font-black uppercase tracking-widest ${t.textMuted}`}>
              {jobTitle ? 'Job Chat' : 'Direct Message'}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          className={`${t.bgSurface} p-2.5 rounded-xl border ${t.border}`}
          accessibilityLabel="More options"
          accessibilityRole="button"
        >
          <Feather name="more-vertical" size={18} color={t.icon} />
        </TouchableOpacity>
      </View>

      {headerJob && headerJob !== 'Conversation' && (
        <View
          className={`${t.brandSoft} px-5 py-3 border-b ${t.border} flex-row justify-between items-center`}
        >
          <View className="flex-row items-center flex-1">
            <MaterialCommunityIcons name="hammer-wrench" size={16} color={t.accent} />
            <Text
              className={`ml-2 text-[10px] font-black uppercase tracking-widest ${t.textMuted}`}
              numberOfLines={1}
            >
              {`Job: ${headerJob}`}
            </Text>
          </View>
          <TouchableOpacity>
            <Text className={`text-[10px] font-black uppercase ${t.brand}`}>View Details</Text>
          </TouchableOpacity>
        </View>
      )}

      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingHorizontal: 18, paddingTop: 18, paddingBottom: 28, flexGrow: 1 }}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        onContentSizeChange={() => {
          if (messages.length > 0) {
            flatListRef.current?.scrollToEnd({ animated: true });
          }
        }}
        ListEmptyComponent={
          <View className="flex-1 items-center justify-center py-16">
            <View className={`w-16 h-16 rounded-[24px] ${t.brandSoft} items-center justify-center mb-4`}>
              <Ionicons name="chatbubbles-outline" size={28} color={t.accent} />
            </View>
            <Text className={`text-base font-black text-center ${t.text}`}>No messages yet</Text>
            <Text className={`mt-2 text-sm text-center leading-5 ${t.textMuted} px-8`}>
              Send a message to start the conversation.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <ChatBubble item={item} t={t} userId={userId} otherName={headerName} />
        )}
      />

      <AppFlashMessage message={flashMessage} onClose={hideFlashMessage} />

      <View
        className={`${t.bgCard} border-t ${t.border} px-4 pt-3 flex-row items-end gap-x-3`}
        style={{ paddingBottom: insets.bottom + 10 }}
      >
        <View
          className={`flex-1 flex-row items-center min-h-[48px] px-4 rounded-2xl ${t.bgSurface} border ${t.border}`}
        >
          <TextInput
            placeholder="Message..."
            placeholderTextColor={t.icon}
            multiline
            value={message}
            onChangeText={setMessage}
            textAlignVertical="top"
            className={`flex-1 py-3 text-sm font-medium ${t.text}`}
            style={{ maxHeight: 100 }}
          />
          {message.length > 0 && (
            <TouchableOpacity
              onPress={handleSend}
              disabled={sending}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              accessibilityRole="button"
              accessibilityLabel="Send message"
              className={`ml-2 w-10 h-10 rounded-full items-center justify-center shadow-sm ${t.brandBg}`}
              style={sending ? { opacity: 0.6 } : undefined}
            >
              <Ionicons name="arrow-up" size={18} color="white" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    </KeyboardAvoidingView>
  );
}

function ChatBubble({
  item,
  t,
  userId,
  otherName,
}: {
  item: ChatMessage;
  t: any;
  userId: string | null;
  otherName: string;
}) {
  const isMe = userId ? item.senderId === userId : item.senderId === "me";
  return (
    <View className={`mb-4 flex-row ${isMe ? "justify-end" : "justify-start"}`}>
      <View
        className={`max-w-[75%] px-4 py-3 rounded-[24px] shadow-sm 
        ${isMe ? "bg-blue-600 rounded-tr-none" : `${t.bgSurface} border ${t.border} rounded-tl-none`}`}
      >
        <Text
          className={`text-[10px] mb-1 font-black uppercase tracking-widest ${isMe ? "text-blue-200" : t.textMuted}`}
        >
          {isMe ? "You" : otherName}
        </Text>
        <Text className={`text-sm font-medium leading-5 ${isMe ? "text-white" : t.text}`}>
          {item.text}
        </Text>
        <Text
          className={`text-[10px] font-black uppercase mt-1 text-right ${isMe ? "text-blue-200" : t.textMuted}`}
        >
          {new Date(item.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
        </Text>
      </View>
    </View>
  );
}

type ChatMessage = {
  id: string;
  text: string;
  senderId: string;
  createdAt: string;
};

const mapMessage = (row: any): ChatMessage => ({
  id: row.id,
  text: row.content,
  senderId: row.sender_id,
  createdAt: row.created_at,
});
