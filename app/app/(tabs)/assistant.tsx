import { useEffect, useRef, useState } from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { Image } from "expo-image";
import { Ionicons } from "@expo/vector-icons";
import { Screen } from "@/components/ui/Screen";
import { AppText } from "@/components/ui/AppText";
import { Surface } from "@/components/ui/Surface";
import { ClinicCover } from "@/components/ui/ClinicCover";
import {
  ChatComposer,
  type ChatAttachment,
} from "@/components/ui/ChatComposer";
import { api } from "@/lib/api";
import { useTheme } from "@/theme/ThemeProvider";
import { useBreakpoint } from "@/hooks/useBreakpoint";
import { useRailContent } from "@/features/layout/RailContext";
import { radius, space } from "@/theme/tokens";

type Msg = {
  id: string;
  role: "user" | "assistant";
  text: string;
  attachments?: ChatAttachment[];
};

function Bubble({
  msg,
  wide,
}: {
  msg: Msg;
  wide: boolean;
}) {
  const { colors } = useTheme();
  const isUser = msg.role === "user";

  return (
    <View
      style={[
        styles.bubbleWrap,
        {
          alignSelf: isUser ? "flex-end" : "flex-start",
          maxWidth: wide ? "78%" : "92%",
        },
      ]}
    >
      <AppText variant="label" tone="tertiary" style={styles.role}>
        {isUser ? "You" : "Assistant"}
      </AppText>
      <Surface
        outlined={!isUser}
        style={[
          styles.bubble,
          {
            backgroundColor: isUser ? colors.surfaceRaised : colors.surface,
            borderColor: colors.hairline,
          },
        ]}
      >
        {msg.attachments && msg.attachments.length > 0 ? (
          <View style={styles.msgAttach}>
            {msg.attachments.map((item) =>
              item.kind === "image" ? (
                <Image
                  key={item.id}
                  source={{ uri: item.uri }}
                  style={styles.msgImage}
                  contentFit="cover"
                />
              ) : (
                <View
                  key={item.id}
                  style={[
                    styles.msgFile,
                    {
                      borderColor: colors.hairline,
                      backgroundColor: colors.canvasMid,
                    },
                  ]}
                >
                  <Ionicons
                    name="document-outline"
                    size={14}
                    color={colors.inkMuted}
                  />
                  <AppText variant="caption" tone="secondary" numberOfLines={1}>
                    {item.name}
                  </AppText>
                </View>
              ),
            )}
          </View>
        ) : null}
        {msg.text ? <AppText variant="body">{msg.text}</AppText> : null}
      </Surface>
    </View>
  );
}

export default function AssistantScreen() {
  const { colors } = useTheme();
  const { isWide } = useBreakpoint();
  const scrollRef = useRef<ScrollView>(null);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<ChatAttachment[]>([]);
  const [messages, setMessages] = useState<Msg[]>([
    {
      id: "welcome",
      role: "assistant",
      text: "Ask about quieter times, departments, or booking. You can attach files or images.",
    },
  ]);
  const [loading, setLoading] = useState(false);

  useRailContent(
    isWide ? (
      <View style={{ gap: space[4] }}>
        <ClinicCover
          name="Care campus"
          subtitle="Quieter clinics and peak hours"
          height={150}
        />
        <AppText variant="h2">Tips</AppText>
        <AppText variant="body" tone="secondary">
          Mid-week afternoons are often quieter. Ask for a department and time
          before you book.
        </AppText>
        <AppText variant="caption" tone="tertiary">
          Attachments stay in this session only.
        </AppText>
      </View>
    ) : null,
    [isWide],
    "Assistant context",
  );

  useEffect(() => {
    const id = requestAnimationFrame(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    });
    return () => cancelAnimationFrame(id);
  }, [messages, loading]);

  const send = async ({
    text,
    attachments: pending,
  }: {
    text: string;
    attachments: ChatAttachment[];
  }) => {
    if (!text && pending.length === 0) return;

    const attachmentNote =
      pending.length > 0
        ? `\n\n[Attached ${pending.length} item${pending.length === 1 ? "" : "s"}: ${pending
            .map((a) => a.name)
            .join(", ")}]`
        : "";

    setInput("");
    setAttachments([]);
    setMessages((m) => [
      ...m,
      {
        id: `user-${Date.now()}`,
        role: "user",
        text: text || "Shared attachments.",
        attachments: pending,
      },
    ]);
    setLoading(true);
    try {
      const history = messages
        .filter((m) => m.id !== "welcome")
        .slice(-8)
        .map((m) => ({ role: m.role, text: m.text }));
      const res = await api.assistant({
        message: `${text}${attachmentNote}`.trim(),
        history,
      });
      setMessages((m) => [
        ...m,
        {
          id: `assistant-${Date.now()}`,
          role: "assistant",
          text: res.reply,
        },
      ]);
    } catch (e) {
      setMessages((m) => [
        ...m,
        {
          id: `error-${Date.now()}`,
          role: "assistant",
          text: e instanceof Error ? e.message : "Something went wrong",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen
      scroll={false}
      tabBarClearance
      topExtra={space[3]}
      bottomExtra={space[3]}
      contentStyle={styles.screenContent}
      header={
        <View style={{ gap: space[1] }}>
          <AppText variant="h1">AI assistant</AppText>
          <AppText variant="body" tone="secondary">
            Ask about quieter booking times.
          </AppText>
        </View>
      }
    >
      <View style={styles.session}>
        <ScrollView
          ref={scrollRef}
          style={styles.thread}
          contentContainerStyle={styles.threadContent}
          showsVerticalScrollIndicator={isWide}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg) => (
            <Bubble key={msg.id} msg={msg} wide={isWide} />
          ))}
          {loading ? (
            <View style={[styles.bubbleWrap, { alignSelf: "flex-start" }]}>
              <AppText variant="label" tone="tertiary" style={styles.role}>
                Assistant
              </AppText>
              <Surface
                outlined
                style={[styles.bubble, { borderColor: colors.hairline }]}
              >
                <AppText variant="caption" tone="secondary">
                  Thinking…
                </AppText>
              </Surface>
            </View>
          ) : null}
        </ScrollView>

        <ChatComposer
          value={input}
          onChangeText={setInput}
          attachments={attachments}
          onAttachmentsChange={setAttachments}
          loading={loading}
          onSend={send}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  screenContent: {
    flex: 1,
    gap: space[3],
    paddingTop: space[2],
    minHeight: 0,
  },
  session: {
    flex: 1,
    minHeight: 0,
    gap: space[3],
  },
  thread: {
    flex: 1,
    minHeight: 0,
  },
  threadContent: {
    gap: space[3],
    paddingBottom: space[2],
    flexGrow: 1,
    justifyContent: "flex-end",
  },
  bubbleWrap: {
    gap: space[1],
  },
  role: {
    paddingHorizontal: space[1],
  },
  bubble: {
    gap: space[3],
  },
  msgAttach: {
    gap: space[2],
  },
  msgImage: {
    width: "100%",
    height: 140,
    borderRadius: radius.md,
  },
  msgFile: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[2],
    paddingHorizontal: space[3],
    paddingVertical: space[2],
    borderRadius: radius.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
});
