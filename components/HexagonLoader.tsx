import React, { useEffect, useRef } from "react"
import { View, StyleSheet, Animated, Easing } from "react-native"
import Svg, { Path, Defs, Filter, FeGaussianBlur, FeMerge, FeMergeNode } from "react-native-svg"
import { useColorScheme } from "react-native"

interface HexagonLoaderProps {
  size?: number
  className?: string
}

const HexagonLoader: React.FC<HexagonLoaderProps> = ({ size = 80 }) => {
  const colorScheme = useColorScheme()
  const isDark = colorScheme === 'dark'
  
  // Animation values - all using native driver
  const outerScale = useRef(new Animated.Value(0)).current
  const outerRotate = useRef(new Animated.Value(0)).current
  const outerOpacity = useRef(new Animated.Value(0)).current
  
  const innerScale = useRef(new Animated.Value(0)).current
  const innerRotate = useRef(new Animated.Value(-180)).current
  const innerOpacity = useRef(new Animated.Value(0)).current

  // Pulse animation for glow background
  const pulseAnim = useRef(new Animated.Value(1)).current

  const strokeWidth = 8
  const outerRadius = (size - strokeWidth) / 2
  const innerRadius = size / 5

  const createHexagonPath = (radius: number, centerX: number, centerY: number) => {
    const points = []
    for (let i = 0; i < 6; i++) {
      const angle = (i * Math.PI) / 3
      const x = centerX + radius * Math.cos(angle)
      const y = centerY + radius * Math.sin(angle)
      points.push(`${x},${y}`)
    }
    return `M ${points.join(' L ')} Z`
  }

  const center = size / 2
  const outerPath = createHexagonPath(outerRadius, center, center)
  const innerPath = createHexagonPath(innerRadius, center, center)

  useEffect(() => {
    // Outer hexagon animation
    Animated.loop(
      Animated.parallel([
        Animated.timing(outerScale, {
          toValue: 1,
          duration: 2000,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true,
        }),
        Animated.timing(outerRotate, {
          toValue: 180,
          duration: 2000,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true,
        }),
        Animated.timing(outerOpacity, {
          toValue: 1,
          duration: 2000,
          easing: Easing.bezier(0.25, 0.46, 0.45, 0.94),
          useNativeDriver: true,
        }),
      ])
    ).start()

    // Inner hexagon animation
    Animated.loop(
      Animated.sequence([
        Animated.delay(800),
        Animated.parallel([
          Animated.timing(innerScale, {
            toValue: 1,
            duration: 1500,
            easing: Easing.bezier(0.68, -0.55, 0.265, 1.55),
            useNativeDriver: true,
          }),
          Animated.timing(innerRotate, {
            toValue: 0,
            duration: 1500,
            easing: Easing.bezier(0.68, -0.55, 0.265, 1.55),
            useNativeDriver: true,
          }),
          Animated.timing(innerOpacity, {
            toValue: 1,
            duration: 1500,
            easing: Easing.bezier(0.68, -0.55, 0.265, 1.55),
            useNativeDriver: true,
          }),
        ]),
      ])
    ).start()

    // Pulse animation for glow background
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: true,
        }),
      ])
    ).start()
  }, [])

  const strokeColor = isDark ? '#FFFFFF' : '#0F172A'
  const innerHexagonColor = '#D4703C' // Changed to the specified orange/brown color
  const glowColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(212,112,60,0.2)' // Updated to match the inner hexagon color

  // Create transform styles for the SVG container
  const outerTransformStyle = {
    transform: [
      { scale: outerScale },
      { rotate: outerRotate.interpolate({
          inputRange: [0, 180],
          outputRange: ['0deg', '180deg']
        })
      }
    ],
    opacity: outerOpacity,
  }

  const innerTransformStyle = {
    transform: [
      { scale: innerScale },
      { rotate: innerRotate.interpolate({
          inputRange: [-180, 0],
          outputRange: ['-180deg', '0deg']
        })
      }
    ],
    opacity: innerOpacity,
  }

  return (
    <View style={[styles.container, { width: size, height: size }]}>
      {/* Animated glow effect background */}
      <Animated.View 
        style={[
          styles.glowBackground,
          { 
            backgroundColor: glowColor,
            width: size * 0.8,
            height: size * 0.8,
            borderRadius: size * 0.4,
            transform: [{ scale: pulseAnim }],
            opacity: 0.3,
          }
        ]} 
        // blurRadius={10}
      />

      {/* Animated SVG containers */}
      <View style={styles.svgContainer}>
        {/* Outer hexagon */}
        <Animated.View style={[styles.animatedLayer, outerTransformStyle]}>
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <Defs>
              <Filter id={`glow-outer-${size}`}>
                <FeGaussianBlur stdDeviation="2" result="coloredBlur" />
                <FeMerge>
                  <FeMergeNode in="coloredBlur" />
                  <FeMergeNode in="SourceGraphic" />
                </FeMerge>
              </Filter>
            </Defs>
            <Path
              d={outerPath}
              fill="none"
              stroke={strokeColor}
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              strokeLinejoin="round"
              filter={`url(#glow-outer-${size})`}
            />
          </Svg>
        </Animated.View>

        {/* Inner hexagon - now with #D4703C color */}
        <Animated.View style={[styles.animatedLayer, innerTransformStyle]}>
          <Svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
            <Defs>
              <Filter id={`glow-inner-${size}`}>
                <FeGaussianBlur stdDeviation="2" result="coloredBlur" />
                <FeMerge>
                  <FeMergeNode in="coloredBlur" />
                  <FeMergeNode in="SourceGraphic" />
                </FeMerge>
              </Filter>
            </Defs>
            <Path
              d={innerPath}
              fill={innerHexagonColor} // Using the new color
              filter={`url(#glow-inner-${size})`}
            />
          </Svg>
        </Animated.View>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  svgContainer: {
    position: 'relative',
    width: '100%',
    height: '100%',
  },
  animatedLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  glowBackground: {
    position: 'absolute',
  },
})

export default HexagonLoader