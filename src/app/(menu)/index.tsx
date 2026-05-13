import * as AC from "@bacons/apple-colors";
import { useQuery } from "convex/react";
import { Stack } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useWindowDimensions,
} from "react-native";
import { api } from "../../../convex/_generated/api";
import PizzaCard from "../../components/pizza-card";

export default function MenuScreen() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const pizzas = useQuery(api.pizzas.list);
  const categories = useQuery(api.categories.list);
  const { width } = useWindowDimensions();
  const numColumns = width > 600 ? 3 : 2;
  const cardSize = (width - 16 * 2 - 12 * (numColumns - 1)) / numColumns;

  const filtered = pizzas?.filter((p) => {
    const matchesSearch =
      search.trim() === "" ||
      p.name.toLowerCase().includes(search.toLowerCase());
    const matchesCategory =
      selectedCategory == null || p.categoryId === selectedCategory;
    return matchesSearch && matchesCategory && p.isAvailable;
  });

  const ListHeader = (
    <View style={{ gap: 12, paddingBottom: 4 }}>
      {/* Search bar */}
      <View
        style={{
          backgroundColor: AC.secondarySystemBackground as any,
          borderRadius: 12,
          borderCurve: "continuous",
          flexDirection: "row",
          alignItems: "center",
          paddingHorizontal: 12,
          paddingVertical: 10,
          gap: 8,
        }}
      >
        <Text style={{ fontSize: 16, color: AC.tertiaryLabel as any }}>
          🔍
        </Text>
        <TextInput
          placeholder="Search pizzas…"
          placeholderTextColor={AC.placeholderText as any}
          value={search}
          onChangeText={setSearch}
          returnKeyType="search"
          style={{ flex: 1, fontSize: 16, color: AC.label as any }}
        />
      </View>

      {/* Category pills */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 8 }}
      >
        <TouchableOpacity
          onPress={() => setSelectedCategory(null)}
          style={{
            paddingHorizontal: 16,
            paddingVertical: 8,
            borderRadius: 20,
            backgroundColor:
              selectedCategory == null
                ? "#F4B4C6"
                : (AC.secondarySystemBackground as any),
          }}
        >
          <Text
            style={{
              fontSize: 14,
              fontWeight: "600",
              color:
                selectedCategory == null ? "#1a1a1a" : (AC.label as any),
            }}
          >
            All
          </Text>
        </TouchableOpacity>
        {categories?.map((cat) => (
          <TouchableOpacity
            key={cat._id}
            onPress={() =>
              setSelectedCategory(
                selectedCategory === cat._id ? null : cat._id
              )
            }
            style={{
              paddingHorizontal: 16,
              paddingVertical: 8,
              borderRadius: 20,
              backgroundColor:
                selectedCategory === cat._id
                  ? "#F4B4C6"
                  : (AC.secondarySystemBackground as any),
            }}
          >
            <Text
              style={{
                fontSize: 14,
                fontWeight: "600",
                color:
                  selectedCategory === cat._id
                    ? "#1a1a1a"
                    : (AC.label as any),
              }}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );

  return (
    <>
      <Stack.Screen options={{ title: "Menu", headerLargeTitle: true }} />
      {filtered == null ? (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator />
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item._id}
          numColumns={numColumns}
          key={numColumns}
          contentContainerStyle={{ padding: 16, gap: 12 }}
          columnWrapperStyle={numColumns > 1 ? { gap: 12 } : undefined}
          ListHeaderComponent={ListHeader}
          renderItem={({ item }) => (
            <View style={{ width: cardSize }}>
              <PizzaCard pizza={item} />
            </View>
          )}
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingTop: 60 }}>
              <Text style={{ fontSize: 40 }}>🍕</Text>
              <Text
                style={{ color: AC.secondaryLabel as any, marginTop: 8 }}
              >
                No pizzas found
              </Text>
            </View>
          }
        />
      )}
    </>
  );
}
