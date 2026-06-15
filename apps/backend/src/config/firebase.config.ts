import { registerAs } from '@nestjs/config';
import { firebaseCredentials } from './firebase.credentials';

export default registerAs('firebase', () => ({
  projectId: firebaseCredentials.project_id,
  clientEmail: firebaseCredentials.client_email,
  privateKey: firebaseCredentials.private_key,
}));
