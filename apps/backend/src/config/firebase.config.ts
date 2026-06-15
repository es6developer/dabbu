import { registerAs } from '@nestjs/config';
import { firebaseCredentials } from './firebase.credentials';

export default registerAs('firebase', () => ({
  projectId: process.env.FIREBASE_PROJECT_ID || firebaseCredentials.project_id,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL || firebaseCredentials.client_email,
  privateKey: process.env.FIREBASE_PRIVATE_KEY
    ? process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n')
    : firebaseCredentials.private_key,
}));
