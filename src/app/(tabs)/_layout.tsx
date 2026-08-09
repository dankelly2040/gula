import { View, StyleSheet } from 'react-native';
import { NativeTabs } from 'expo-router/unstable-native-tabs';
import { LogButton } from '../../components/log-button';
import { colors } from '../../constants/theme';

export default function TabsLayout() {
  return (
    // The log action is a floating button over the bar, not a tab item, so
    // the navigator needs a host view to sit inside. Four tabs spread evenly
    // leave the centre clear for it.
    <View style={styles.host}>
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
        <NativeTabs.Trigger name="leaderboard">
          <NativeTabs.Trigger.Label>Leaderboard</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'trophy', selected: 'trophy.fill' }} />
        </NativeTabs.Trigger>
        <NativeTabs.Trigger name="profile">
          <NativeTabs.Trigger.Label>Profile</NativeTabs.Trigger.Label>
          <NativeTabs.Trigger.Icon sf={{ default: 'person', selected: 'person.fill' }} />
        </NativeTabs.Trigger>
      </NativeTabs>

      <LogButton />
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    flex: 1,
  },
});
