import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Image, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import WhisperIcon from '../../../../assets/icons/whisper/speak-line-#002AFF.svg';
import { defaultProfileImage, handWaveImage } from '../../../assets/images';
import type { WeatherData } from '../../../api/weather';
import { styles } from '../../../theme/styles';
import type { WeatherMode } from '../../../types/weather';

type WelcomeSummaryProps = {
  userName?: string;
  profileImageUri?: string | null;
  onWeatherModeChange: (weatherMode: WeatherMode) => void;
  weather: WeatherData | null;
  weatherFallbackEnabled: boolean;
  weatherMode: WeatherMode;
};

const weatherModes: WeatherMode[] = [
  'sunny',
  'cloudy',
  'rainy',
  'stormy',
  'snowy',
  'sunset',
  'sunrise',
];

const weatherContent = {
  sunny: {
    temperature: '30\u00b0',
    meta: 'Sunny for the day',
    gradient: ['#FFFFFF', '#F0F0F0'] as const,
    gradientLocations: [0.54, 1] as const,
  },
  cloudy: {
    temperature: '21\u00b0',
    meta: 'Night will be clear',
    gradient: ['#00051B', '#23314F'] as const,
    gradientLocations: [0.42, 1] as const,
  },
  rainy: {
    temperature: '18\u00b0',
    meta: 'Rain through evening',
    gradient: ['#142033', '#50677F'] as const,
    gradientLocations: [0.38, 1] as const,
  },
  stormy: {
    temperature: '16\u00b0',
    meta: 'Lightning watch',
    gradient: ['#050716', '#2A2148'] as const,
    gradientLocations: [0.3, 1] as const,
  },
  snowy: {
    temperature: '2\u00b0',
    meta: 'Snow showers',
    gradient: ['#F8FCFF', '#D9EAF7'] as const,
    gradientLocations: [0.46, 1] as const,
  },
  sunset: {
    temperature: '26\u00b0',
    meta: 'Golden hour',
    gradient: ['#FFE2B8', '#FF9F7A'] as const,
    gradientLocations: [0.44, 1] as const,
  },
  sunrise: {
    temperature: '22\u00b0',
    meta: 'Morning glow',
    gradient: ['#FFF4DF', '#FFC36B'] as const,
    gradientLocations: [0.46, 1] as const,
  },
} satisfies Record<
  WeatherMode,
  {
    temperature: string;
    meta: string;
    gradient: readonly [string, string];
    gradientLocations: readonly [number, number];
  }
>;

