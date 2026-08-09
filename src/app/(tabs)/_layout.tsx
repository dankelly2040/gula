import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { colors } from '../../constants/theme';

export default function TabsLayout() {
  return (
    <NativeTabs tintColor={colors.brand} minimizeBehavior="onScrollDown">
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>My Pizza</NativeTabs.Trigger.Label>
        {/* No pizza glyph exists in SF Symbols; template PNG gets native tinting. */}
        <NativeTabs.Trigger.Icon
          src={require('../../../assets/tab-icon-pizza.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="discover">
        <NativeTabs.Trigger.Label>Discover</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'safari', selected: 'safari.fill' }} />
      </NativeTabs.Trigger>
      {/* Centre action, deliberately label-less: the glyph carries it.
          Disabled keeps this a native tab item that never switches; the
          navigator still emits tabPress, which log-tab.tsx uses to open the
          /log modal (SDK 56+ behavior). */}
      {/* Named explicitly: with a hidden label and a custom PNG there is no
          text and no SF Symbol left for VoiceOver to fall back on, so the
          button announced as nothing at all. */}
      <NativeTabs.Trigger name="log-tab" disabled accessibilityLabel="Log a pizza">
        {/* `hidden` gives an icon-only tab. Omitting the Label entirely does
            not: the tab falls back to the route name and reads "log-tab".
            The text still feeds the accessibility label. */}
        <NativeTabs.Trigger.Label hidden>Log</NativeTabs.Trigger.Label>
        {/* Slice with the plus knocked out of it. No SF Symbol comes close,
            and a template PNG gets the same native tinting as the My Pizza
            tab. Regenerate with `python3 scripts/make-slice-icon.py`. */}
        <NativeTabs.Trigger.Icon
          src={require('../../../assets/tab-icon-log.png')}
          renderingMode="template"
        />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="leaderboard">
        <NativeTabs.Trigger.Label>Leaderboard</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'trophy', selected: 'trophy.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
