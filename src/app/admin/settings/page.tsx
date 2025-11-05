"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useOrganization } from "@/lib/OrganizationProvider";
import { toast } from "sonner";
import {
  Building2,
  Upload,
  UserPlus,
  X,
  Trash2,
} from "lucide-react";

interface OrganizationDetails {
  id: string;
  name: string;
  slug: string;
  iconUrl?: string;
  ownerId: string;
  memberCount?: number;
}

interface Admin {
  userId: string;
  email: string;
  name?: string;
  role: string;
  status: string;
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const { currentOrganization, isLoading, refreshOrganizations } = useOrganization();
  const [orgDetails, setOrgDetails] = useState<OrganizationDetails | null>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Form state
  const [orgName, setOrgName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);

  // Add admin state
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);

  useEffect(() => {
    if (!isLoading && !currentOrganization) {
      router.push('/organizations');
    }
  }, [currentOrganization, isLoading, router]);

  useEffect(() => {
    if (currentOrganization) {
      fetchOrganizationDetails();
      fetchAdmins();
    }
  }, [currentOrganization]);

  const fetchOrganizationDetails = async () => {
    if (!currentOrganization) return;

    try {
      setLoading(true);
      const res = await fetch(`/api/organizations/${currentOrganization.id}`);
      if (res.ok) {
        const data = await res.json();
        setOrgDetails(data.organization);
        setOrgName(data.organization.name);
        setLogoPreview(data.organization.iconUrl || null);
      }
    } catch (error) {
      console.error('Error fetching organization details:', error);
      toast.error('Failed to load organization details');
    } finally {
      setLoading(false);
    }
  };

  const fetchAdmins = async () => {
    if (!currentOrganization) return;

    try {
      const res = await fetch(`/api/organizations/${currentOrganization.id}/members`);
      if (res.ok) {
        const data = await res.json();
        // Filter to only show admins
        const adminMembers = (data.members || []).filter((m: Admin) => m.role === 'admin');
        setAdmins(adminMembers);
      }
    } catch (error) {
      console.error('Error fetching admins:', error);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }

      setLogoFile(file);

      // Create preview
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveOrganization = async () => {
    if (!currentOrganization || !orgDetails) return;

    try {
      setSaving(true);

      let iconUrl = orgDetails.iconUrl;

      // Upload logo if changed
      if (logoFile) {
        setUploading(true);
        const reader = new FileReader();
        reader.readAsDataURL(logoFile);

        await new Promise((resolve, reject) => {
          reader.onload = async () => {
            try {
              const base64 = reader.result as string;
              const uploadRes = await fetch('/api/upload-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  image: base64,
                  folder: 'organization-logos',
                }),
              });

              if (uploadRes.ok) {
                const uploadData = await uploadRes.json();
                iconUrl = uploadData.url;
                resolve(uploadData);
              } else {
                reject(new Error('Failed to upload logo'));
              }
            } catch (err) {
              reject(err);
            } finally {
              setUploading(false);
            }
          };
          reader.onerror = reject;
        });
      }

      // Update organization
      const res = await fetch(`/api/organizations/${currentOrganization.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: orgName,
          iconUrl,
        }),
      });

      if (res.ok) {
        toast.success('Organization updated successfully');
        await refreshOrganizations();
        await fetchOrganizationDetails();
        setLogoFile(null);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update organization');
      }
    } catch (error) {
      console.error('Error updating organization:', error);
      toast.error('Failed to update organization');
    } finally {
      setSaving(false);
      setUploading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!currentOrganization) return;
    if (!newAdminEmail.trim()) {
      toast.error('Please enter an email address');
      return;
    }

    try {
      setAddingAdmin(true);

      const res = await fetch(`/api/organizations/${currentOrganization.id}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: newAdminEmail.trim(),
          role: 'admin',
        }),
      });

      if (res.ok) {
        toast.success('Admin added successfully');
        setNewAdminEmail("");
        await fetchAdmins();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to add admin');
      }
    } catch (error) {
      console.error('Error adding admin:', error);
      toast.error('Failed to add admin');
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleRemoveAdmin = async (memberEmail: string) => {
    if (!currentOrganization) return;
    if (!confirm(`Remove ${memberEmail} as admin?`)) return;

    try {
      const res = await fetch(`/api/organizations/${currentOrganization.id}/members`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: memberEmail }),
      });

      if (res.ok) {
        toast.success('Admin removed successfully');
        await fetchAdmins();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to remove admin');
      }
    } catch (error) {
      console.error('Error removing admin:', error);
      toast.error('Failed to remove admin');
    }
  };

  if (isLoading || !currentOrganization) {
    return null;
  }

  return (
    <main className="flex-1 overflow-y-auto p-4 md:p-6 lg:p-8 w-full">
      <div className="max-w-4xl mx-auto space-y-8 w-full">
        {/* Page Header */}
        <div>
          <h1 className="text-3xl md:text-4xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-2">
            Manage your organization settings and administrators
          </p>
        </div>

        {/* Organization Details */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Organization Details
            </CardTitle>
            <CardDescription>
              Update your organization name and logo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {loading ? (
              <>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-10 w-full" />
                </div>
                <div className="space-y-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-20 w-full" />
                </div>
              </>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="orgName">Organization Name</Label>
                  <Input
                    id="orgName"
                    value={orgName}
                    onChange={(e) => setOrgName(e.target.value)}
                    placeholder="Enter organization name"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Organization Logo</Label>
                  <div className="flex items-center gap-4">
                    {logoPreview && (
                      <div className="relative">
                        <img
                          src={logoPreview}
                          alt="Organization logo"
                          className="h-16 w-16 rounded-lg object-cover border"
                        />
                        {logoFile && (
                          <button
                            onClick={() => {
                              setLogoFile(null);
                              setLogoPreview(orgDetails?.iconUrl || null);
                            }}
                            className="absolute -top-2 -right-2 bg-destructive text-destructive-foreground rounded-full p-1"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        )}
                      </div>
                    )}
                    <div className="flex-1">
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoChange}
                        className="cursor-pointer"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Recommended: Square image, max 5MB
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    onClick={handleSaveOrganization}
                    disabled={saving || uploading}
                  >
                    {uploading ? 'Uploading...' : saving ? 'Saving...' : 'Save Changes'}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Administrators */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5" />
              Administrators
            </CardTitle>
            <CardDescription>
              Manage who can administer this organization
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Add Admin */}
            <div className="space-y-2">
              <Label htmlFor="newAdmin">Add Administrator</Label>
              <div className="flex gap-2">
                <Input
                  id="newAdmin"
                  type="email"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                  placeholder="admin@example.com"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddAdmin();
                    }
                  }}
                />
                <Button
                  onClick={handleAddAdmin}
                  disabled={addingAdmin || !newAdminEmail.trim()}
                >
                  {addingAdmin ? 'Adding...' : 'Add'}
                </Button>
              </div>
              {/* <p className="text-xs text-muted-foreground">
                They will receive an invitation email to join as an administrator
              </p> */}
            </div>

            {/* Admin List */}
            <div className="space-y-2">
              <Label>Current Administrators</Label>
              <div className="space-y-2">
                {admins.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-4 text-center">
                    No administrators found
                  </p>
                ) : (
                  admins.map((admin) => (
                    <div
                      key={admin.email}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex-1">
                        <p className="font-medium">{admin.name || admin.email}</p>
                        {admin.name && (
                          <p className="text-sm text-muted-foreground">{admin.email}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={admin.status === 'active' ? 'default' : 'secondary'}>
                          {admin.status}
                        </Badge>
                        {admin.email !== orgDetails?.ownerId && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveAdmin(admin.email)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
