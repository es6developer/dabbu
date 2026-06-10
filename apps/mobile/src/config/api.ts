import Constants from 'expo-constants';

const extra = (Constants.expoConfig as any)?.extra || {};

export const API_URL = extra.apiUrl || 'https://dabbu-zmkh.onrender.com/api/v1';
export const INVITE_BASE_URL = extra.inviteUrl || 'https://external-web.vercel.app';
