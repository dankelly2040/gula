import { Image } from "expo-image";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Logo from "../../components/logo";

const heroBg = require("../../assets/hero-bg.webp");

export default function HomeScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.container}>
      <Image
        source={heroBg}
        style={StyleSheet.absoluteFill}
        contentFit="cover"
      />
      <View style={styles.overlay} />

      <View style={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        <Logo size={260} />

        <Text style={styles.tagline}>Your pizza in their pockets</Text>
      </View>

      <View style={[styles.bottomArea, { paddingBottom: insets.bottom + 110 }]}>
        <Pressable
          onPress={() => router.push("/(menu)")}
          style={({ pressed }) => [
            styles.button,
            pressed && { opacity: 0.7 },
          ]}
        >
          <Text style={styles.buttonText}>Order now</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a1a",
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    gap: 12,
  },
  tagline: {
    fontSize: 18,
    color: "rgba(255,255,255,0.75)",
    fontWeight: "500",
    textAlign: "center",
    marginTop: 4,
  },
  bottomArea: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  button: {
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.6)",
    backgroundColor: "transparent",
    paddingHorizontal: 40,
    paddingVertical: 16,
    borderRadius: 28,
    borderCurve: "continuous",
  },
  buttonText: {
    fontSize: 17,
    fontWeight: "600",
    color: "white",
  },
});
