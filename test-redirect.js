import { makeRedirectUri } from 'expo-auth-session';

const uri = makeRedirectUri({ scheme: 'hr-email-finder' });
console.log('Generated Redirect URI:', uri);
