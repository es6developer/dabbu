declare module 'react-native-dynamic-app-icon' {
  interface DynamicAppIconModule {
    setAppIcon(name: string | null): void;
    supportsDynamicAppIcon(): Promise<boolean>;
    getIconName(callback: (result: { iconName: string }) => void): void;
  }

  const DynamicAppIconModule: DynamicAppIconModule;
  export default DynamicAppIconModule;
}
