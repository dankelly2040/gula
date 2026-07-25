import { useEffect, useRef, useState, type ReactNode } from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
import { goBack } from '../../lib/nav';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { SymbolView } from 'expo-symbols';
import {
  CameraView,
  useCameraPermissions,
  type CameraType,
  type FlashMode,
} from 'expo-camera';
import { useDraftLogStore } from '../../state/draft-log';
import { colors, spacing, fontSize, radii } from '../../constants/theme';

// Sticker-card chrome, scoped to the capture moment: mustard frame, hard
// offset shadows, chunky white utility circles, one big pill action.
const FRAME = '#EBC257';
const INK = colors.textPrimary;
const WHITE = '#FFFEF7';

function CircleButton({
  onPress,
  children,
}: {
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable onPress={onPress} hitSlop={6}>
      {({ pressed }) => (
        <View style={[styles.circleButton, pressed && styles.pressedDown]}>{children}</View>
      )}
    </Pressable>
  );
}

function PillButton({
  onPress,
  disabled,
  icon,
  label,
}: {
  onPress: () => void;
  disabled?: boolean;
  icon: string;
  label: string;
}) {
  return (
    <Pressable onPress={onPress} disabled={disabled}>
      {({ pressed }) => (
        <View
          style={[styles.pillButton, pressed && styles.pressedDown, disabled && styles.pillDisabled]}
        >
          <SymbolView name={icon as never} size={18} tintColor={WHITE} />
          <Text style={styles.pillText}>{label}</Text>
        </View>
      )}
    </Pressable>
  );
}

function StickerCard({ badge, children }: { badge: string; children: ReactNode }) {
  return (
    <View style={styles.card}>
      <View style={styles.viewport}>{children}</View>
      {/* playful corner confetti, echoing the reward burst */}
      <View style={[styles.dot, styles.dotTopLeft]} />
      <View style={[styles.dot, styles.dotBottomRight]} />
      <View style={styles.sprinkle} />
      <View style={styles.badge}>
        <Text style={styles.badgeText}>{badge}</Text>
      </View>
    </View>
  );
}

