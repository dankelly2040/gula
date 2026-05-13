import { ThemeProvider } from "@/components/theme-provider";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { Tabs as WebTabs } from "expo-router/tabs";
import { NativeTabs } from "expo-router/unstable-native-tabs";

const convex = new ConvexReactClient(process.env.EXPO_PUBLIC_CONVEX_URL!);

export default function Layout() {
  return (
    <ConvexProvider client={convex}>
      <ThemeProvider>
        {process.env.EXPO_OS === "web" ? (
          <WebTabs screenOptions={{ headerShown: false }}>
            <WebTabs.Screen
              name="(home)"
              options={{
                title: "Home",
                tabBarIcon: (props) => (
                  <MaterialIcons {...props} name="home" />
                ),
              }}
            />
            <WebTabs.Screen
              name="(menu)"
              options={{
                title: "Menu",
                tabBarIcon: (props) => (
                  <MaterialIcons {...props} name="restaurant-menu" />
                ),
              }}
            />
            <WebTabs.Screen
              name="(merch)"
              options={{
                title: "Merch",
                tabBarIcon: (props) => (
                  <MaterialIcons {...props} name="storefront" />
                ),
              }}
            />
            <WebTabs.Screen
              name="(orders)"
              options={{
                title: "Orders",
                tabBarIcon: (props) => (
                  <MaterialIcons {...props} name="receipt-long" />
                ),
              }}
            />
            <WebTabs.Screen
              name="(cart)"
              options={{
                title: "Cart",
                tabBarIcon: (props) => (
                  <MaterialIcons {...props} name="shopping-cart" />
                ),
              }}
            />
          </WebTabs>
        ) : (
          <NativeTabs>
            <NativeTabs.Trigger name="(home)">
              <NativeTabs.Trigger.Label>Home</NativeTabs.Trigger.Label>
              <NativeTabs.Trigger.Icon
                sf={{ default: "house", selected: "house.fill" }}
                md="home"
              />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="(menu)">
              <NativeTabs.Trigger.Label>Menu</NativeTabs.Trigger.Label>
              <NativeTabs.Trigger.Icon
                sf={{
                  default: "menucard",
                  selected: "menucard.fill",
                }}
                md="restaurant_menu"
              />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="(merch)">
              <NativeTabs.Trigger.Label>Merch</NativeTabs.Trigger.Label>
              <NativeTabs.Trigger.Icon
                sf={{
                  default: "tshirt",
                  selected: "tshirt.fill",
                }}
                md="storefront"
              />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="(orders)">
              <NativeTabs.Trigger.Label>Orders</NativeTabs.Trigger.Label>
              <NativeTabs.Trigger.Icon
                sf={{ default: "clock", selected: "clock.fill" }}
                md="receipt_long"
              />
            </NativeTabs.Trigger>
            <NativeTabs.Trigger name="(cart)">
              <NativeTabs.Trigger.Label>Cart</NativeTabs.Trigger.Label>
              <NativeTabs.Trigger.Icon
                sf={{ default: "cart", selected: "cart.fill" }}
                md="shopping_cart"
              />
            </NativeTabs.Trigger>
          </NativeTabs>
        )}
      </ThemeProvider>
    </ConvexProvider>
  );
}
