import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { createStackNavigator } from "@react-navigation/stack";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import Start from "./screens/start";
import SignIn from "./screens/signIn";
import SignUp from "./screens/signUp";
import Home from "./screens/home";
// import Activities from "./screens/activities";
import Profile from "./screens/profile";
import Planner from "./screens/planner";
import Favourites from "./screens/favourites";
import Activity from "./screens/activity"; // Import the new Activity screen
import { AntDesign } from "@expo/vector-icons";

const AuthStack = createStackNavigator();
const Tab = createBottomTabNavigator();
const MainStack = createStackNavigator();

function MainTabs() {
  return (
    <Tab.Navigator>
      <Tab.Screen
        name="Explore"
        component={Home}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <AntDesign name="home" color={color} size={size} />
          ),
        }}
      />
      {/* <Tab.Screen
        name="Activities"
        component={Activities}
        options={{
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <AntDesign name="staro" color={color} size={size} />
          ),
        }}
      /> */}
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
        component={Favourites}
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

export default function App() {
  return (
    <NavigationContainer>
      <MainStack.Navigator screenOptions={{ headerShown: false }}>
        <MainStack.Screen name="Auth" component={AuthStackScreen} />
        <MainStack.Screen name="App" component={AppStack} />
      </MainStack.Navigator>
    </NavigationContainer>
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
