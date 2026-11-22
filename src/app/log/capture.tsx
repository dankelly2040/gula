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
import { CircleButton, PillButton } from '../../components/sticker';
import { CaptureStatus, CaptureTitle, captureShape } from '../../components/capture-chrome';
import { colors, spacing, fontSize } from '../../constants/theme';

// The capture moment in the app's flat shapes: the photo is a plain rounded
// rectangle with no frame, a line under it says what is happening, and the
// controls are grey circles around one red button.
const FREEZE_MS = 550;
const INK = colors.ink;

function Shot({ status, children }: { status: string; children: ReactNode }) {
  return (
    <>
      <View style={[captureShape.viewport, styles.viewport]}>{children}</View>
      <CaptureStatus>{status}</CaptureStatus>
    </>
  );
}

export default function Capture() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const photoUri = useDraftLogStore((s) => s.photoUri);
  const setPhoto = useDraftLogStore((s) => s.setPhoto);
  const startLift = useDraftLogStore((s) => s.startLift);
  const lift = useDraftLogStore((s) => s.lift);
  const liftStartedAt = useRef<number | null>(null);
  // True from the snap until the rate screen takes over: the card holds still
  // and the controls dim, like a shutter that has not come back yet.
  const [holding, setHolding] = useState(false);
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

  // The photo is in: hold it still in the card ("Lifting your slice") while
  // Vision finds the subject, then hand the moment to the rate screen, which
  // plays the dissolve. The hold lasts at least FREEZE_MS even when Vision is
  // instant, so the beat reads as the app thinking.
  const beginLift = (uri: string) => {
    liftStartedAt.current = Date.now();
    setHolding(true);
    setPhoto(uri);
    void startLift(uri);
  };

  useEffect(() => {
    if (lift.status !== 'done' || liftStartedAt.current === null) return;
    const elapsed = Date.now() - liftStartedAt.current;
    const id = setTimeout(() => {
      liftStartedAt.current = null;
      router.push({ pathname: '/log/rate', params: { lift: '1' } });
      // Release after the push has had a frame to mount the rate screen.
      setTimeout(() => setHolding(false), 600);
    }, Math.max(0, FREEZE_MS - elapsed));
    return () => clearTimeout(id);
  }, [lift.status, router]);

  const pickFromLibrary = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]) {
      beginLift(result.assets[0].uri);
    }
  };

  const takePicture = async () => {
    if (!cameraRef.current || !cameraReady || isCapturing) return;
    setIsCapturing(true);
    try {
      const photo = await cameraRef.current.takePictureAsync({ quality: 0.8 });
      if (photo?.uri) {
        beginLift(photo.uri);
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
      <CaptureTitle />

      {photoUri ? (
        <>
          <Shot status={holding ? 'Lifting your slice' : 'Looking good'}>
            <Image source={{ uri: photoUri }} style={styles.fill} contentFit="cover" />
          </Shot>
          <View style={[styles.controls, holding && styles.controlsHeld]}>
            <CircleButton onPress={handleClose} label="Close">
              <Ionicons name="close" size={24} color={INK} />
            </CircleButton>
            <PillButton
              onPress={() => router.push({ pathname: '/log/rate', params: { lift: '1' } })}
              disabled={holding || lift.status === 'pending'}
              icon="checkmark"
              label="Rate it"
            />
            <CircleButton onPress={handleRetake} label="Retake photo">
              <Ionicons name="refresh" size={22} color={INK} />
            </CircleButton>
          </View>
        </>
      ) : cameraBlocked ? (
        <>
          <Shot status={!permission.granted ? 'Camera access needed' : 'Camera unavailable'}>
            <View style={styles.blockedViewport}>
              <Ionicons name="camera-outline" size={48} color={colors.textMuted} />
              <Text style={styles.blockedText}>
                {!permission.granted
                  ? 'Allow camera access in settings, or pick a photo from your library.'
                  : 'The camera could not start here. Pick a photo from your library instead.'}
              </Text>
              {!permission.granted && (
                <Pressable accessibilityRole="button" onPress={() => Linking.openSettings()} hitSlop={8}>
                  <Text style={styles.settingsLink}>Open settings</Text>
                </Pressable>
              )}
            </View>
          </Shot>
          <View style={styles.controls}>
            <CircleButton onPress={handleClose} label="Close">
              <Ionicons name="close" size={24} color={INK} />
            </CircleButton>
            <PillButton onPress={pickFromLibrary} icon="photo.on.rectangle" label="Library" />
            <CircleButton onPress={handleSkip} label="Skip photo">
              <Ionicons name="arrow-forward" size={22} color={INK} />
            </CircleButton>
          </View>
        </>
      ) : (
        <>
          <Shot status="Say cheese">
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
                accessibilityRole="button"
                accessibilityLabel={flash === 'off' ? 'Turn flash on' : 'Turn flash off'}
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
                accessibilityRole="button"
                accessibilityLabel="Flip camera"
                onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
                hitSlop={6}
                style={styles.viewportButton}
              >
                <SymbolView name="arrow.triangle.2.circlepath.camera" size={16} tintColor={INK} />
              </Pressable>
            </View>
          </Shot>
          <View style={styles.controls}>
            <CircleButton onPress={handleClose} label="Close">
              <Ionicons name="close" size={24} color={INK} />
            </CircleButton>
            <PillButton
              onPress={takePicture}
              disabled={isCapturing}
              icon="camera.fill"
              label="Snap it"
            />
            <CircleButton onPress={pickFromLibrary} label="Choose from library">
              <Ionicons name="images-outline" size={22} color={INK} />
            </CircleButton>
          </View>
        </>
      )}

      <Pressable accessibilityRole="button" onPress={handleSkip} hitSlop={8} style={styles.skip}>
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
  viewport: {
    backgroundColor: colors.viewportDark,
  },
  fill: {
    flex: 1,
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
    // No outline: a solid light disc reads on any photo.
    backgroundColor: 'rgba(255, 255, 255, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    marginTop: spacing.lg,
  },
  controlsHeld: {
    opacity: 0.35,
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
