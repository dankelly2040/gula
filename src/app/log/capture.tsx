import { useEffect, useRef, useState } from 'react';
import { View, Text, StyleSheet, Pressable, Linking } from 'react-native';
import { useRouter } from 'expo-router';
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

const WHITE = '#FFFFFF';

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
    router.back();
  };

  const handleSkip = () => {
    router.push('/log/rate');
  };

  const handleRetake = () => {
    setCameraReady(false);
    setPhoto(null);
  };

  // Preview state: photo taken or picked.
  if (photoUri) {
    return (
      <View style={[styles.previewScreen, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.previewHeader}>
          <Pressable onPress={handleClose} hitSlop={8}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.previewTitle}>Snap your slice</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.previewContainer}>
          <Image source={{ uri: photoUri }} style={styles.preview} contentFit="cover" />
          <Pressable style={styles.retakeButton} onPress={handleRetake}>
            <Ionicons name="refresh" size={20} color={colors.textPrimary} />
            <Text style={styles.retakeText}>Retake</Text>
          </Pressable>
        </View>

        <View style={[styles.previewBottom, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Pressable style={styles.nextButton} onPress={() => router.push('/log/rate')}>
            <Text style={styles.nextButtonText}>Next: Rate it</Text>
            <Ionicons name="arrow-forward" size={20} color={WHITE} />
          </Pressable>
        </View>
      </View>
    );
  }

  // Waiting for the permission response (system prompt may be up).
  if (!permission || (!permission.granted && permission.canAskAgain)) {
    return <View style={styles.previewScreen} />;
  }

  // Permission denied, or the camera failed to start (for example on a simulator).
  if (!permission.granted || mountError) {
    const denied = !permission.granted;
    return (
      <View style={[styles.previewScreen, { paddingTop: insets.top + spacing.md }]}>
        <View style={styles.previewHeader}>
          <Pressable onPress={handleClose} hitSlop={8}>
            <Ionicons name="close" size={28} color={colors.textPrimary} />
          </Pressable>
          <Text style={styles.previewTitle}>Snap your slice</Text>
          <View style={{ width: 28 }} />
        </View>

        <View style={styles.fallbackContent}>
          <Ionicons name="camera-outline" size={56} color={colors.textMuted} />
          <Text style={styles.fallbackTitle}>
            {denied ? 'Camera access needed' : 'Camera unavailable'}
          </Text>
          <Text style={styles.fallbackBody}>
            {denied
              ? 'Gula uses the camera to snap your slice so you can rate it. Allow camera access in settings, or pick a photo from your library instead.'
              : 'The camera could not start on this device. Pick a photo from your library instead, or skip for now.'}
          </Text>
          {denied && (
            <Pressable onPress={() => Linking.openSettings()} hitSlop={8}>
              <Text style={styles.settingsLink}>Open settings</Text>
            </Pressable>
          )}

          <Pressable style={styles.libraryCard} onPress={pickFromLibrary}>
            <Ionicons name="images" size={40} color={colors.brand} />
            <Text style={styles.libraryCardText}>Choose from library</Text>
          </Pressable>
        </View>

        <View style={[styles.previewBottom, { paddingBottom: insets.bottom + spacing.lg }]}>
          <Pressable style={styles.nextButton} onPress={handleSkip}>
            <Text style={styles.nextButtonText}>Skip photo</Text>
            <Ionicons name="arrow-forward" size={20} color={WHITE} />
          </Pressable>
        </View>
      </View>
    );
  }

  // Live camera.
  return (
    <View style={styles.cameraScreen}>
      <CameraView
        ref={cameraRef}
        style={StyleSheet.absoluteFill}
        facing={facing}
        flash={flash}
        onCameraReady={() => setCameraReady(true)}
        onMountError={(event) => setMountError(event.message ?? 'Camera failed to start')}
      />

      {/* Slice framing guide */}
      <View style={styles.guideLayer} pointerEvents="none">
        <View style={styles.wedge}>
          <View style={[styles.wedgeLine, styles.wedgeCrust]} />
          <View style={[styles.wedgeLine, styles.wedgeSideLeft]} />
          <View style={[styles.wedgeLine, styles.wedgeSideRight]} />
        </View>
        <View style={styles.guidePill}>
          <Text style={styles.guidePillText}>Frame your slice</Text>
        </View>
      </View>

      {/* Top bar */}
      <View style={[styles.topBar, { paddingTop: insets.top + spacing.sm }]}>
        <Pressable onPress={handleClose} hitSlop={8} style={styles.iconButton}>
          <SymbolView name="xmark" size={22} tintColor={WHITE} />
        </Pressable>
        <View style={styles.topBarRight}>
          <Pressable
            onPress={() => setFlash((f) => (f === 'off' ? 'on' : 'off'))}
            hitSlop={8}
            style={styles.iconButton}
          >
            <SymbolView
              name={flash === 'off' ? 'bolt.slash.fill' : 'bolt.fill'}
              size={22}
              tintColor={WHITE}
            />
          </Pressable>
          <Pressable
            onPress={() => setFacing((f) => (f === 'back' ? 'front' : 'back'))}
            hitSlop={8}
            style={styles.iconButton}
          >
            <SymbolView
              name="arrow.triangle.2.circlepath.camera"
              size={24}
              tintColor={WHITE}
            />
          </Pressable>
        </View>
      </View>

      {/* Bottom controls */}
      <View style={[styles.bottomBar, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Pressable onPress={pickFromLibrary} hitSlop={8} style={styles.bottomSide}>
          <SymbolView name="photo.on.rectangle" size={28} tintColor={WHITE} />
        </Pressable>

        <Pressable onPress={takePicture} disabled={isCapturing}>
          {({ pressed }) => (
            <View
              style={[
                styles.shutterRing,
                pressed && styles.shutterPressed,
                isCapturing && styles.shutterDisabled,
              ]}
            >
              <View style={styles.shutterDisc} />
            </View>
          )}
        </Pressable>

        <Pressable onPress={handleSkip} hitSlop={8} style={styles.bottomSide}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>
    </View>
  );
}

// Wedge guide geometry: slice tip at bottom center, crust along the top,
// sides drawn as rotated dashed lines.
const WEDGE_WIDTH = 220;
const WEDGE_HEIGHT = 240;
const SIDE_LENGTH = 236;

const styles = StyleSheet.create({
  // Camera state
  cameraScreen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  guideLayer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    alignItems: 'center',
    justifyContent: 'center',
  },
  wedge: {
    width: WEDGE_WIDTH,
    height: WEDGE_HEIGHT,
  },
  wedgeLine: {
    position: 'absolute',
    height: 0,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: 'rgba(255, 255, 255, 0.85)',
    borderRadius: 1,
  },
  wedgeCrust: {
    top: 20,
    left: 25,
    width: WEDGE_WIDTH - 50,
  },
  wedgeSideLeft: {
    top: 129,
    left: (WEDGE_WIDTH - 50) / 4 + 25 - SIDE_LENGTH / 2,
    width: SIDE_LENGTH,
    transform: [{ rotate: '69deg' }],
  },
  wedgeSideRight: {
    top: 129,
    left: WEDGE_WIDTH - 25 - (WEDGE_WIDTH - 50) / 4 - SIDE_LENGTH / 2,
    width: SIDE_LENGTH,
    transform: [{ rotate: '-69deg' }],
  },
  guidePill: {
    marginTop: spacing.lg,
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
    borderRadius: radii.full,
    paddingVertical: spacing.xs + 2,
    paddingHorizontal: spacing.md,
  },
  guidePillText: {
    color: WHITE,
    fontSize: fontSize.sm,
    fontWeight: '600',
  },
  topBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
  },
  iconButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
  },
  bottomSide: {
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterRing: {
    width: 76,
    height: 76,
    borderRadius: radii.full,
    borderWidth: 4,
    borderColor: WHITE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterPressed: {
    transform: [{ scale: 0.92 }],
  },
  shutterDisabled: {
    opacity: 0.6,
  },
  shutterDisc: {
    width: 58,
    height: 58,
    borderRadius: radii.full,
    backgroundColor: colors.brand,
  },
  skipText: {
    color: WHITE,
    fontSize: fontSize.md,
    fontWeight: '600',
  },

  // Preview and fallback states (butter theme)
  previewScreen: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  previewTitle: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  previewContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  preview: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: radii.lg,
  },
  retakeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginTop: spacing.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.bgCard,
    borderRadius: radii.full,
  },
  retakeText: {
    color: colors.textPrimary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  previewBottom: {
    paddingHorizontal: spacing.lg,
  },
  nextButton: {
    backgroundColor: colors.brand,
    borderRadius: radii.lg,
    paddingVertical: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  nextButtonText: {
    color: WHITE,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },

  // Fallback (denied or camera unavailable)
  fallbackContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    gap: spacing.md,
  },
  fallbackTitle: {
    fontSize: fontSize.xl,
    fontWeight: '700',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  fallbackBody: {
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
  libraryCard: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    padding: spacing.lg,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  libraryCardText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
});
