import Svg, { Circle, Path, Polygon, Rect } from 'react-native-svg';
import { colors, illustration } from '../constants/theme';

// Flat pizza-palette illustrations for the "How it works" screen. They are
// drawn in the same style as the splash slice (no outlines, crust / cheese /
// pepperoni fills) so the first screens read as one family. All four share a
// 64-unit viewBox and scale with `size`.

type ArtProps = { size?: number };
type SliceProps = ArtProps & {
  /** Draw the whole slice in one color, for a shadow or an extruded edge. */
  mono?: string;
};

/** A slice, tip down. "Eat pizza." */
export function SliceArt({ size = 44, mono }: SliceProps) {
  if (mono) {
    return (
      <Svg width={size} height={size} viewBox="0 0 64 64">
        <Path d="M5 17 C21 8 43 8 59 17 L34 60 Q32 63 30 60 Z" fill={mono} />
      </Svg>
    );
  }
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path d="M5 17 C21 8 43 8 59 17 L34 60 Q32 63 30 60 Z" fill={illustration.crustLight} />
      <Path
        d="M11 21 C24 14.5 40 14.5 53 21 L33.2 56 Q32 58 30.8 56 Z"
        fill={illustration.cheese}
      />
      <Circle cx={32} cy={29} r={4.4} fill={illustration.pepperoni} />
      <Circle cx={26} cy={40} r={3.2} fill={illustration.pepperoni} />
      <Circle cx={38} cy={40.5} r={3.2} fill={illustration.pepperoni} />
      <Circle cx={32} cy={49.5} r={2.4} fill={illustration.pepperoni} />
    </Svg>
  );
}

/** A camera whose lens is a tiny pizza. "Log a pic." */
export function CameraArt({ size = 44 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Rect x={22} y={10} width={20} height={12} rx={4} fill={illustration.pepperoni} />
      <Rect x={5} y={17} width={54} height={38} rx={9} fill={illustration.pepperoni} />
      <Circle cx={49.5} cy={25.5} r={2.6} fill={illustration.cheesePale} />
      <Circle cx={32} cy={36.5} r={14} fill={illustration.cheesePale} />
      <Circle cx={32} cy={36.5} r={10.5} fill={illustration.crustLight} />
      <Circle cx={32} cy={36.5} r={8.2} fill={illustration.cheese} />
      <Circle cx={29} cy={33.5} r={1.9} fill={illustration.pepperoni} />
      <Circle cx={35.8} cy={35.6} r={1.9} fill={illustration.pepperoni} />
      <Circle cx={30.6} cy={40.2} r={1.9} fill={illustration.pepperoni} />
    </Svg>
  );
}

/** A gold point token with a star. "Earn Pizza Points." */
export function PointsArt({ size = 44 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx={32} cy={32} r={27} fill={colors.gold} />
      <Circle cx={32} cy={32} r={21.5} fill={illustration.cheese} />
      <Polygon
        points="32,18.5 35.4,27.3 44.8,27.8 37.5,33.8 39.9,42.9 32,37.8 24.1,42.9 26.5,33.8 19.2,27.8 28.6,27.3"
        fill={colors.surface}
      />
    </Svg>
  );
}

/** A crown with pepperoni jewels. "Become pizza royalty." */
export function CrownArt({ size = 44 }: ArtProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Path d="M8 47 L10 21 L22 33 L32 15 L42 33 L54 21 L56 47 Z" fill={illustration.cheese} />
      <Rect x={7} y={44} width={50} height={10} rx={3.5} fill={illustration.crustLight} />
      <Circle cx={10} cy={20} r={4.2} fill={illustration.pepperoni} />
      <Circle cx={32} cy={14} r={4.8} fill={illustration.pepperoni} />
      <Circle cx={54} cy={20} r={4.2} fill={illustration.pepperoni} />
      <Circle cx={20} cy={49} r={2.1} fill={illustration.cheesePale} />
      <Circle cx={32} cy={49} r={2.4} fill={illustration.basil} />
      <Circle cx={44} cy={49} r={2.1} fill={illustration.cheesePale} />
    </Svg>
  );
}
