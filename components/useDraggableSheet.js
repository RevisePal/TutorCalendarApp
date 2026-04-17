import { useRef } from "react";
import { Animated, PanResponder } from "react-native";

export default function useDraggableSheet(onDismiss) {
  const dismissRef = useRef(onDismiss);
  dismissRef.current = onDismiss; // Always keep latest to avoid stale closures

  const translateY = useRef(new Animated.Value(0)).current;

  const reset = () => translateY.setValue(0);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, { dy, dx }) =>
        dy > 8 && Math.abs(dy) > Math.abs(dx),
      onPanResponderMove: (_, { dy }) => {
        if (dy > 0) translateY.setValue(dy);
      },
      onPanResponderRelease: (_, { dy, vy }) => {
        if (dy > 120 || vy > 1) {
          Animated.timing(translateY, {
            toValue: 800,
            duration: 220,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            dismissRef.current?.();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
          }).start();
        }
      },
    })
  ).current;

  return {
    panHandlers: panResponder.panHandlers,
    animatedStyle: { transform: [{ translateY }] },
    reset,
  };
}
