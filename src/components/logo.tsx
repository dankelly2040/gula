import { useFonts, Pacifico_400Regular } from "@expo-google-fonts/pacifico";
import { StyleSheet, Text, View } from "react-native";

export default function Logo({ size = 260 }: { size?: number }) {
  const [fontsLoaded] = useFonts({ Pacifico_400Regular });

  if (!fontsLoaded) return <View style={{ width: size, height: size * 0.7 }} />;

  const fontSize = size * 0.26;

  return (
    <View style={[styles.container, { transform: [{ rotate: "-4deg" }] }]}>
      <Text
        style={[styles.text, { fontSize }]}
        allowFontScaling={false}
      >
        Local
      </Text>
      <Text
        style={[styles.text, { fontSize }]}
        allowFontScaling={false}
      >
        Pizza
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 20,
  },
  text: {
    fontFamily: "Pacifico_400Regular",
    color: "white",
    textAlign: "center",
    paddingHorizontal: 20,
    paddingVertical: 8,
    textShadowColor: "rgba(0,0,0,0.5)",
    textShadowOffset: { width: 0, height: 3 },
    textShadowRadius: 10,
    includeFontPadding: true,
  },
});
