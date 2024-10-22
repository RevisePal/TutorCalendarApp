import React, { useEffect, useState } from "react";
import { View, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import Start from "./screens/start";
import SignIn from "./screens/signIn";
import SignUp from "./screens/signUp";
import Home from "./screens/home";
import Profile from "./screens/profile";
// import Planner from "./screens/planner";
// import Favourites from "./screens/favourites";
import ComingSoon from "./screens/comingSoon";
import Activity from "./screens/activity";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { AntDesign } from "@expo/vector-icons";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import TutorOnboarding from "./screens/tutorOnboarding";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

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
      <Tab.Screen
        name="Profile"
        component={Profile}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <AntDesign name="user" color={color} size={size} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [isTutor, setIsTutor] = useState(false);
  const [isOnboarded, setIsOnboarded] = useState(false);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      if (authUser) {
        const userId = authUser.uid;
        const tutorDoc = await getDoc(doc(db, "Tutor", userId));
        if (tutorDoc.exists()) {
          setIsTutor(true);
          setIsOnboarded(tutorDoc.data().isOnboarded || false);
        } else {
          setIsTutor(false);
        }
        setUser(authUser);
      } else {
        setUser(null);
        setIsTutor(false);
        setIsOnboarded(false);
      }
      setIsLoading(false);
    });

    return unsubscribe;
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
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user == null ? (
          // No user is logged in
          <>
            <Stack.Screen name="Start" component={Start} />
            <Stack.Screen name="SignIn" component={SignIn} />
            <Stack.Screen name="SignUp" component={SignUp} />
          </>
        ) : isTutor && !isOnboarded ? (
          // Tutor needs to complete onboarding
          <>
            <Stack.Screen name="TutorOnboarding" component={TutorOnboarding} />
            <Stack.Screen name="MainTabs" component={MainTabs} />

          </>
        ) : (
          // User is logged in and onboarded
          <>
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="Activity" component={Activity} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
