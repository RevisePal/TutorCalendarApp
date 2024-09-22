import React, { useEffect, useState } from "react";
import { View, Text} from "react-native";
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
import { auth } from "./firebase"; // Your Firebase auth setup

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
        name="Profile"
        component={Profile}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <AntDesign name="user" color={color} size={size} />
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
    </MainStack.Navigator>
  );
}

function AuthStackScreen() {
  return (
    <AuthStack.Navigator screenOptions={{ headerShown: false }}>
      <AuthStack.Screen name="start" component={Start} />
      <AuthStack.Screen name="signIn" component={SignIn} />
      <AuthStack.Screen name="signUp" component={SignUp} />
    </AuthStack.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((authUser) => {
      setUser(authUser);
      setIsLoading(false); // Once we get the auth state, stop the loading
    });

    return unsubscribe; // Clean up the subscription when the component unmounts
  }, []);

  if (isLoading) {
    // You can show a loading spinner or screen while the auth state is being checked
    return <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <Text>Loading...</Text>
    </View>;
  }

  return (
    <NavigationContainer>
      {user ? (
        <MainStack.Navigator screenOptions={{ headerShown: false }}>
          <MainStack.Screen name="App" component={AppStack} />
        </MainStack.Navigator>
      ) : (
        <AuthStackScreen />
      )}
    </NavigationContainer>
  );
}
