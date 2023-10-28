import React from "react";
import PropTypes from "prop-types"; // Add this import
import { TouchableOpacity, View, Text, StyleSheet, Image } from "react-native";

export default function Start({ navigation }) {
  return (
    <View style={styles.container}>
      <View></View>
      <View style={styles.logoContainer}>
        <Image
        // eslint-disable-next-line
          source={require("../assets/kiddl-logo.png")}
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

Start.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
  }).isRequired,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingBottom: 50,
    backgroundColor: "#fff",
  },
  logoContainer: {
    marginBottom: 50,
  },
  buttonContainer: {
    width: "100%",
    alignItems: "center",
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
    backgroundColor: "#fff",
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
