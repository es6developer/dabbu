import Constants from 'expo-constants';

const extra = (Constants.expoConfig as any)?.extra || {};

export const API_URL = extra.apiUrl || 'http://localhost:4000/api/v1';
export const INVITE_BASE_URL = extra.inviteUrl || 'https://external-web.vercel.app/i';
