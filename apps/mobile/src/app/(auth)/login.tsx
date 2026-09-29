import { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, Alert } from "react-native";
import { useRouter } from "expo-router";
import api from "@iqeapp/api-client";

export default function LoginScreen() {
  const router = useRouter();
  const [loginName, setLoginName] = useState("");
  const [password, setPassword] = useState("");

  async function handleLogin() {
    try {
      const res = await api.login(loginName, password);
      localStorage.setItem("token", res.access_token);
      router.replace("/(coordinator)" as any);
    } catch {
      Alert.alert("Error", "Invalid credentials");
    }
  }

  return (
    <View className="flex-1 justify-center p-6 bg-white">
      <Text className="text-2xl font-bold mb-6 text-center">IQEApp</Text>
      <TextInput
        placeholder="Login Name"
        value={loginName}
        onChangeText={setLoginName}
        className="border p-3 mb-3 rounded"
      />
      <TextInput
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        className="border p-3 mb-3 rounded"
      />
      <TouchableOpacity onPress={handleLogin} className="bg-blue-600 p-3 rounded">
        <Text className="text-white text-center font-bold">Login</Text>
      </TouchableOpacity>
    </View>
  );
}
