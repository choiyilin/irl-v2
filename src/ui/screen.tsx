import { type ReactNode } from 'react';
import { View } from 'react-native';
import { StyleSheet } from 'react-native-unistyles';
import { SafeAreaView } from 'react-native-safe-area-context';

export type ScreenProps = Readonly<{
  children: ReactNode;
  edges?: ReadonlyArray<'top' | 'right' | 'bottom' | 'left'>;
}>;

export const Screen = ({ children, edges = ['top', 'left', 'right'] }: ScreenProps) => (
  <SafeAreaView style={styles.safe} edges={[...edges]}>
    <View style={styles.container}>{children}</View>
  </SafeAreaView>
);

const styles = StyleSheet.create((theme) => ({
  safe: { flex: 1, backgroundColor: theme.colors.background },
  container: { flex: 1, paddingHorizontal: theme.space.lg },
}));
