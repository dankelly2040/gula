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
      {/* Disabled keeps this a native tab item that never switches: the
          navigator still emits tabPress, which log-tab.tsx uses to open the
          /log modal (SDK 56+ behavior). */}
      <NativeTabs.Trigger name="log-tab" disabled>
        <NativeTabs.Trigger.Label>Log</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="plus.circle.fill" />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="discover">
        <NativeTabs.Trigger.Label>Discover</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'safari', selected: 'safari.fill' }} />
      </NativeTabs.Trigger>
      <NativeTabs.Trigger name="profile">
        <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
