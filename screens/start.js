import React from "react";
import PropTypes from "prop-types"; // Add this import
import { TouchableOpacity, View, Text, StyleSheet, Image } from "react-native";

export default function Start({ navigation }) {
  return (
    <View style={styles.container}>
       <Image
          source={require("../assets/tutorName.png")}
          style={{ resizeMode:'center'}}
        />
        <Image
          source={require("../assets/tutorLogo.png")}
          style={{ width: 300, height: 234 }}
        />
      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={styles.signUp}
          onPress={() => navigation.navigate("signUp")}
        >
          <Text style={styles.signUpText}>Sign up</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.signIn}
          onPress={() => navigation.navigate("signIn")}
        >
          <Text style={styles.signInText}>I already have an account</Text>
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
    flex:1,
    justifyContent: "space-evenly",
    alignItems: "center",
    //paddingBottom: 50,
    backgroundColor: "#000000",
},
  buttonContainer: {
    width: "100%",
    alignItems: "center",
  },
  signUp: {
    borderWidth: 1,
    backgroundColor: "gold",
    marginBottom: 10,
    width: "80%",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  signUpText: {
    fontWeight: "bold",
    color: "black",
    fontSize:18,
  },
  signIn: {
    borderWidth: 1,
    borderColor: "gold",
    backgroundColor: "black",
    width: "80%",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  signInText: {
    color: "gold",
    fontSize:18,
  },
});
