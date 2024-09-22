import React, { useState } from "react";
import { View, Text, StyleSheet, Alert, Image} from "react-native";
import { auth, db } from "../firebase";
import { setDoc, doc } from "firebase/firestore";
import { createUserWithEmailAndPassword } from "firebase/auth";
import BackButton from "../components/backButton";
import { TouchableOpacity } from "react-native-gesture-handler";
import { serverTimestamp } from "firebase/firestore";
import { TextInput } from 'react-native-paper';
import PropTypes from "prop-types"; // Add this import

export default function SignUp({ navigation }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fname, setFname] = useState("");

  const handleSignUp = async () => {
    if (!fname || !email || !password) {
      Alert.alert('Validation Error', 'Please fill in all required fields before proceeding.');
    } else {
      try {
        // Create user with email and password
        const authUser = await createUserWithEmailAndPassword(auth, email, password);
  
        // Add user data to Firestore
        await setDoc(doc(db, "users", authUser.user.uid), {
          email: authUser.user.email,
          fname: fname, // Add first name to the Firestore document
          createdAt: serverTimestamp(),
        });
  
        // Navigate to main screen
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
    <View style={styles.container}>
      <View style={styles.backButtonContainer}>
      <BackButton/>
      </View>
      <View style={styles.logoContainer}>
        <Image
          source={require("../assets/tutorLogo.png")}
          style={{ width: 300, height: 234 }}
        />
      </View>
      <TextInput
                  textContentType="givenName"
                  selectionColor="gold"
                  underlineColor="gold"
                  mode="flat"
                  activeOutlineColor="white"
                  textColor="#fff"
                  label={'First Name'}
                  theme={{
                    colors: {
                      placeholder: 'gold',
                      text: 'gold',
                      primary: 'white',
                    },
                  }}
                  value={fname}
                  onChangeText={(e) => setFname(e)}
                  style={{
                    marginBottom: 18,
                    marginTop: 30,
                    backgroundColor: 'transparent',
                  }}
                />
      <TextInput
                  textContentType="emailAddress"
                  selectionColor="gold"
                  underlineColor="gold"
                  mode="flat"
                  activeOutlineColor="white"
                  textColor="white"
                  label={'Email'}
                  theme={{
                    colors: {
                      placeholder: 'gold',
                      text: 'gold',
                      primary: 'white',
                    },
                  }}
                  style={{
                    marginBottom: 18,
                    backgroundColor: 'transparent',
                    fontSize: 18,
                  }}
                  value={email}
                  onChangeText={(e) => setEmail(e)}
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
      placeholder: 'gold', // Change placeholder color to gold
      text: 'white',       // Set text color to white
      primary: 'white',    // Set primary color to white (for focused label, etc.)
    },
  }}
  style={{
   // ...styles.radiusForInputWithShadow,
    marginBottom: 18,
    fontSize: 18,
    backgroundColor: 'transparent',
  }}
/>

<View style={styles.buttonContainer}>
  <TouchableOpacity style={styles.submit} onPress={handleSignUp}>
    <Text style={styles.submitText}>Continue</Text>
  </TouchableOpacity>
</View>

    </View>
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
  },
  backButtonContainer: {
    position: "absolute",
    top: 60,
    left: 30,
    zIndex: 10,
  },
  input: {
    borderWidth: 1,
    borderColor: "#3b88c3",
    width: "80%",
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
    backgroundColor: "#fff",
  },
  submit: {
    borderWidth: 1,
    backgroundColor: "gold",
    marginBottom: 10,
    width: 300,
    padding: 20,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  submitText: {
    color: "#fff",
    fontWeight: "bold",
    fontSize:18,
  },
  buttonContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  logoContainer: {
    marginTop: "30%",
    alignItems:"center"
  },
});