export function WelcomeSummary({
  userName = 'Traveler',
  profileImageUri,
  onWeatherModeChange,
  weather,
  weatherFallbackEnabled,
  weatherMode,
}: WelcomeSummaryProps) {
  const lastWeatherPress = useRef(0);
  const [profileImageLoadFailed, setProfileImageLoadFailed] = useState(false);
  const [whisperEnabled, setWhisperEnabled] = useState(false);
  const [now, setNow] = useState(() => new Date());
  const isDarkWeather =
    weatherMode === 'cloudy' || weatherMode === 'rainy' || weatherMode === 'stormy';
  const fallbackWeather = weatherContent[weatherMode];
  const displayWeather = weatherFallbackEnabled ? null : weather;
  const weatherTemperature = displayWeather
    ? `${displayWeather.current.temp}\u00b0`
    : fallbackWeather.temperature;
  const weatherHumidity = displayWeather?.current.humidity
    ? `${displayWeather.current.humidity}%`
    : '21%';
  const weatherMeta =
    weatherMode === 'sunrise' || weatherMode === 'sunset'
      ? fallbackWeather.meta
      : displayWeather?.current.description || fallbackWeather.meta;
  const weatherCity = displayWeather?.city || 'Adama';
  const profileImageSource = useMemo(
    () =>
      profileImageUri && !profileImageLoadFailed ? { uri: profileImageUri } : defaultProfileImage,
    [profileImageLoadFailed, profileImageUri],
  );
  const timeLabel = useMemo(
    () =>
      new Intl.DateTimeFormat('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(now),
    [now],
  );
  const dayLabel = useMemo(
    () => new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(now),
    [now],
  );
  const monthLabel = useMemo(
    () => new Intl.DateTimeFormat('en-US', { month: 'long' }).format(now),
    [now],
  );
  const dateLabel = useMemo(() => String(now.getDate()).padStart(2, '0'), [now]);
  const yearLabel = useMemo(() => String(now.getFullYear()), [now]);
  const greetingLabel = useMemo(() => {
    const hour = now.getHours();

    if (hour < 12) {
      return 'Good morning';
    }

    if (hour < 17) {
      return 'Good afternoon';
    }

    return 'Good evening';
  }, [now]);

  useEffect(() => {
    setProfileImageLoadFailed(false);
  }, [profileImageUri]);

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);

    return () => clearInterval(timer);
  }, []);

  const handleWeatherPress = () => {
    if (!weatherFallbackEnabled) {
      return;
    }

    const now = Date.now();

    if (now - lastWeatherPress.current >= 300) {
      lastWeatherPress.current = now;
      return;
    }

    const currentIndex = weatherModes.indexOf(weatherMode);
    const nextIndex = (currentIndex + 1) % weatherModes.length;

    onWeatherModeChange(weatherModes[nextIndex]);
    lastWeatherPress.current = 0;
  };

  return (
    <View style={styles.summary}>
      <Modal
        animationType="fade"
        navigationBarTranslucent
        statusBarTranslucent
        transparent
        visible={whisperEnabled}
      >
        <View style={localStyles.lockedScreen}>
          <Pressable
            accessibilityLabel="Turn Whisper off"
            accessibilityRole="button"
            onPress={() => setWhisperEnabled(false)}
            style={localStyles.lockedScreenDismiss}
          />
        </View>
      </Modal>

      <View style={styles.welcomeDashboardShadow}>
        <LinearGradient
          colors={['rgba(0, 42, 255, 0.11)', 'rgba(119, 242, 246, 0.11)']}
          locations={[0, 1]}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
          style={styles.welcomeDashboard}
        >
          <View style={styles.welcomeDashboardHeader}>
            <View style={styles.welcomeDashboardTitleWrap}>
              <Text style={styles.welcomeDashboardTitle}>Dashboard</Text>
            </View>
            <View style={styles.welcomeDateTimeBlock}>
              <Text style={styles.welcomeDate}>
                {dayLabel}, {monthLabel} {dateLabel} {yearLabel}
              </Text>
              <Text style={styles.welcomeTime}>{timeLabel}</Text>
            </View>
          </View>

          <View style={styles.welcomeGreetingBlock}>
            <View style={styles.welcomeAvatarFrame}>
              <Image
                accessibilityIgnoresInvertColors
                onError={() => setProfileImageLoadFailed(true)}
                source={profileImageSource}
                style={styles.welcomeAvatar}
              />
            </View>
            <View style={styles.welcomeGreetingCopy}>
              <View style={styles.welcomeGreetingRow}>
                <Text style={styles.welcomeGreeting}>Hi!</Text>
                <Image
                  accessibilityIgnoresInvertColors
                  source={handWaveImage}
                  style={styles.welcomeHandWave}
                />
              </View>
              <Text style={styles.welcomeSubGreeting}>
                {greetingLabel},{'\n'}Ready for your next journey?
              </Text>
            </View>
          </View>

          <View style={localStyles.whisperControl}>
            <WhisperIcon height={18} width={18} />
            <Pressable
              accessibilityLabel="Toggle Whisper"
              accessibilityRole="switch"
              accessibilityState={{ checked: whisperEnabled }}
              onPress={() => setWhisperEnabled((enabled) => !enabled)}
              style={({ pressed }) => [
                localStyles.whisperToggle,
                whisperEnabled
                  ? localStyles.whisperToggleEnabled
                  : localStyles.whisperToggleDisabled,
                pressed && styles.pressedFeedback,
              ]}
            >
              <View
                style={[
                  localStyles.whisperToggleKnob,
                  whisperEnabled
                    ? localStyles.whisperToggleKnobEnabled
                    : localStyles.whisperToggleKnobDisabled,
                ]}
              />
            </Pressable>
          </View>
        </LinearGradient>
      </View>

      <View style={styles.summaryCards}>
        <View style={styles.tripCard}>
          <View style={styles.tripCopy}>
            <View style={styles.tripIconBubble}>
              <WalletSummaryIcon />
            </View>
            <Text style={styles.tripLabel}>Monthly Spending Total</Text>
            <Text style={styles.tripCount}>$205.00</Text>
          </View>
          <View style={styles.tripActivity}>
            <TripSummaryChart />
            <Text style={styles.tripMeta}>Total trips this month: 3</Text>
            <View style={styles.tripTrendButton}>
              <TrendArrowIcon />
            </View>
          </View>
        </View>
        <Pressable
          accessibilityLabel="Weather summary"
          accessibilityRole="button"
          onPress={handleWeatherPress}
          style={({ pressed }) => [
            styles.weatherCard,
            isDarkWeather && styles.weatherCardCloudy,
            pressed && styles.pressedFeedback,
          ]}
        >
          <View style={styles.weatherCityAndTemperature}>
            <Text style={[styles.weatherCity, isDarkWeather && styles.weatherTextCloudy]}>
              {weatherCity}
            </Text>
            <Text style={[styles.weatherTemp, isDarkWeather && styles.weatherTextCloudy]}>
              {weatherTemperature}
            </Text>
            <WeatherConditionIcon mode={weatherMode} />
          </View>
          <Text style={[styles.weatherMeta, isDarkWeather && styles.weatherTextCloudy]}>
            {weatherMeta}
          </Text>
          <View style={styles.weatherDivider} />
          <View style={styles.weatherMetrics}>
            <View style={styles.weatherMetricItem}>
              <View style={styles.weatherHumidityDot} />
              <Text style={styles.weatherMetricText}>{weatherHumidity}</Text>
            </View>
            <View style={styles.weatherMetricItem}>
              <WindMetricIcon />
              <Text style={styles.weatherMetricText}>12 km/h</Text>
            </View>
            <View style={styles.weatherMetricItem}>
              <UvMetricIcon />
              <Text style={styles.weatherMetricText}>UV 6</Text>
            </View>
          </View>
        </Pressable>
      </View>
    </View>
  );
}

