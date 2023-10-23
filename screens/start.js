import React from "react";
import { TouchableOpacity, View, Text, StyleSheet, Image } from "react-native";

export default function Start({ navigation }) {
  return (
    <View style={styles.container}>
      <View></View>
      <View style={styles.logoContainer}>
        <Image
          source={require("../assets/kiddl-logo.webp")}
          style={{ width: 200, height: 134 }}
        />
      </View>
      <View style={styles.buttonContainer}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 50,
  },
  logoContainer: {
    marginBottom: 50,
  },
  buttonContainer: {
  width: '100%',
  alignItems: 'center',
  },
  signUp: {
    borderWidth: 1,
    borderColor: "#3b88c3",
    marginBottom: 10,
    width: "80%",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  signUpText: {
    fontWeight: "bold",
    color: "#3b88c3",
  },
  signIn: {
    borderWidth: 1,
    borderColor: "#3b88c3",
    backgroundColor: "#3b88c3",
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
