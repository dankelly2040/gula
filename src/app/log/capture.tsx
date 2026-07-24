import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useDraftLogStore } from '../../state/draft-log';
import { colors, spacing, fontSize, radii } from '../../constants/theme';

export default function Capture() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const photoUri = useDraftLogStore((s) => s.photoUri);
  const setPhoto = useDraftLogStore((s) => s.setPhoto);
  const reset = useDraftLogStore((s) => s.reset);

  const pickImage = async (useCamera: boolean) => {
    const method = useCamera
      ? ImagePicker.launchCameraAsync
      : ImagePicker.launchImageLibraryAsync;

    const result = await method({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
    });

    if (!result.canceled && result.assets[0]) {
      setPhoto(result.assets[0].uri);
    }
  };

  const handleClose = () => {
    reset();
    router.back();
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <Pressable onPress={handleClose}>
          <Ionicons name="close" size={28} color={colors.textPrimary} />
        </Pressable>
        <Text style={styles.title}>Snap your slice</Text>
        <View style={{ width: 28 }} />
      </View>

      <View style={styles.content}>
        {photoUri ? (
          <View style={styles.previewContainer}>
            <Image source={{ uri: photoUri }} style={styles.preview} contentFit="cover" />
            <Pressable
              style={styles.retakeButton}
              onPress={() => setPhoto(null)}
            >
              <Ionicons name="refresh" size={20} color={colors.textPrimary} />
              <Text style={styles.retakeText}>Retake</Text>
            </Pressable>
          </View>
        ) : (
          <View style={styles.pickOptions}>
            <Pressable style={styles.pickButton} onPress={() => pickImage(true)}>
              <Ionicons name="camera" size={48} color={colors.brand} />
              <Text style={styles.pickText}>Take photo</Text>
            </Pressable>

            <Pressable style={styles.pickButton} onPress={() => pickImage(false)}>
              <Ionicons name="images" size={48} color={colors.brand} />
              <Text style={styles.pickText}>Choose from library</Text>
            </Pressable>
          </View>
        )}
      </View>

      <View style={[styles.bottom, { paddingBottom: insets.bottom + spacing.lg }]}>
        <Pressable
          style={styles.nextButton}
          onPress={() => router.push('/log/rate')}
        >
          <Text style={styles.nextButtonText}>
            {photoUri ? 'Next: Rate it' : 'Skip photo'}
          </Text>
          <Ionicons name="arrow-forward" size={20} color={colors.textPrimary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.lg,
  },
  title: {
    fontSize: fontSize.lg,
    fontWeight: '700',
    color: colors.textPrimary,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  previewContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
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
  pickOptions: {
    flex: 1,
    justifyContent: 'center',
    gap: spacing.lg,
  },
  pickButton: {
    backgroundColor: colors.bgCard,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
  },
  pickText: {
    fontSize: fontSize.md,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  bottom: {
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
    color: colors.textPrimary,
    fontSize: fontSize.lg,
    fontWeight: '700',
  },
});
