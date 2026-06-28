import { LinearGradient } from 'expo-linear-gradient';
import React, { ReactNode, useMemo } from 'react';
import { StyleSheet, View, useWindowDimensions } from 'react-native';
import Svg, { Defs, RadialGradient as SvgRadialGradient, Rect, Stop } from 'react-native-svg';

import type { WeatherMode } from '../../types/weather';

type AppBackgroundProps = {
  children: ReactNode;
  weatherMode?: WeatherMode;
};

const DESIGN_WIDTH = 402;
const DESIGN_HEIGHT = 874;

type GlowBlobProps = {
  width: number;
  height: number;
  left: number;
  top: number;
  colors: readonly string[];
  locations: readonly number[];
  zIndex?: number;
};

type GradientColors = readonly [string, string, ...string[]];

function getGradientStop(color: string) {
  const rgbaMatch = color.match(/^rgba\(\s*(\d+),\s*(\d+),\s*(\d+),\s*([.\d]+)\s*\)$/i);

  if (!rgbaMatch) {
    return {
      stopColor: color,
      stopOpacity: 1,
    };
  }

  const [, red, green, blue, alpha] = rgbaMatch;

  return {
    stopColor: `rgb(${red}, ${green}, ${blue})`,
    stopOpacity: Number(alpha),
  };
}

function GlowBlob({ width, height, left, top, colors, locations, zIndex = 1 }: GlowBlobProps) {
  const gradientId = useMemo(() => `blob-${Math.random().toString(36).slice(2)}`, []);

  return (
    <View
      pointerEvents="none"
      style={[
        styles.blob,
        {
          width,
          height,
          left,
          top,
          zIndex,
        },
      ]}
    >
      <Svg height="100%" style={StyleSheet.absoluteFill} width="100%">
        <Defs>
          <SvgRadialGradient
            id={gradientId}
            cx="50%"
            cy="50%"
            rx="70.71%"
            ry="70.71%"
            gradientUnits="objectBoundingBox"
          >
            {colors.map((color, index) => {
              const { stopColor, stopOpacity } = getGradientStop(color);

              return (
                <Stop
                  key={`${color}-${index}`}
                  offset={locations[index] ?? (colors.length > 1 ? index / (colors.length - 1) : 0)}
                  stopColor={stopColor}
                  stopOpacity={stopOpacity}
                />
              );
            })}
          </SvgRadialGradient>
        </Defs>

        <Rect fill={`url(#${gradientId})`} height="100%" width="100%" x="0" y="0" />
      </Svg>
    </View>
  );
}

