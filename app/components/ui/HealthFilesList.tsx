import { Linking, Pressable, StyleSheet, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { AppText } from "@/components/ui/AppText";
import { Surface } from "@/components/ui/Surface";
import { useTheme } from "@/theme/ThemeProvider";
import { space } from "@/theme/tokens";

export type HealthFileItem = {
  id: string;
  name: string;
  kind: string;
  sizeLabel?: string | null;
  note?: string | null;
  url?: string | null;
};

function iconForKind(kind: string): keyof typeof Ionicons.glyphMap {
  switch (kind) {
    case "SCAN":
      return "scan-outline";
    case "LAB":
      return "flask-outline";
    case "REPORT":
      return "document-text-outline";
    case "IMAGE":
      return "image-outline";
    default:
      return "attach-outline";
  }
}

type Props = {
  files: HealthFileItem[];
};

export function HealthFilesList({ files }: Props) {
  const { colors } = useTheme();

  if (!files.length) {
    return (
      <Surface outlined>
        <AppText variant="caption" tone="secondary">
          No files attached.
        </AppText>
      </Surface>
    );
  }

  return (
    <View style={{ gap: space[2] }}>
      {files.map((file) => (
        <Pressable
          key={file.id}
          onPress={() => {
            if (file.url) void Linking.openURL(file.url);
          }}
        >
          <Surface outlined style={styles.row}>
            <Ionicons
              name={iconForKind(file.kind)}
              size={18}
              color={colors.inkMuted}
              style={styles.icon}
            />
            <View style={{ flex: 1, gap: 2, minWidth: 0 }}>
              <AppText variant="body" numberOfLines={1}>
                {file.name}
              </AppText>
              <AppText variant="caption" tone="secondary" numberOfLines={1}>
                {file.kind}
                {file.sizeLabel ? ` · ${file.sizeLabel}` : ""}
                {file.note ? ` · ${file.note}` : ""}
              </AppText>
            </View>
            <Ionicons
              name="open-outline"
              size={16}
              color={colors.inkMuted}
            />
          </Surface>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: space[3],
  },
  icon: {
    flexShrink: 0,
  },
});
