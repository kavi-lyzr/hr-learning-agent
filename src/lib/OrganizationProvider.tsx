"use client";

import { createContext, useContext, useEffect, useState, ReactNode, useCallback, useRef } from 'react';
import Cookies from 'js-cookie';
import { useAuth } from './AuthProvider';

interface Organization {
  id: string;
  name: string;
  slug: string;
  iconUrl?: string;
  role: 'admin' | 'employee';
}

interface OrganizationContextType {
  currentOrganization: Organization | null;
  organizations: Organization[];
  isLoading: boolean;
  setCurrentOrganization: (org: Organization) => void;
  refreshOrganizations: () => Promise<void>;
}

const OrganizationContext = createContext<OrganizationContextType | undefined>(undefined);

export function useOrganization() {
  const context = useContext(OrganizationContext);
  if (context === undefined) {
    throw new Error('useOrganization must be used within an OrganizationProvider');
  }
  return context;
}

export function OrganizationProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated, userId } = useAuth();
  const [currentOrganization, setCurrentOrganizationState] = useState<Organization | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const hasLoadedRef = useRef(false);

  const setCurrentOrganization = useCallback((org: Organization) => {
    setCurrentOrganizationState(org);
    // Store in cookie with 30-day expiration
    Cookies.set('current_organization', JSON.stringify(org), { expires: 30 });

    // Ensure agents are up to date in the background (don't block UI)
    fetch(`/api/organizations/${org.id}/ensure-agents`, {
      method: 'POST',
    }).catch(error => {
      console.error('Failed to ensure agents are up to date:', error);
      // Don't show error to user - this is a background task
    });
  }, []);

  const refreshOrganizations = useCallback(async () => {
    if (!isAuthenticated || !userId) {
      setIsLoading(false);
      return;
    }

    try {
      const response = await fetch(`/api/organizations?userId=${userId}`);
      if (response.ok) {
        const data = await response.json();
        const orgs: Organization[] = data.organizations || [];
        setOrganizations(orgs);

        // Try to restore from cookie first
        const savedOrgCookie = Cookies.get('current_organization');
        if (savedOrgCookie) {
          try {
            const savedOrg = JSON.parse(savedOrgCookie);
            // Verify this org still exists
            const orgExists = orgs.find(o => o.id === savedOrg.id);
            if (orgExists) {
              setCurrentOrganizationState(savedOrg);

              // Ensure agents are up to date in the background
              fetch(`/api/organizations/${savedOrg.id}/ensure-agents`, {
                method: 'POST',
              }).catch(error => {
                console.error('Failed to ensure agents are up to date:', error);
              });

              setIsLoading(false);
              return;
            }
          } catch (e) {
            console.error('Failed to parse saved organization cookie', e);
          }
        }

        // If no saved org or it doesn't exist, use the first one
        if (orgs.length > 0 && !currentOrganization) {
          setCurrentOrganization(orgs[0]);
        }
      }
    } catch (error) {
      console.error('Failed to fetch organizations:', error);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, userId, currentOrganization, setCurrentOrganization]);

  useEffect(() => {
    if (isAuthenticated && !hasLoadedRef.current) {
      hasLoadedRef.current = true;
      refreshOrganizations();
    }
  }, [isAuthenticated, refreshOrganizations]);

  return (
    <OrganizationContext.Provider value={{
      currentOrganization,
      organizations,
      isLoading,
      setCurrentOrganization,
      refreshOrganizations,
    }}>
      {children}
    </OrganizationContext.Provider>
  );
}