const backgroundPalettes = {
  sunny: {
    base: ['#EAF3F9', '#CFEFF3', '#F6E7D7'],
    blueGlow: ['rgba(0, 42, 255, 0.5)', 'rgba(234, 243, 249, 0.3)', 'rgba(0, 0, 0, 0)'],
    peachGlowLarge: ['#FFDCC8', 'rgba(246, 231, 215, 0.8)', 'rgba(0, 0, 0, 0)'],
    peachGlowSmall: ['rgba(246, 231, 215, 0.5)', 'rgba(255, 220, 200, 0.3)', 'rgba(0, 0, 0, 0)'],
    peachGlowBottom: ['#FFDCC8', 'rgba(246, 231, 215, 0.2)', 'rgba(0, 0, 0, 0)'],
    cyanGlow: ['#77F2F6', 'rgba(234, 243, 249, 0.3)', 'rgba(0, 0, 0, 0)'],
  },
  cloudy: {
    base: ['#E9EEF5', '#C9D7E7', '#9EADC0'],
    blueGlow: ['rgba(0, 42, 255, 0.5)', 'rgba(234, 243, 249, 0.3)', 'rgba(0, 0, 0, 0)'],
    peachGlowLarge: ['#BFCADA', 'rgba(219, 226, 235, 0.7)', 'rgba(0, 0, 0, 0)'],
    peachGlowSmall: ['rgba(242, 245, 250, 0.66)', 'rgba(222, 228, 236, 0.25)', 'rgba(0, 0, 0, 0)'],
    peachGlowBottom: ['#AEBCCF', 'rgba(219, 226, 235, 0.25)', 'rgba(0, 0, 0, 0)'],
    cyanGlow: ['#77F2F6', 'rgba(234, 243, 249, 0.3)', 'rgba(0, 0, 0, 0)'],
  },
  rainy: {
    base: ['#DDE8F2', '#9FB4CA', '#6F8299'],
    blueGlow: ['rgba(0, 42, 255, 0.45)', 'rgba(196, 212, 228, 0.25)', 'rgba(0, 0, 0, 0)'],
    peachGlowLarge: ['#7F95AC', 'rgba(179, 194, 210, 0.62)', 'rgba(0, 0, 0, 0)'],
    peachGlowSmall: ['rgba(136, 156, 176, 0.58)', 'rgba(205, 215, 226, 0.25)', 'rgba(0, 0, 0, 0)'],
    peachGlowBottom: ['#68839C', 'rgba(161, 179, 197, 0.26)', 'rgba(0, 0, 0, 0)'],
    cyanGlow: ['#77F2F6', 'rgba(201, 226, 235, 0.28)', 'rgba(0, 0, 0, 0)'],
  },
  stormy: {
    base: ['#070A18', '#171A31', '#2B2442'],
    blueGlow: ['rgba(24, 36, 117, 0.72)', 'rgba(15, 18, 45, 0.4)', 'rgba(0, 0, 0, 0)'],
    peachGlowLarge: ['#2B1F55', 'rgba(95, 66, 140, 0.52)', 'rgba(0, 0, 0, 0)'],
    peachGlowSmall: ['rgba(62, 42, 96, 0.62)', 'rgba(122, 92, 160, 0.2)', 'rgba(0, 0, 0, 0)'],
    peachGlowBottom: ['#1A1439', 'rgba(103, 59, 135, 0.34)', 'rgba(0, 0, 0, 0)'],
    cyanGlow: ['#42D8FF', 'rgba(37, 73, 105, 0.28)', 'rgba(0, 0, 0, 0)'],
  },
  snowy: {
    base: ['#F7FBFF', '#DBEAF7', '#BFD6EA'],
    blueGlow: ['rgba(0, 42, 255, 0.32)', 'rgba(234, 243, 249, 0.3)', 'rgba(0, 0, 0, 0)'],
    peachGlowLarge: ['#FFFFFF', 'rgba(227, 239, 249, 0.75)', 'rgba(0, 0, 0, 0)'],
    peachGlowSmall: ['rgba(255, 255, 255, 0.72)', 'rgba(221, 235, 247, 0.3)', 'rgba(0, 0, 0, 0)'],
    peachGlowBottom: ['#D8ECFA', 'rgba(235, 247, 255, 0.35)', 'rgba(0, 0, 0, 0)'],
    cyanGlow: ['#77F2F6', 'rgba(234, 243, 249, 0.3)', 'rgba(0, 0, 0, 0)'],
  },
  sunset: {
    base: ['#FFE8C8', '#F7B7A8', '#8FC9E8'],
    blueGlow: ['rgba(0, 42, 255, 0.38)', 'rgba(234, 243, 249, 0.28)', 'rgba(0, 0, 0, 0)'],
    peachGlowLarge: ['#FF9F7A', 'rgba(255, 208, 169, 0.7)', 'rgba(0, 0, 0, 0)'],
    peachGlowSmall: ['rgba(255, 196, 143, 0.62)', 'rgba(255, 232, 200, 0.28)', 'rgba(0, 0, 0, 0)'],
    peachGlowBottom: ['#FFB36D', 'rgba(255, 213, 151, 0.35)', 'rgba(0, 0, 0, 0)'],
    cyanGlow: ['#77F2F6', 'rgba(234, 243, 249, 0.3)', 'rgba(0, 0, 0, 0)'],
  },
  sunrise: {
    base: ['#FFF4DF', '#FDD8B5', '#B9E6F4'],
    blueGlow: ['rgba(91, 171, 255, 0.42)', 'rgba(236, 248, 255, 0.34)', 'rgba(0, 0, 0, 0)'],
    peachGlowLarge: ['#FFD37A', 'rgba(255, 184, 125, 0.64)', 'rgba(0, 0, 0, 0)'],
    peachGlowSmall: ['rgba(255, 245, 216, 0.78)', 'rgba(255, 204, 144, 0.36)', 'rgba(0, 0, 0, 0)'],
    peachGlowBottom: ['#FFC2A0', 'rgba(255, 229, 184, 0.38)', 'rgba(0, 0, 0, 0)'],
    cyanGlow: ['#85F4FF', 'rgba(196, 242, 255, 0.38)', 'rgba(0, 0, 0, 0)'],
  },
} satisfies Record<WeatherMode, Record<string, GradientColors>>;

export function AppBackground({ children, weatherMode = 'sunny' }: AppBackgroundProps) {
  const { width, height } = useWindowDimensions();
  const palette = backgroundPalettes[weatherMode];

  const scaleX = (value: number) => (value / DESIGN_WIDTH) * width;
  const scaleY = (value: number) => (value / DESIGN_HEIGHT) * height;

  return (
    <View style={styles.root}>
      <LinearGradient
        colors={palette.base}
        locations={[0, 0.5, 1]}
        style={StyleSheet.absoluteFill}
      />

      <GlowBlob
        width={scaleX(400)}
        height={scaleY(400)}
        left={scaleX(-149)}
        top={scaleY(0)}
        colors={palette.blueGlow}
        locations={[0, 0.5, 0.7]}
        zIndex={1}
      />

      <GlowBlob
        width={scaleX(450)}
        height={scaleY(650)}
        left={scaleX(102)}
        top={scaleY(78)}
        colors={palette.peachGlowLarge}
        locations={[0, 0.5, 0.7]}
        zIndex={2}
      />

      <GlowBlob
        width={scaleX(350)}
        height={scaleY(350)}
        left={scaleX(-100)}
        top={scaleY(340)}
        colors={palette.peachGlowSmall}
        locations={[0, 0.5, 0.7]}
        zIndex={3}
      />

      <GlowBlob
        width={scaleX(300)}
        height={scaleY(300)}
        left={scaleX(152)}
        top={scaleY(512)}
        colors={palette.peachGlowBottom}
        locations={[0, 0.5, 0.7]}
        zIndex={4}
      />

      <GlowBlob
        width={scaleX(400)}
        height={scaleY(400)}
        left={scaleX(161)}
        top={scaleY(762)}
        colors={palette.cyanGlow}
        locations={[0, 0.5, 0.7]}
        zIndex={1}
      />

      <GlowBlob
        width={scaleX(400)}
        height={scaleY(400)}
        left={scaleX(161)}
        top={scaleY(762)}
        colors={palette.cyanGlow}
        locations={[0, 0.5, 0.7]}
        zIndex={2}
      />

      <View style={styles.content}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#EEF6FA',
  },
  blob: {
    position: 'absolute',
    zIndex: 1,
  },
  content: {
    flex: 1,
    zIndex: 10,
  },
});
