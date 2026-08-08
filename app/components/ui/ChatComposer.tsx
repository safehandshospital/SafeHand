import { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Platform,
  StyleSheet,
  TextInput,
  View,
  type NativeSyntheticEvent,
  type TextInputContentSizeChangeEventData,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { Image } from "expo-image";
import { PressableScale } from "@/components/PressableScale";
import { AppText } from "@/components/ui/AppText";
import { useTheme } from "@/theme/ThemeProvider";
import { fonts } from "@/theme/fonts";
import { radius, space } from "@/theme/tokens";

export type ChatAttachment = {
  id: string;
  kind: "file" | "image";
  name: string;
  uri: string;
  mimeType?: string | null;
  sizeLabel?: string | null;
};

type Props = {
  value: string;
  onChangeText: (text: string) => void;
  onSend: (payload: { text: string; attachments: ChatAttachment[] }) => void;
  loading?: boolean;
  placeholder?: string;
  attachments: ChatAttachment[];
  onAttachmentsChange: (next: ChatAttachment[]) => void;
};

const MIN_INPUT_HEIGHT = 24;
const MAX_INPUT_HEIGHT = 140;

function formatBytes(bytes?: number | null): string | null {
  if (!bytes || bytes <= 0) return null;
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Chat composer with attachments, auto-growing field, and send control. */
export function ChatComposer({
  value,
  onChangeText,
  onSend,
  loading = false,
  placeholder = "Ask the assistant...",
  attachments,
  onAttachmentsChange,
}: Props) {
  const { colors } = useTheme();
  const [inputHeight, setInputHeight] = useState(MIN_INPUT_HEIGHT);
  const [pickerError, setPickerError] = useState<string | null>(null);

  const canSend = useMemo(
    () => Boolean(value.trim() || attachments.length) && !loading,
    [value, attachments.length, loading],
  );

  const onContentSizeChange = (
    e: NativeSyntheticEvent<TextInputContentSizeChangeEventData>,
  ) => {
    const next = Math.ceil(e.nativeEvent.contentSize.height);
    setInputHeight(Math.min(MAX_INPUT_HEIGHT, Math.max(MIN_INPUT_HEIGHT, next)));
  };

  const removeAttachment = (id: string) => {
    onAttachmentsChange(attachments.filter((a) => a.id !== id));
  };

  const addFiles = async () => {
    setPickerError(null);
    try {
      const result = await DocumentPicker.getDocumentAsync({
        multiple: true,
        copyToCacheDirectory: true,
        type: "*/*",
      });
      if (result.canceled) return;
      const next = result.assets.map((asset, index) => ({
        id: `file-${Date.now()}-${index}`,
        kind: "file" as const,
        name: asset.name || "Attachment",
        uri: asset.uri,
        mimeType: asset.mimeType,
        sizeLabel: formatBytes(asset.size),
      }));
      onAttachmentsChange([...attachments, ...next].slice(0, 6));
    } catch {
      setPickerError("Could not add files.");
    }
  };

  const addImages = async () => {
    setPickerError(null);
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setPickerError("Photo library permission is required.");
        return;
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsMultipleSelection: true,
        quality: 0.85,
        selectionLimit: 4,
      });
      if (result.canceled) return;
      const next = result.assets.map((asset, index) => ({
        id: `image-${Date.now()}-${index}`,
        kind: "image" as const,
        name: asset.fileName || `Image ${index + 1}`,
        uri: asset.uri,
        mimeType: asset.mimeType,
        sizeLabel: formatBytes(asset.fileSize),
      }));
      onAttachmentsChange([...attachments, ...next].slice(0, 6));
    } catch {
      setPickerError("Could not add images.");
    }
  };

  const submit = () => {
    if (!canSend) return;
    onSend({ text: value.trim(), attachments });
    setInputHeight(MIN_INPUT_HEIGHT);
  };

  return (
    <View
      style={[
        styles.shell,
        {
          backgroundColor: colors.surface,
          borderColor: colors.hairline,
        },
      ]}
    >
      {attachments.length > 0 ? (
        <View style={styles.attachRow}>
          {attachments.map((item) => (
            <View
              key={item.id}
              style={[
                styles.attachChip,
                {
                  backgroundColor: colors.surfaceRaised,
                  borderColor: colors.hairline,
                },
              ]}
            >
              {item.kind === "image" ? (
                <Image
                  source={{ uri: item.uri }}
                  style={styles.thumb}
                  contentFit="cover"
                />
              ) : (
                <View
                  style={[
                    styles.fileIcon,
                    { backgroundColor: colors.canvasMid },
                  ]}
                >
                  <Ionicons
                    name="document-outline"
                    size={16}
                    color={colors.inkMuted}
                  />
                </View>
              )}
              <View style={{ flex: 1, minWidth: 0, gap: 1 }}>
                <AppText variant="caption" numberOfLines={1}>
                  {item.name}
                </AppText>
                <AppText variant="label" tone="tertiary" numberOfLines={1}>
                  {item.kind === "image" ? "Image" : "File"}
                  {item.sizeLabel ? ` · ${item.sizeLabel}` : ""}
                </AppText>
              </View>
              <PressableScale
                onPress={() => removeAttachment(item.id)}
                accessibilityLabel={`Remove ${item.name}`}
              >
                <Ionicons name="close" size={16} color={colors.inkMuted} />
              </PressableScale>
            </View>
          ))}
        </View>
      ) : null}

      <View style={styles.composerRow}>
        <View style={styles.tools}>
          <PressableScale
            onPress={addFiles}
            accessibilityLabel="Add files"
            style={[
              styles.toolBtn,
              {
                borderColor: colors.hairline,
                backgroundColor: colors.surfaceRaised,
              },
            ]}
          >
            <Ionicons name="attach-outline" size={20} color={colors.inkMuted} />
          </PressableScale>
          <PressableScale
            onPress={addImages}
            accessibilityLabel="Add images"
            style={[
              styles.toolBtn,
              {
                borderColor: colors.hairline,
                backgroundColor: colors.surfaceRaised,
              },
            ]}
          >
            <Ionicons name="image-outline" size={20} color={colors.inkMuted} />
          </PressableScale>
        </View>

        <View
          style={[
            styles.fieldWrap,
            {
              borderColor: colors.hairline,
              backgroundColor: colors.surfaceRaised,
            },
          ]}
        >
          <TextInput
            value={value}
            onChangeText={onChangeText}
            placeholder={placeholder}
            placeholderTextColor={colors.inkFaint}
            multiline
            onContentSizeChange={onContentSizeChange}
            style={[
              styles.input,
              {
                color: colors.ink,
                height: Math.max(MIN_INPUT_HEIGHT, inputHeight),
                maxHeight: MAX_INPUT_HEIGHT,
                fontFamily: fonts.ui.regular,
              },
            ]}
            textAlignVertical="top"
            blurOnSubmit={false}
            onSubmitEditing={() => {
              if (Platform.OS === "web" && canSend) submit();
            }}
          />
        </View>

        <PressableScale
          onPress={submit}
          disabled={!canSend}
          accessibilityLabel="Send message"
          style={[
            styles.sendBtn,
            {
              backgroundColor: canSend ? colors.ink : colors.surfaceRaised,
              borderColor: colors.hairline,
              opacity: canSend ? 1 : 0.55,
            },
          ]}
        >
          {loading ? (
            <ActivityIndicator color={canSend ? colors.inkInverse : colors.inkMuted} />
          ) : (
            <Ionicons
              name="arrow-up"
              size={20}
              color={canSend ? colors.inkInverse : colors.inkMuted}
            />
          )}
        </PressableScale>
      </View>

      {pickerError ? (
        <AppText variant="caption" tone="danger">
          {pickerError}
        </AppText>
      ) : (
        <AppText variant="caption" tone="tertiary">
          Files or images optional. Enter sends on web.
        </AppText>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    gap: space[3],
    padding: space[3],
    borderRadius: radius.xl,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
  attachRow: {
    gap: space[2],
  },
  attachChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
    padding: space[2],
    borderRadius: radius.md,
    borderCurve: "continuous",
    borderWidth: StyleSheet.hairlineWidth,
  },
  thumb: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
  },
  fileIcon: {
    width: 36,
    height: 36,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  composerRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: space[2],
  },
  tools: {
    flexDirection: "row",
    gap: space[2],
    paddingBottom: 2,
  },
  toolBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  fieldWrap: {
    flex: 1,
    minWidth: 0,
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: radius.lg,
    borderCurve: "continuous",
    paddingHorizontal: space[3],
    paddingVertical: Platform.OS === "web" ? space[2] : space[2],
    justifyContent: "center",
  },
  input: {
    fontSize: 15,
    lineHeight: 22,
    padding: 0,
    margin: 0,
    outlineStyle: "none" as unknown as undefined,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
});
