import * as WebBrowser from 'expo-web-browser';
import * as Google from 'expo-auth-session/providers/google';
import Constants from 'expo-constants';

WebBrowser.maybeCompleteAuthSession();

const HARDCODED_IOS_CLIENT_ID = '407187036002-5hh2u40fa00m72oumrfrnnj8genlft9s.apps.googleusercontent.com';
const HARDCODED_ANDROID_CLIENT_ID = '407187036002-emb73glp4cjdabsng81iod9ukt91ace0.apps.googleusercontent.com';
const HARDCODED_ANDROID_DEBUG_CLIENT_ID = '407187036002-bj9sonpkhmssd7nfdt9q9ro45u0bq2ip.apps.googleusercontent.com';
const HARDCODED_WEB_CLIENT_ID = '407187036002-f25f6fvjurlbqrf1u5vckkob2or1n9mg.apps.googleusercontent.com';

const extra = (Constants.expoConfig as any)?.extra || {};

const iosClientId = extra.googleClientId || extra.iosGoogleClientId || HARDCODED_IOS_CLIENT_ID;
const androidClientId =
  __DEV__ && (extra.androidDebugGoogleClientId || HARDCODED_ANDROID_DEBUG_CLIENT_ID)
    ? (extra.androidDebugGoogleClientId || HARDCODED_ANDROID_DEBUG_CLIENT_ID)
    : (extra.androidGoogleClientId || HARDCODED_ANDROID_CLIENT_ID);
const webClientId = extra.webGoogleClientId || HARDCODED_WEB_CLIENT_ID;

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
