import { Link, Stack } from "expo-router";
import { StyleSheet, View } from "react-native";
import { AppText } from "@/components/ui/AppText";
import { Screen } from "@/components/ui/Screen";
import { space } from "@/theme/tokens";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Oops!" }} />
      <Screen>
        <View style={styles.container}>
          <AppText variant="h1">Screen not found</AppText>
          <Link href="/" style={styles.link}>
            <AppText variant="body" tone="accent">
              Go home
            </AppText>
          </Link>
        </View>
      </Screen>
    </>
  );
}

const styles = StyleSheet.create({
  container: { gap: space[4] },
  link: { marginTop: space[2] },
});
