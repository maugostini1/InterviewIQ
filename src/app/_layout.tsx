import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false, //removes default header to allow new banner for header.
      }}
    />
  );
}
