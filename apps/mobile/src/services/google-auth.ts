import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

const CLIENT_IDS = {
  ios: Constants.expoConfig?.extra?.googleClientId || Constants.expoConfig?.extra?.iosGoogleClientId || '',
  android: Constants.expoConfig?.extra?.androidGoogleClientId || '',
  androidDebug: Constants.expoConfig?.extra?.androidDebugGoogleClientId || '',
  web: Constants.expoConfig?.extra?.webGoogleClientId || '',
};

const iosClientId = CLIENT_IDS.ios;
const androidClientId = __DEV__ && CLIENT_IDS.androidDebug ? CLIENT_IDS.androidDebug : CLIENT_IDS.android;
const webClientId = CLIENT_IDS.web;

export function useGoogleAuth() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId,
    androidClientId,
    webClientId,
    selectAccount: true,
  });

  return {
    request,
    response,
    promptAsync,
    isLoading: !request,
  };
}

export function getGoogleIdToken(response: any): string | null {
  if (response?.type === 'success') {
    return response.params?.id_token || null;
  }
  return null;
}

export function getGoogleError(response: any): string | null {
  if (!response) {
    return null;
  }
  if (response.type === 'error') {
    return response.params?.error || response.error || 'Google sign-in was cancelled or failed';
  }
  return null;
}
