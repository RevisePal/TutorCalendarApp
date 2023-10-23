import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { getAuth, signOut } from "firebase/auth";

export default function Profile() {
  const navigation = useNavigation();
  const auth = getAuth();

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigation.navigate("start");
    } catch (error) {
      console.error("Error signing out: ", error);
    }
  };
  return (
    <View
      style={{ flex: 1, justifyContent: "space-between", alignItems: "center" }}
    >
      <View></View>
      <Text>Profile Screen</Text>
      <TouchableOpacity style={styles.signOutButton} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  signOutButton: {
    backgroundColor: "white",
    padding: 10,
    borderRadius: 10,
    width: "80%",
    alignItems: "center",
    padding: 20,
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "black",
  },
  signOutText: {
    color: "black",
    fontWeight: "bold",
  },
});
