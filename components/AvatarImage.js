import React from "react";
import { View, Image, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

export const PRESET_AVATARS = [
  { id: "school",     bg: "#0D9488", icon: "school-outline" },
  { id: "book",       bg: "#6366F1", icon: "book-outline" },
  { id: "pencil",     bg: "#F59E0B", icon: "pencil-outline" },
  { id: "calculator", bg: "#3B82F6", icon: "calculator-outline" },
  { id: "science",    bg: "#10B981", icon: "flask-outline" },
  { id: "music",      bg: "#8B5CF6", icon: "musical-notes-outline" },
  { id: "globe",      bg: "#F97316", icon: "globe-outline" },
  { id: "code",       bg: "#EC4899", icon: "code-slash-outline" },
  { id: "star",       bg: "#EAB308", icon: "star-outline" },
  { id: "bulb",       bg: "#EF4444", icon: "bulb-outline" },
  { id: "art",        bg: "#14B8A6", icon: "color-palette-outline" },
  { id: "sport",      bg: "#22C55E", icon: "football-outline" },
];

export default function AvatarImage({ photoUrl, style }) {
  const flat = StyleSheet.flatten(style) || {};
  const size = flat.width || 40;
  const iconSize = Math.round(size * 0.44);

  if (photoUrl?.startsWith("preset:")) {
    const id = photoUrl.replace("preset:", "");
    const preset = PRESET_AVATARS.find((a) => a.id === id);
    if (preset) {
      return (
        <View style={[style, { backgroundColor: preset.bg, alignItems: "center", justifyContent: "center" }]}>
          <Ionicons name={preset.icon} size={iconSize} color="#fff" />
        </View>
      );
    }
  }

  return (
    <Image
      source={photoUrl ? { uri: photoUrl } : require("../assets/profilepic.jpg")}
      style={style}
    />
  );
}
