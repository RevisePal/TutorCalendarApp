import React from "react";
import { TouchableOpacity, View, Text, StyleSheet } from "react-native";

export default function Start({ navigation }) {
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.signUp}
        onPress={() => navigation.navigate("signUp")}
      >
        <Text style={styles.signUpText}>Sign Up</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.signIn}
        onPress={() => navigation.navigate("signIn")}
      >
        <Text style={styles.signInText}>Sign In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "flex-end",
    alignItems: "center",
    paddingBottom: 50,
  },
  signUp: {
    borderWidth: 1,
    borderColor: "black",
    marginBottom: 10,
    width: "80%",
    padding: 20,
    borderRadius: 10,
    alignItems: "center", 
    justifyContent: "center",
  },
  signUpText: {
    fontWeight: "bold",
  },
  signIn: {
    borderWidth: 1,
    borderColor: "black",
    backgroundColor: "black",
    width: "80%",
    padding: 20,
    borderRadius: 10,
    alignItems: "center", 
    justifyContent: "center",  
  },
  signInText: {
    color: "#fff",
    fontWeight: "bold",
  },
});
