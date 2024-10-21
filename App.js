import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Start from "./screens/start";
import SignIn from "./screens/signIn";
import SignUp from "./screens/signUp";
import Home from "./screens/home";
import Profile from "./screens/profile";
import Planner from "./screens/planner";
import Favourites from "./screens/favourites";
import ComingSoon from "./screens/comingSoon";
import Activity from "./screens/activity";
import { AntDesign } from "@expo/vector-icons";
import { auth, db } from "./firebase"; // Import Firestore db
import { doc, getDoc } from "firebase/firestore"; // Firestore imports
import TutorOnBoarding from "./screens/tutorOnBoarding";

const AuthStack = createStackNavigator();
const Tab = createBottomTabNavigator();
const MainStack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Home"
        component={Home}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <AntDesign name="home" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Planner"
        component={ComingSoon}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <AntDesign name="calendar" color={color} size={size} />
          ),
        }}
      />
      <Tab.Screen
        name="Favourites"
        component={ComingSoon}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <AntDesign name="hearto" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

function AppStack() {
  return (
    <MainStack.Navigator screenOptions={{ headerShown: false }}>
      <MainStack.Screen name="Main" component={MainTabs} />
      <MainStack.Screen name="activity" component={Activity} />
      <MainStack.Screen name="Profile" component={Profile} />
    </MainStack.Navigator>
  );
}

function AuthStackScreen({ isTutor, isOnboarded }) {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="start" component={Start} />
      <AuthStack.Screen name="signIn" component={SignIn} />
      <AuthStack.Screen name="signUp" component={SignUp} />
      {isTutor && !isOnboarded ? (
        <AuthStack.Screen name="tutorOnBoarding" component={TutorOnBoarding} />
      ) : null}
    </AuthStack.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isTutor, setIsTutor] = useState(false); // Track whether the user is a tutor
  const [isOnboarded, setIsOnboarded] = useState(true); // Track if onboarding is complete

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      if (authUser) {
        console.log("Auth state changed:", authUser.email);

        // Check if the user is a tutor and if they've completed onboarding
        const tutorDoc = await getDoc(doc(db, "Tutor", authUser.uid));
        if (tutorDoc.exists()) {
          setIsTutor(true); // Set user as a tutor
          setIsOnboarded(tutorDoc.data().isOnboarded || false); // Check 'isOnboarded' field
        } else {
          setIsTutor(false); // User is not a tutor (assumed to be a tutee)
        }

        setUser(authUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return unsubscribe; // Clean up the subscription when the component unmounts
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      {user ? (
        isTutor && !isOnboarded ? (
          <AuthStackScreen isTutor={isTutor} isOnboarded={isOnboarded} />
        ) : (
          <AppStack /> // Move to the main app stack after onboarding
        )
      ) : (
        <AuthStackScreen isTutor={isTutor} isOnboarded={isOnboarded} />
      )}
    </NavigationContainer>
  );
}
