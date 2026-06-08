import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

const extra = (Constants.expoConfig as any)?.extra || {};
const googleClientId = extra.googleClientId || '';
const webGoogleClientId = extra.webGoogleClientId || googleClientId;

const iosClientId = googleClientId;
const androidClientId =
  __DEV__ && extra.androidDebugGoogleClientId
    ? extra.androidDebugGoogleClientId
    : extra.androidGoogleClientId || googleClientId;
const webClientId = webGoogleClientId;

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
