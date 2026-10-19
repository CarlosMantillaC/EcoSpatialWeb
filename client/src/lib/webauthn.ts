import {
  startAuthentication,
  startRegistration,
} from '@simplewebauthn/browser';
import type { AuthResponse, AuthenticatorMethod } from '../types';
import { authApi, setAuthToken } from './api';

export async function enrollDevice(
  email: string,
  name: string,
  method: AuthenticatorMethod,
): Promise<AuthResponse> {
  const { flowId, options } = await authApi.registrationOptions(
    email,
    name,
    method,
  );
  const response = await startRegistration({ optionsJSON: options });
  const auth = await authApi.verifyRegistration(flowId, response);
  setAuthToken(auth.token);
  return auth;
}

export async function loginWithBiometrics(
  email?: string,
): Promise<AuthResponse> {
  const { flowId, options } = await authApi.loginOptions(email);
  const response = await startAuthentication({ optionsJSON: options });
  const auth = await authApi.verifyLogin(flowId, response);
  setAuthToken(auth.token);
  return auth;
}

export function isWebAuthnSupported(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.PublicKeyCredential !== 'undefined'
  );
}

export async function isPlatformAuthenticatorAvailable(): Promise<boolean> {
  if (!isWebAuthnSupported()) return false;
  try {
    const credentialClass = window.PublicKeyCredential as any;
    const check =
      credentialClass?.isUserVerifyingPlatformAuthenticatorAvailable;
    if (typeof check !== 'function') return false;
    return await check.call(credentialClass);
  } catch {
    return false;
  }
}
