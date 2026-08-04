import { Drawer } from "expo-router/drawer";
import { GestureHandlerRootView } from "react-native-gesture-handler";

export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <Drawer
        screenOptions={{
          headerStyle: {
            backgroundColor: "#0056b3",
          },
          headerTintColor: "#fff",
          headerTitleStyle: {
            fontWeight: "bold",
          },
          drawerActiveTintColor: "#0056b3",
        }}
      >
        <Drawer.Screen
          name="index"
          options={{
            drawerLabel: "Nova Conversa",
            title: "Tutor de Matemática",
          }}
        />
      </Drawer>
    </GestureHandlerRootView>
  );
}
