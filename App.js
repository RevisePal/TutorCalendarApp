import React, { useEffect, useState, useRef } from "react";
import { View, Text } from "react-native";
import { NavigationContainer } from "@react-navigation/native";
import { OneSignal } from "react-native-onesignal";
import { createStackNavigator } from "@react-navigation/stack";
import Start from "./screens/start";
import SignIn from "./screens/signIn";
import SignUp from "./screens/signUp";
import Home from "./screens/home";
import Profile from "./screens/profile";
import Planner from "./screens/planner";
// import Favourites from "./screens/favourites";
import ComingSoon from "./screens/comingSoon";
import Activity from "./screens/activity";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { AntDesign } from "@expo/vector-icons";
import { auth, db } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import TutorOnboarding from "./screens/tutorOnBoarding";
import TuteeDetails from "./screens/tuteeDetails";
import FindTutor from "./screens/findTutor";
import RoleSelect from "./screens/roleSelect";
import Register from "./screens/register";

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

OneSignal.initialize("d0351620-7a1c-4d27-ad70-06e26e40e1a2");
OneSignal.Notifications.requestPermission(true);

function MainTabs() {
  return (
    <Tab.Navigator screenOptions={{ tabBarActiveTintColor: "#0D9488", tabBarInactiveTintColor: "#9CA3AF", tabBarStyle: { backgroundColor: "#FFFFFF", borderTopColor: "#CCFBF1" } }}>
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
        component={Planner}
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
            <AntDesign name="heart" color={color} size={size} />
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
  const navigationRef = useRef(null);

  useEffect(() => {
    // Navigate to the right screen when user taps a notification
    const handleNotificationClick = (event) => {
      const { screen, tutorId } = event.notification.additionalData ?? {};
      if (screen && navigationRef.current) {
        const params = tutorId ? { tutorId } : undefined;
        navigationRef.current.navigate(screen, params);
      }
    };
    OneSignal.Notifications.addEventListener("click", handleNotificationClick);

    const unsubscribe = auth.onAuthStateChanged(async (authUser) => {
      if (authUser) {
        const userId = authUser.uid;
        const tutorDoc = await getDoc(doc(db, "Tutor", userId));
        if (tutorDoc.exists() && tutorDoc.data().isActive !== false) {
          setIsTutor(true);
          setIsOnboarded(tutorDoc.data().isOnboarded || false);
        } else {
          setIsTutor(false);
        }
        setUser(authUser);
        OneSignal.login(userId);
      } else {
        setUser(null);
        setIsTutor(false);
        setIsOnboarded(false);
        OneSignal.logout();
      }
      setIsLoading(false);
    });

    return () => {
      OneSignal.Notifications.removeEventListener("click", handleNotificationClick);
      unsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user == null ? (
          // No user is logged in
          <>
            <Stack.Screen name="Start" component={Start} />
            <Stack.Screen name="SignIn" component={SignIn} />
            <Stack.Screen name="RoleSelect" component={RoleSelect} />
            <Stack.Screen name="Register" component={Register} />
            <Stack.Screen name="MainTabs" component={MainTabs} />
            <Stack.Screen name="TutorOnboarding" component={TutorOnboarding} />
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
            <Stack.Screen name="TuteeDetails" component={TuteeDetails} />
            <Stack.Screen name="Activity" component={Activity} />
            <Stack.Screen name="FindTutor" component={FindTutor} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}
