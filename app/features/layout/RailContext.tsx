import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ScrollView, StyleSheet, View } from "react-native";
import { useIsFocused } from "expo-router";
import { AppText } from "@/components/ui/AppText";
import { space } from "@/theme/tokens";

type RailState = {
  title?: string;
  content: ReactNode | null;
};

type RailActions = {
  setRail: (next: RailState) => void;
  clearRail: () => void;
};

const RailStateContext = createContext<RailState>({ content: null });
const RailActionsContext = createContext<RailActions | null>(null);

export function RailProvider({ children }: { children: ReactNode }) {
  const [rail, setRailState] = useState<RailState>({ content: null });

  const setRail = useCallback((next: RailState) => {
    setRailState(next);
  }, []);

  const clearRail = useCallback(() => {
    setRailState({ content: null });
  }, []);

  const actions = useMemo(
    () => ({ setRail, clearRail }),
    [setRail, clearRail],
  );

  return (
    <RailActionsContext.Provider value={actions}>
      <RailStateContext.Provider value={rail}>
        {children}
      </RailStateContext.Provider>
    </RailActionsContext.Provider>
  );
}

export function useRail() {
  const rail = useContext(RailStateContext);
  const actions = useContext(RailActionsContext);
  if (!actions) {
    throw new Error("useRail must be used within RailProvider");
  }
  return { rail, ...actions };
}

export function useOptionalRailActions() {
  return useContext(RailActionsContext);
}

/**
 * Publish fixed right-rail content while this screen is focused.
 * Actions/state are split so publishing never remounts the publisher.
 */
export function useRailContent(
  content: ReactNode | null,
  deps: unknown[],
  title?: string,
) {
  const actions = useOptionalRailActions();
  const focused = useIsFocused();
  const contentRef = useRef(content);
  const titleRef = useRef(title);
  contentRef.current = content;
  titleRef.current = title;

  useEffect(() => {
    if (!actions || !focused) return;

    const next = contentRef.current;
    if (next == null) {
      actions.clearRail();
      return;
    }
    actions.setRail({ title: titleRef.current, content: next });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focused, actions, ...deps]);

  useEffect(() => {
    if (!actions) return;
    return () => {
      actions.clearRail();
    };
  }, [actions]);
}

export function RailHost() {
  const rail = useContext(RailStateContext);

  if (!rail.content) {
    return (
      <View style={styles.empty}>
        <AppText variant="label" tone="tertiary">
          Context
        </AppText>
        <AppText variant="h2">Nothing selected</AppText>
        <AppText variant="caption" tone="secondary">
          Select something to see details here.
        </AppText>
      </View>
    );
  }

  return (
    <View style={styles.host}>
      {rail.title ? (
        <AppText variant="label" tone="tertiary" style={styles.title}>
          {rail.title}
        </AppText>
      ) : null}
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator
        nestedScrollEnabled
      >
        {rail.content}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { flex: 1, minHeight: 0 },
  title: { marginBottom: space[3] },
  scroll: { flex: 1 },
  scrollContent: { gap: space[4], paddingBottom: space[4] },
  empty: { gap: space[2], flex: 1 },
});