export default function Capture() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const photoUri = useDraftLogStore((s) => s.photoUri);
  const setPhoto = useDraftLogStore((s) => s.setPhoto);
  const reset = useDraftLogStore((s) => s.reset);

  const cameraRef = useRef<CameraView>(null);
  const [permission, requestPermission] = useCameraPermissions();
  const [facing, setFacing] = useState<CameraType>('back');
  const [flash, setFlash] = useState<FlashMode>('off');
  const [cameraReady, setCameraReady] = useState(false);
  const [mountError, setMountError] = useState<string | null>(null);
  const [isCapturing, setIsCapturing] = useState(false);

  // Ask contextually on first open (the app.json reason string shows here).
  useEffect(() => {
    if (permission && !permission.granted && permission.canAskAgain) {
      requestPermission();
    }
  }, [permission, requestPermission]);

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0].uri);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current || !cameraReady || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        setPhoto(photo.uri);
      }
    } catch {
      // Capture failed (for example on hardware without a camera); stay on the live view.
    } finally {
      setIsCapturing(false);
    }
  };

  const handleClose = () => {
    reset();
    goBack();
  };

  const handleSkip = () => {
    router.push('/log/rate');
  };

  const handleRetake = () => {
    setCameraReady(false);
    setPhoto(null);
  };

  // Waiting for the permission response (system prompt may be up).
  if (!permission || (!permission.granted && permission.canAskAgain && !photoUri)) {
    return <View style={styles.screen} />;
  }

  // Permission denied, or the camera failed to start (for example on a simulator).
  const cameraBlocked = !photoUri && (!permission.granted || mountError !== null);

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <Text style={styles.title}>Snap your slice</Text>
      <Text style={styles.tagline}>snap · rate · log</Text>

      {photoUri ? (
        <>
          <StickerCard badge="Looking good">
            <Image source={{ uri: photoUri }} style={styles.fill} contentFit="cover" />
          </StickerCard>
          <View style={styles.controls}>
            <CircleButton onPress={handleClose}>
              <Ionicons name="close" size={24} color={INK} />
            </CircleButton>
            <PillButton
              onPress={() => router.push('/log/rate')}
              icon="checkmark"
              label="Rate it"
            />
            <CircleButton onPress={handleRetake}>
              <Ionicons name="refresh" size={22} color={INK} />
            </CircleButton>
          </View>
        </>
      ) : cameraBlocked ? (
        <>
          <StickerCard badge={!permission.granted ? 'Camera access needed' : 'Camera unavailable'}>
            <View style={styles.blockedViewport}>
              <Ionicons name="camera-outline" size={48} color={colors.textMuted} />
              <Text style={styles.blockedText}>
                {!permission.granted
                  ? 'Allow camera access in settings, or pick a photo from your library.'
                  : 'The camera could not start here. Pick a photo from your library instead.'}
              </Text>
              {!permission.granted && (
                <Pressable onPress={() => Linking.openSettings()} hitSlop={8}>
                  <Text style={styles.settingsLink}>Open settings</Text>
                </Pressable>
              )}
            </View>
          </StickerCard>
          <View style={styles.controls}>
            <CircleButton onPress={handleClose}>
              <Ionicons name="close" size={24} color={INK} />
            </CircleButton>
            <PillButton onPress={pickFromLibrary} icon="photo.on.rectangle" label="Library" />
            <CircleButton onPress={handleSkip}>
              <Ionicons name="arrow-forward" size={22} color={INK} />
            </CircleButton>
          </View>
        </>
      ) : (
        <>
          <StickerCard badge="Say cheese">
            <CameraView
              ref={cameraRef}
              style={styles.fill}
              facing={facing}
              flash={flash}
              onCameraReady={() => setCameraReady(true)}
              onMountError={(event) => setMountError(event.message ?? 'Camera failed to start')}
            />
            <View style={styles.viewportButtons}>
              <Pressable
                onPress={() => setFlash((f) => (f === 'off' ? 'on' : 'off'))}
                hitSlop={6}
                style={styles.viewportButton}
              >
                <SymbolView
                  name={flash === 'off' ? 'bolt.slash.fill' : 'bolt.fill'}
                  size={16}
                  tintColor={INK}
                />
              </Pressable>
              <Pressable
                onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
                hitSlop={6}
                style={styles.viewportButton}
              >
                <SymbolView name="arrow.triangle.2.circlepath.camera" size={16} tintColor={INK} />
              </Pressable>
            </View>
          </StickerCard>
          <View style={styles.controls}>
            <CircleButton onPress={handleClose}>
              <Ionicons name="close" size={24} color={INK} />
            </CircleButton>
            <PillButton
              onPress={takePicture}
              disabled={isCapturing}
              icon="camera.fill"
              label="Snap it"
            />
            <CircleButton onPress={pickFromLibrary}>
              <Ionicons name="images-outline" size={22} color={INK} />
            </CircleButton>
          </View>
        </>
      )}

      <Pressable onPress={handleSkip} hitSlop={8} style={styles.skip}>
        <Text style={styles.skipText}>Skip photo</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  title: {
    fontSize: fontSize.xl,
    fontWeight: '800',
    color: INK,
    marginTop: spacing.sm,
  },
  tagline: {
    fontSize: fontSize.xs,
    fontWeight: '700',
    letterSpacing: 3,
    textTransform: 'uppercase',
    color: colors.textMuted,
    marginTop: 2,
    marginBottom: spacing.lg,
  },
  card: {
    alignSelf: 'stretch',
    backgroundColor: FRAME,
    borderRadius: 28,
    padding: spacing.md,
    paddingTop: spacing.lg + spacing.xs,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 7 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 8,
  },
  viewport: {
    borderRadius: 20,
    overflow: 'hidden',
    aspectRatio: 3 / 4,
    backgroundColor: '#1B1610',
  },
  fill: {
    flex: 1,
  },
  badge: {
    position: 'absolute',
    top: -14,
    alignSelf: 'center',
    backgroundColor: WHITE,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: INK,
    paddingVertical: 6,
    paddingHorizontal: spacing.md,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 0,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
    color: INK,
  },
  dot: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  dotTopLeft: {
    top: 10,
    left: 14,
    backgroundColor: '#C43C24',
  },
  dotBottomRight: {
    bottom: 10,
    right: 16,
    backgroundColor: '#75A24E',
  },
  sprinkle: {
    position: 'absolute',
    bottom: 12,
    left: 22,
    width: 16,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.brand,
    transform: [{ rotate: '-18deg' }],
  },
  viewportButtons: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: 'row',
    gap: spacing.sm,
  },
  viewportButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.xl,
  },
  circleButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: WHITE,
    borderWidth: 1.5,
    borderColor: INK,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: INK,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 6,
  },
  pillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.brand,
    borderRadius: radii.full,
    borderWidth: 1.5,
    borderColor: INK,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    shadowColor: INK,
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 0,
    elevation: 6,
  },
  pillDisabled: {
    opacity: 0.6,
  },
  pillText: {
    color: WHITE,
    fontSize: fontSize.md,
    fontWeight: '800',
    letterSpacing: 1.5,
    textTransform: 'uppercase',
  },
  pressedDown: {
    transform: [{ translateY: 3 }],
    shadowOffset: { width: 0, height: 2 },
  },
  skip: {
    marginTop: spacing.lg,
    paddingVertical: spacing.sm,
  },
  skipText: {
    color: colors.textMuted,
    fontSize: fontSize.md,
    fontWeight: '600',
  },

  // Blocked state content inside the viewport
  blockedViewport: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.bgCard,
  },
  blockedText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  settingsLink: {
    color: colors.brand,
    fontSize: fontSize.md,
    fontWeight: '700',
    paddingVertical: spacing.xs,
  },
});
