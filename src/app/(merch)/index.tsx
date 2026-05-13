import * as AC from "@bacons/apple-colors";
import { Stack } from "expo-router";
import { StyleSheet, Text, View } from "react-native";

export default function MerchScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Merch", headerLargeTitle: true }} />
      <View style={styles.container}>
        <Text style={styles.emoji}>👕</Text>
        <Text style={styles.title}>Merch coming soon</Text>
        <Text style={styles.subtitle}>
          Tees, hats, and more — rep your favorite local slice.
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 8,
  },
  emoji: {
    fontSize: 60,
    marginBottom: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: AC.label as any,
  },
  subtitle: {
    fontSize: 15,
    color: AC.secondaryLabel as any,
    textAlign: "center",
  },
});
