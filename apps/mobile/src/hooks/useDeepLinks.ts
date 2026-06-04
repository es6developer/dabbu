import { useState, useEffect, useCallback, useRef } from 'react';
import * as Linking from 'expo-linking';
import { resolveInvite, InviteData } from '../services/external-sharing';

export type DeepLinkType = 'invite' | 'referral' | 'unknown';

interface ParsedDeepLink {
  type: DeepLinkType;
  token: string | null;
  groupId: string | null;
}

interface DeepLinkState {
  type: DeepLinkType;
  token: string | null;
  groupId: string | null;
  isValid: boolean;
  loading: boolean;
  error: string | null;
  inviteData: InviteData | null;
}

export function useDeepLinks() {
  const [state, setState] = useState<DeepLinkState>({
    type: 'unknown',
    token: null,
    groupId: null,
    isValid: false,
    loading: false,
    error: null,
    inviteData: null,
  });

  const processingRef = useRef(false);

  const parseURL = useCallback((url: string): ParsedDeepLink | null => {
    if (!url) {return null;}

    const parsed = Linking.parse(url);
    const path = parsed.path || parsed.hostname || '';
    const queryParams = parsed.queryParams || {};

    const inviteMatch = path.match(/invite\/(.+)/);
    if (inviteMatch) {
      return {
        type: 'invite',
        token: inviteMatch[1],
        groupId: (queryParams as any).groupId || null,
      };
    }

    const referralMatch = path.match(/referral\/(.+)/);
    if (referralMatch) {
      return {
        type: 'referral',
        token: referralMatch[1],
        groupId: null,
      };
    }

    return null;
  }, []);

  const validateInvite = useCallback(async (token: string) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const inviteData = await resolveInvite(token);
      setState(prev => ({
        ...prev,
        isValid: inviteData.isValid,
        loading: false,
        inviteData,
        groupId: inviteData.groupId,
        error: inviteData.isValid ? null : 'This invite link has expired or is no longer valid.',
      }));
      return inviteData;
    } catch (err: any) {
      const message = err?.message || 'Failed to validate invite link. Please try again.';
      setState(prev => ({ ...prev, isValid: false, loading: false, error: message }));
      return null;
    }
  }, []);

  const handleDeepLink = useCallback(async (url: string) => {
    if (processingRef.current) {return;}
    processingRef.current = true;

    try {
      const parsed = parseURL(url);
      if (!parsed) {
        setState(prev => ({ ...prev, type: 'unknown', loading: false }));
        return;
      }

      setState(prev => ({
        ...prev,
        type: parsed.type,
        token: parsed.token,
        groupId: parsed.groupId,
      }));

      if (parsed.type === 'invite' && parsed.token) {
        await validateInvite(parsed.token);
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    } finally {
      processingRef.current = false;
    }
  }, [parseURL, validateInvite]);

  useEffect(() => {
    const initUrl = Linking.createURL('/');
    Linking.getInitialURL().then((url) => {
      if (url && url !== initUrl) {
        handleDeepLink(url);
      }
    });

    const subscription = Linking.addEventListener('url', (event) => {
      handleDeepLink(event.url);
    });

    return () => {
      subscription.remove();
    };
  }, [handleDeepLink]);

  const reset = useCallback(() => {
    setState({
      type: 'unknown',
      token: null,
      groupId: null,
      isValid: false,
      loading: false,
      error: null,
      inviteData: null,
    });
  }, []);

  return { ...state, reset, handleDeepLink };
}