const localStyles = StyleSheet.create({
  lockedScreen: {
    backgroundColor: '#000000',
    flex: 1,
  },
  lockedScreenDismiss: {
    bottom: 0,
    height: 112,
    position: 'absolute',
    right: 0,
    width: 112,
  },
  whisperControl: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    height: 24,
    position: 'absolute',
    right: 17,
    top: 85,
    width: 73,
  },
  whisperToggle: {
    borderRadius: 999,
    height: 24,
    justifyContent: 'center',
    position: 'relative',
    width: 48,
  },
  whisperToggleDisabled: {
    backgroundColor: '#D1D5DC',
  },
  whisperToggleEnabled: {
    backgroundColor: '#002AFF',
  },
  whisperToggleKnob: {
    backgroundColor: '#FFFFFF',
    borderRadius: 10,
    elevation: 4,
    height: 20,
    position: 'absolute',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    width: 20,
  },
  whisperToggleKnobDisabled: {
    left: 2,
  },
  whisperToggleKnobEnabled: {
    right: 2,
  },
});

function WalletSummaryIcon() {
  return (
    <Svg width={19} height={19} viewBox="0 0 19 19" fill="none">
      <Path
        d="M17.4205 5.54167H18.2122V13.4583H17.4205V15.8333C17.4205 16.2706 17.0661 16.625 16.6289 16.625H2.37886C1.94163 16.625 1.58719 16.2706 1.58719 15.8333V3.16667C1.58719 2.72945 1.94163 2.375 2.37886 2.375H16.6289C17.0661 2.375 17.4205 2.72945 17.4205 3.16667V5.54167ZM15.8372 13.4583H11.0872C8.9011 13.4583 7.12886 11.6861 7.12886 9.5C7.12886 7.31388 8.9011 5.54167 11.0872 5.54167H15.8372V3.95833H3.17052V15.0417H15.8372V13.4583ZM16.6289 11.875V7.125H11.0872C9.77549 7.125 8.7122 8.18829 8.7122 9.5C8.7122 10.8117 9.77549 11.875 11.0872 11.875H16.6289ZM11.0872 8.70833H13.4622V10.2917H11.0872V8.70833Z"
        fill="#FFFFFF"
      />
    </Svg>
  );
}

