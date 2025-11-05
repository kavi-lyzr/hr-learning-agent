"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/lib/OrganizationProvider";
import { useAuth } from "@/lib/AuthProvider";
import { toast } from "sonner";
import {
  User as UserIcon,
  LogOut,
  AlertTriangle,
} from "lucide-react";

interface UserDetails {
  email: string;
  name?: string;
  lyzrId: string;
}

interface Membership {
  organizationId: string;
  organizationName: string;
  role: string;
  status: string;
}

export default function AccountSettingsPage() {
  const router = useRouter();
  const { currentOrganization, organizations, setCurrentOrganization, refreshOrganizations } = useOrganization();
  const { email, displayName, userId } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Form state
  const [userName, setUserName] = useState("");
  const [memberships, setMemberships] = useState<Membership[]>([]);

  useEffect(() => {
    if (email) {
      setUserName(displayName || "");
      fetchMemberships();
    }
  }, [email, displayName]);

  const fetchMemberships = async () => {
    if (!userId || !email) return;

    try {
      setLoading(true);
      // Get all organizations user is part of
      const orgs = organizations || [];
      const membershipsData = orgs.map(org => ({
        organizationId: org.id,
        organizationName: org.name,
        role: 'member', // Simplified for now
        status: 'active',
      }));
      setMemberships(membershipsData);
    } catch (error) {
      console.error('Error fetching memberships:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveName = async () => {
    if (!userId && !email) return;

    try {
      setSaving(true);

      const res = await fetch(`/api/user/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: userName,
          userId: userId,
          email: email,
        }),
      });

      if (res.ok) {
        toast.success('Name updated successfully');
        // Optionally refresh auth context
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update name');
      }
    } catch (error) {
      console.error('Error updating name:', error);
      toast.error('Failed to update name');
    } finally {
      setSaving(false);
    }
  };

  const handleLeaveOrganization = async (orgId: string, orgName: string) => {
    if (!userId || !email) return;

    if (!confirm(`Are you sure you want to leave "${orgName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/organizations/${orgId}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        toast.success(`Left ${orgName} successfully`);

        // If user left their current organization, switch to another one
        if (currentOrganization?.id === orgId) {
          const otherOrgs = (organizations || []).filter(o => o.id !== orgId);
          if (otherOrgs.length > 0) {
            setCurrentOrganization(otherOrgs[0]);
          } else {
            // No organizations left, redirect to organizations page
            router.push('/organizations');
          }
        }

        await refreshOrganizations();
        await fetchMemberships();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to leave organization');
      }
    } catch (error) {
      console.error('Error leaving organization:', error);
      toast.error('Failed to leave organization');
    }
  };

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full">
      <div className="max-w-4xl mx-auto space-y-8 w-full">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Account Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your personal account settings
          </p>
        </div>

        {/* Profile Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserIcon className="h-5 w-5" />
              Profile Information
            </CardTitle>
            <CardDescription>
              Update your personal information
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={email || ""}
                disabled
                className="bg-muted"
              />
              <p className="text-xs text-muted-foreground">
                Email cannot be changed
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="userName">Display Name</Label>
              <Input
                id="userName"
                value={userName}
                onChange={(e) => setUserName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>

            <div className="flex justify-end">
              <Button
                onClick={handleSaveName}
                disabled={saving || !userName.trim()}
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Organization Memberships */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <LogOut className="h-5 w-5" />
              Organization Memberships
            </CardTitle>
            <CardDescription>
              Manage your organization memberships
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <>
                <Skeleton className="h-16 w-full" />
                <Skeleton className="h-16 w-full" />
              </>
            ) : memberships.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                You are not a member of any organizations
              </p>
            ) : (
              <div className="space-y-3">
                {memberships.map((membership) => (
                  <div
                    key={membership.organizationId}
                    className="flex items-center justify-between p-4 border rounded-lg"
                  >
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium">{membership.organizationName}</p>
                        {currentOrganization?.id === membership.organizationId && (
                          <Badge variant="default" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground capitalize">
                        {membership.role}
                      </p>
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => handleLeaveOrganization(membership.organizationId, membership.organizationName)}
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Leave
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Danger Zone */}
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription>
              Irreversible and destructive actions
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-start justify-between p-4 border border-destructive rounded-lg">
              <div>
                <p className="font-medium">Delete Account</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
              <Button
                variant="destructive"
                size="sm"
                disabled
                className="ml-4"
              >
                Delete Account
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Account deletion is currently disabled. Contact support if you need to delete your account.
            </p>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
