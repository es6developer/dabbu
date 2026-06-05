import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

const extra = (Constants.expoConfig as any)?.extra || {};
const googleClientId = extra.googleClientId || '';

const iosClientId = googleClientId;
const androidClientId = extra.androidGoogleClientId || googleClientId;
const webClientId = googleClientId;

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