function TripSummaryChart() {
  return (
    <Svg width={64} height={28} viewBox="0 0 64 28" fill="none" style={styles.tripLineChart}>
      <Path d="M0 22 10 18 20 20 30 12 40 14 50 6 64 8V28H0V22Z" fill="#FFFFFF" opacity={0.12} />
      <Path
        d="M0 22 10 18 20 20 30 12 40 14 50 6 64 8"
        stroke="#FFFFFF"
        strokeOpacity={0.7}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function TrendArrowIcon() {
  return (
    <Svg width={13} height={13} viewBox="0 0 13 13" fill="none">
      <Path
        d="M11.9167 3.79166 7.31251 8.39582 4.60418 5.68749 1.08334 9.20832"
        stroke="#FFFFFF"
        strokeWidth={1.08333}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8.66666 3.79166H11.9167V7.04166"
        stroke="#FFFFFF"
        strokeWidth={1.08333}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function WindMetricIcon() {
  return (
    <Svg width={9} height={9} viewBox="0 0 9 9" fill="none">
      <Path
        d="M4.8 7.35C4.89507 7.4213 5.00573 7.46899 5.12284 7.48914C5.23996 7.50929 5.36019 7.50132 5.47363 7.46589C5.58706 7.43045 5.69045 7.36857 5.77527 7.28534C5.8601 7.20211 5.92393 7.09991 5.96151 6.98717C5.99909 6.87443 6.00934 6.75437 5.99142 6.63689C5.9735 6.51941 5.92792 6.40787 5.85843 6.31147C5.78895 6.21506 5.69754 6.13655 5.59176 6.08239C5.48598 6.02824 5.36884 6 5.25 6H0.75M6.5625 3C6.65838 2.87216 6.78535 2.77095 6.93135 2.70598C7.07735 2.64101 7.23754 2.61444 7.39669 2.62879C7.55585 2.64314 7.7087 2.69794 7.84072 2.78797C7.97274 2.87801 8.07956 3.00031 8.15103 3.14324C8.22249 3.28617 8.25624 3.445 8.24905 3.60464C8.24187 3.76428 8.194 3.91944 8.10999 4.05537C8.02597 4.19131 7.9086 4.30351 7.76903 4.38133C7.62945 4.45915 7.4723 4.5 7.3125 4.5H0.75M3.675 1.65C3.77007 1.5787 3.88073 1.53101 3.99784 1.51086C4.11496 1.49071 4.23519 1.49868 4.34863 1.53411C4.46206 1.56955 4.56545 1.63143 4.65027 1.71466C4.7351 1.79789 4.79893 1.90009 4.83651 2.01283C4.87409 2.12557 4.88434 2.24563 4.86642 2.36311C4.8485 2.48059 4.80292 2.59213 4.73343 2.68853C4.66395 2.78494 4.57254 2.86345 4.46676 2.91761C4.36098 2.97176 4.24384 3 4.125 3H0.75"
        stroke="#51A2FF"
        strokeWidth={0.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function UvMetricIcon() {
  return (
    <Svg width={9} height={9} viewBox="0 0 9 9" fill="none">
      <Path
        d="M1.5 5.25C1.42903 5.25024 1.35946 5.23034 1.29935 5.19262C1.23925 5.15489 1.19108 5.10088 1.16045 5.03687C1.12982 4.97286 1.11798 4.90147 1.12631 4.831C1.13464 4.76052 1.16279 4.69386 1.2075 4.63875L4.92 0.81375C4.94785 0.781606 4.98579 0.759884 5.02762 0.75215C5.06944 0.744416 5.11264 0.75113 5.15015 0.771189C5.18765 0.791248 5.21722 0.823461 5.234 0.862541C5.25078 0.90162 5.25378 0.945243 5.2425 0.98625L4.5225 3.24375C4.50127 3.30057 4.49414 3.3617 4.50172 3.42188C4.5093 3.48206 4.53137 3.53951 4.56603 3.58929C4.60069 3.63906 4.64691 3.67969 4.70073 3.70769C4.75454 3.73568 4.81434 3.7502 4.875 3.75H7.5C7.57096 3.74976 7.64054 3.76966 7.70064 3.80738C7.76074 3.84511 7.80891 3.89912 7.83954 3.96313C7.87017 4.02714 7.88201 4.09853 7.87368 4.169C7.86536 4.23948 7.8372 4.30614 7.7925 4.36125L4.08 8.18625C4.05215 8.21839 4.0142 8.24012 3.97238 8.24785C3.93056 8.25558 3.88735 8.24887 3.84985 8.22881C3.81235 8.20875 3.78278 8.17654 3.766 8.13746C3.74922 8.09838 3.74622 8.05476 3.7575 8.01375L4.4775 5.75625C4.49873 5.69943 4.50586 5.63831 4.49828 5.57812C4.49069 5.51794 4.46862 5.46049 4.43396 5.41072C4.3993 5.36094 4.35308 5.32031 4.29927 5.29232C4.24546 5.26432 4.18566 5.2498 4.125 5.25H1.5Z"
        stroke="#C27AFF"
        strokeWidth={0.75}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function WeatherConditionIcon({ mode }: { mode: WeatherMode }) {
  if (mode === 'sunny') {
    return <WeatherSunIcon style={styles.weatherSunnyIcon} />;
  }

  if (mode === 'rainy') {
    return <WeatherRainIcon style={styles.weatherSunnyIcon} />;
  }

  if (mode === 'stormy') {
    return <WeatherStormIcon style={styles.weatherSunnyIcon} />;
  }

  if (mode === 'snowy') {
    return <WeatherSnowIcon style={styles.weatherSunnyIcon} />;
  }

  if (mode === 'sunset') {
    return <WeatherSunsetIcon style={styles.weatherSunnyIcon} />;
  }

  if (mode === 'sunrise') {
    return <WeatherSunriseIcon style={styles.weatherSunnyIcon} />;
  }

  return <WeatherSunIcon style={styles.weatherSunnyIcon} />;
}

function WeatherSunIcon({ style }: { style?: object }) {
  return (
    <Svg width={34} height={34} viewBox="0 0 34 34" fill="none" style={style}>
      <Path
        d="M17 22.6667C20.1296 22.6667 22.6667 20.1296 22.6667 17C22.6667 13.8704 20.1296 11.3333 17 11.3333C13.8704 11.3333 11.3333 13.8704 11.3333 17C11.3333 20.1296 13.8704 22.6667 17 22.6667Z"
        stroke="#FF8904"
        strokeWidth={2.125}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M17 2.83334V5.66668"
        stroke="#FF8904"
        strokeWidth={2.125}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M17 28.3333V31.1667"
        stroke="#FF8904"
        strokeWidth={2.125}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M6.98417 6.98416L8.98167 8.98166"
        stroke="#FF8904"
        strokeWidth={2.125}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M25.0183 25.0183L27.0158 27.0158"
        stroke="#FF8904"
        strokeWidth={2.125}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M2.83334 17H5.66667"
        stroke="#FF8904"
        strokeWidth={2.125}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M28.3333 17H31.1667"
        stroke="#FF8904"
        strokeWidth={2.125}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M8.98167 25.0183L6.98417 27.0158"
        stroke="#FF8904"
        strokeWidth={2.125}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Path
        d="M27.0158 6.98416L25.0183 8.98166"
        stroke="#FF8904"
        strokeWidth={2.125}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

function WeatherRainIcon({ style }: { style?: object }) {
  return (
    <Svg width={43} height={43} viewBox="0 0 43 43" fill="none" style={style}>
      <Path
        d="M11.8325 24H29.7321C34.3971 24 38 20.6147 38 16.2661C38 11.8486 34.2679 8.5321 29.3445 8.5734C27.4928 5.00917 24.1196 3 20.0287 3C14.6603 3 10.1531 6.9633 9.65072 12.1376C6.85167 12.922 5 15.1927 5 17.9862C5 21.5367 7.78469 24 11.8325 24Z"
        fill="#EEF6FB"
        stroke="#9AAFC1"
        strokeWidth={1.1}
      />
      <Path
        d="M13 30.5 10.5 36M21.5 29.5 19 36M30 30.5 27.5 36"
        stroke="#8FE7FF"
        strokeWidth={2.2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function WeatherStormIcon({ style }: { style?: object }) {
  return (
    <Svg width={43} height={43} viewBox="0 0 43 43" fill="none" style={style}>
      <Path
        d="M11.8325 23H29.7321C34.3971 23 38 19.6147 38 15.2661C38 10.8486 34.2679 7.5321 29.3445 7.5734C27.4928 4.00917 24.1196 2 20.0287 2C14.6603 2 10.1531 5.9633 9.65072 11.1376C6.85167 11.922 5 14.1927 5 16.9862C5 20.5367 7.78469 23 11.8325 23Z"
        fill="#D8D6E8"
      />
      <Path
        d="M11.8325 23H29.7321C34.3971 23 38 19.6147 38 15.2661C38 10.8486 34.2679 7.5321 29.3445 7.5734C27.4928 4.00917 24.1196 2 20.0287 2C14.6603 2 10.1531 5.9633 9.65072 11.1376C6.85167 11.922 5 14.1927 5 16.9862C5 20.5367 7.78469 23 11.8325 23Z"
        fill="#4A4967"
        opacity={0.55}
      />
      <Path d="M22.5 19 15.5 31h5.2l-2.2 9 9.3-14.2h-5.4L26 19h-3.5Z" fill="#FFE34D" />
      <Path
        d="M11.5 29.5 8.8 35.5M31.5 28.5 28.8 34.5"
        stroke="#68E6FF"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function WeatherSnowIcon({ style }: { style?: object }) {
  return (
    <Svg width={43} height={43} viewBox="0 0 43 43" fill="none" style={style}>
      <Path
        d="M11.8325 24H29.7321C34.3971 24 38 20.6147 38 16.2661C38 11.8486 34.2679 8.5321 29.3445 8.5734C27.4928 5.00917 24.1196 3 20.0287 3C14.6603 3 10.1531 6.9633 9.65072 12.1376C6.85167 12.922 5 15.1927 5 17.9862C5 21.5367 7.78469 24 11.8325 24Z"
        fill="#EEF6FB"
        stroke="#9AAFC1"
        strokeWidth={1.1}
      />
      <Path
        d="M13 31h.01M21.5 34h.01M30 31h.01"
        stroke="#7DB7D8"
        strokeWidth={4}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function WeatherSunsetIcon({ style }: { style?: object }) {
  return (
    <Svg width={43} height={43} viewBox="0 0 43 43" fill="none" style={style}>
      <Path d="M8 25.5h27" stroke="#8E4B34" strokeWidth={2} strokeLinecap="round" />
      <Path d="M13.5 25.5c0-4.4 3.6-8 8-8s8 3.6 8 8" fill="#FFB23F" />
      <Path
        d="M13.5 25.5c0-4.4 3.6-8 8-8s8 3.6 8 8M11 31h21M15 35h13"
        stroke="#8E4B34"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}

function WeatherSunriseIcon({ style }: { style?: object }) {
  return (
    <Svg width={43} height={43} viewBox="0 0 43 43" fill="none" style={style}>
      <Path d="M8 26.5h27" stroke="#8D5A22" strokeWidth={2} strokeLinecap="round" />
      <Path d="M13.5 26.5c0-4.4 3.6-8 8-8s8 3.6 8 8" fill="#FFD45F" />
      <Path
        d="M21.5 10v4M11.6 14.6l2.8 2.8M31.4 14.6l-2.8 2.8M7.5 22h4M31.5 22h4"
        stroke="#FFB43D"
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Path
        d="M13.5 26.5c0-4.4 3.6-8 8-8s8 3.6 8 8M11 32h21M15 36h13"
        stroke="#8D5A22"
        strokeWidth={2}
        strokeLinecap="round"
      />
    </Svg>
  );
}
