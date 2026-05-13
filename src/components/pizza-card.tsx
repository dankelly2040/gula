import * as AC from "@bacons/apple-colors";
import { Image } from "expo-image";
import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { Doc } from "../../convex/_generated/dataModel";

type Pizza = Doc<"pizzas">;

const FALLBACK_IMAGES: Record<string, string> = {
  Margherita:
    "https://images.unsplash.com/photo-1574071318508-1cdbab80d002?w=400&q=80",
  Pepperoni:
    "https://images.unsplash.com/photo-1628840042765-356cda07504e?w=400&q=80",
  "BBQ Chicken":
    "https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=400&q=80",
  "Truffle Mushroom":
    "https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?w=400&q=80",
  "Garden Veggie":
    "https://images.unsplash.com/photo-1511689660979-10d2b1aada49?w=400&q=80",
  "Spicy Arrabbiata":
    "https://images.unsplash.com/photo-1458642849426-cfb724f15ef7?w=400&q=80",
  "Meat Feast":
    "https://images.unsplash.com/photo-1534308983496-4fabb1a015ee?w=400&q=80",
  "Smoky Bacon Ranch":
    "https://images.unsplash.com/photo-1588315029754-2dd089d39a1a?w=400&q=80",
};

const DEFAULT_FALLBACK =
  "https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80";

export default function PizzaCard({ pizza }: { pizza: Pizza }) {
  const imageUri = pizza.image
    ? `https://joyous-labrador-95.convex.cloud/api/storage/${pizza.image}`
    : FALLBACK_IMAGES[pizza.name] ?? DEFAULT_FALLBACK;

  return (
    <Link
      href={{ pathname: "/(menu)/pizza/[id]", params: { id: pizza._id } }}
      asChild
      withAppleZoom
    >
      <Link.Trigger>
        <Pressable
          style={{
            backgroundColor: AC.secondarySystemBackground as any,
            borderRadius: 16,
            borderCurve: "continuous",
            overflow: "hidden",
          }}
        >
          <Image
            source={{ uri: imageUri }}
            style={{ width: "100%", aspectRatio: 1 }}
            contentFit="cover"
            transition={200}
          />
          <View style={{ padding: 12, gap: 4 }}>
            <Text
              style={{
                fontSize: 15,
                fontWeight: "600",
                color: AC.label as any,
              }}
              numberOfLines={1}
            >
              {pizza.name}
            </Text>
            <Text style={{ fontSize: 13, color: AC.secondaryLabel as any }}>
              ${pizza.basePrice.toFixed(2)}
            </Text>
            {pizza.rating != null && (
              <Text style={{ fontSize: 12, color: AC.tertiaryLabel as any }}>
                ★ {pizza.rating.toFixed(1)}
              </Text>
            )}
          </View>
        </Pressable>
      </Link.Trigger>
    </Link>
  );
}
