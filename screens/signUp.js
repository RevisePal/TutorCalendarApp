import React, { useState } from "react";
import { View, Text, StyleSheet, Alert, Image, ScrollView, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard} from "react-native";
import { auth, db } from "../firebase";
import { setDoc, doc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import BackButton from "../components/backButton";
import { TouchableOpacity } from "react-native-gesture-handler";
import { serverTimestamp } from "firebase/firestore";
import { TextInput } from "react-native-paper";
import PropTypes from "prop-types"; // Add this import

export default function SignUp({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fname, setFname] = useState("");

  const handleSignUp = async () => {
    if (!fname || !email || !password) {
      Alert.alert(
        "Validation Error",
        "Please fill in all required fields before proceeding."
      );
    } else {
      try {
        const authUser = await createUserWithEmailAndPassword(
          auth,
          email,
          password
        );

        await setDoc(doc(db, "users", authUser.user.uid), {
          email: authUser.user.email,
          fname: fname, // Add first name to the Firestore document
          createdAt: serverTimestamp(),
        });

        navigation.navigate("App", {
          screen: "Main",
          params: { screen: "Explore" },
        });
      } catch (error) {
        Alert.alert("Error", error.message);
      }
    }
  };

  return (
    <KeyboardAvoidingView
    style={{ flex: 1 }}
    behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
  >
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} bounces={false}>
    <View style={styles.container}>
      <View style={styles.backButtonContainer}>
        <BackButton />
      </View>
      <View style={styles.logoContainer}>
        <Image
          source={require("../assets/tutorLogo.png")}
          style={{ width: 300, height: 234 }}
        />
      </View>
      <View style={styles.inputContainer}>
        <TextInput
          textContentType="givenName"
          selectionColor="gold"
          underlineColor="gold"
          mode="flat"
          activeOutlineColor="white"
          textColor="#fff"
          label={"First Name"}
          theme={{
            colors: {
              placeholder: "gold",
              text: "gold",
              primary: "white",
            },
          }}
          value={fname}
          onChangeText={(e) => setFname(e)}
          style={styles.input}
        />
        <TextInput
          textContentType="emailAddress"
          selectionColor="gold"
          underlineColor="gold"
          mode="flat"
          activeOutlineColor="white"
          textColor="white"
          label={"Email"}
          theme={{
            colors: {
              placeholder: "gold",
              text: "gold",
              primary: "white",
            },
          }}
          value={email}
          onChangeText={(e) => setEmail(e)}
          style={styles.input}
        />
        <TextInput
          label="Password"
          selectionColor="gold"
          underlineColor="gold"
          mode="flat"
          activeOutlineColor="white"
          textColor="white"
          secureTextEntry
          value={password}
          onChangeText={setPassword}
          theme={{
            colors: {
              placeholder: "gold",
              text: "white",
              primary: "white",
            },
          }}
          style={styles.input}
        />
      </View>
      <TouchableOpacity style={styles.submit} onPress={handleSignUp}>
        <Text style={styles.submitText}>Continue</Text>
      </TouchableOpacity>
    </View>
    </ScrollView>
    </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}

SignUp.propTypes = {
  navigation: PropTypes.shape({
    navigate: PropTypes.func.isRequired,
  }).isRequired,
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000000",
    justifyContent: "space-between", // Add this line
    paddingBottom: 50, // Add this line
  },
  backButtonContainer: {
    position: "absolute",
    top: 60,
    left: 30,
    zIndex: 10,
  },
  logoContainer: {
    marginTop: "30%",
    alignItems: "center",
  },
  inputContainer: {
    alignItems: "center",
    width: "100%",
  },
  input: {
    marginBottom: 18,
    backgroundColor: "transparent",
    width: "80%",
  },
  submit: {
    borderWidth: 1,
    backgroundColor: "gold",
    marginBottom: 10,
    width: "80%",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    alignSelf: "center", // Add this line to center the button horizontally
  },
  submitText: {
    color: "#000",
    fontWeight: "bold",
    fontSize: 18,
  },
});
