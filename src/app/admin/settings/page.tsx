"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useOrganization } from "@/lib/OrganizationProvider";
import { useAuth } from "@/lib/AuthProvider";
import { toast } from "sonner";
import {
  Building2,
  UserPlus,
  X,
  Trash2,
  Tag,
  Plus,
  RotateCcw,
  Loader2,
  Bot,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Wrench,
  User,
  Camera,
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

interface AgentStatus {
  name: string;
  type: 'tutor' | 'quiz_generator' | 'content_generator';
  status: 'healthy' | 'needs_update' | 'missing' | 'error';
  agentId: string | null;
  currentVersion: string | null;
  latestVersion: string;
  toolsStatus?: 'healthy' | 'needs_update' | 'missing';
  currentToolVersion?: string | null;
  latestToolVersion?: string;
  error?: string;
}

interface AgentHealthData {
  overallHealth: 'healthy' | 'needs_attention' | 'critical';
  agents: AgentStatus[];
  summary: {
    total: number;
    healthy: number;
    needsUpdate: number;
    missing: number;
    errors: number;
  };
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const { currentOrganization, isLoading, refreshOrganizations } = useOrganization();
  const { email: authEmail, displayName: authDisplayName, userId } = useAuth();
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

  // Categories state
  const [categories, setCategories] = useState<string[]>([]);
  const [isCustomCategories, setIsCustomCategories] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(true);
  const [savingCategories, setSavingCategories] = useState(false);
  const [newCategory, setNewCategory] = useState("");

  // Agent health state
  const [agentHealth, setAgentHealth] = useState<AgentHealthData | null>(null);
  const [loadingAgents, setLoadingAgents] = useState(true);
  const [updatingAgents, setUpdatingAgents] = useState(false);

  // User profile state
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [userAvatar, setUserAvatar] = useState<string | null>(null);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  useEffect(() => {
    if (!isLoading && !currentOrganization) {
      router.push('/organizations');
    }
  }, [currentOrganization, isLoading, router]);

  useEffect(() => {
    if (currentOrganization) {
      fetchOrganizationDetails();
      fetchAdmins();
      fetchCategories();
      fetchAgentHealth();
    }
  }, [currentOrganization]);

  // Fetch user profile including avatar
  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!authEmail) return;
      try {
        const res = await fetch(`/api/user/profile?email=${encodeURIComponent(authEmail)}`);
        if (res.ok) {
          const data = await res.json();
          if (data.user) {
            setUserName(data.user.name || authDisplayName || '');
            setUserEmail(data.user.email || authEmail || '');
            if (data.user.avatarUrl) {
              setUserAvatar(data.user.avatarUrl);
              setAvatarPreview(data.user.avatarUrl);
            }
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Fall back to auth context values
        setUserName(authDisplayName || '');
        setUserEmail(authEmail || '');
      }
    };
    
    if (authEmail) {
      fetchUserProfile();
    }
  }, [authEmail, authDisplayName]);

  const fetchAgentHealth = async () => {
    if (!currentOrganization) return;
    try {
      setLoadingAgents(true);
      const res = await fetch(`/api/settings/agents/health?organizationId=${currentOrganization.id}`);
      if (res.ok) {
        const data = await res.json();
        setAgentHealth(data);
      }
    } catch (error) {
      console.error('Error fetching agent health:', error);
    } finally {
      setLoadingAgents(false);
    }
  };

  const handleUpdateAgents = async () => {
    if (!currentOrganization) return;

    if (!confirm('This will update all agents to the latest version. Continue?')) return;

    try {
      setUpdatingAgents(true);
      const res = await fetch('/api/settings/agents/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organizationId: currentOrganization.id,
          action: 'update',
        }),
      });

      if (res.ok) {
        toast.success('Agents updated successfully');
        await fetchAgentHealth();
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update agents');
      }
    } catch (error) {
      console.error('Error updating agents:', error);
      toast.error('Failed to update agents');
    } finally {
      setUpdatingAgents(false);
    }
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Image size must be less than 5MB');
        return;
      }
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveProfile = async () => {
    if (!userId) return;

    try {
      setSavingProfile(true);

      let avatarBase64 = undefined;
      if (avatarFile) {
        const reader = new FileReader();
        avatarBase64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(avatarFile);
        });
      }

      const res = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: userName,
          avatarBase64,
        }),
      });

      if (res.ok) {
        toast.success('Profile updated successfully');
        setAvatarFile(null);
        const data = await res.json();
        if (data.user.avatarUrl) {
          setUserAvatar(data.user.avatarUrl);
          setAvatarPreview(data.user.avatarUrl);
        }
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const fetchCategories = async () => {
    if (!currentOrganization) return;
    try {
      setLoadingCategories(true);
      const res = await fetch(`/api/organizations/${currentOrganization.id}/categories`);
      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories || []);
        setIsCustomCategories(data.isCustom || false);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setLoadingCategories(false);
    }
  };

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

  const handleAddCategory = () => {
    if (!newCategory.trim()) return;
    const formatted = newCategory.trim().toLowerCase().replace(/\s+/g, '-');
    if (categories.includes(formatted)) {
      toast.error('Category already exists');
      return;
    }
    setCategories([...categories, formatted]);
    setNewCategory("");
  };

  const handleRemoveCategory = (category: string) => {
    if (categories.length <= 1) {
      toast.error('You must have at least one category');
      return;
    }
    setCategories(categories.filter(c => c !== category));
  };

  const handleSaveCategories = async () => {
    if (!currentOrganization) return;
    if (categories.length === 0) {
      toast.error('You must have at least one category');
      return;
    }

    try {
      setSavingCategories(true);
      const res = await fetch(`/api/organizations/${currentOrganization.id}/categories`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ categories }),
      });

      if (res.ok) {
        toast.success('Categories saved successfully');
        setIsCustomCategories(true);
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to save categories');
      }
    } catch (error) {
      console.error('Error saving categories:', error);
      toast.error('Failed to save categories');
    } finally {
      setSavingCategories(false);
    }
  };

  const handleResetCategories = async () => {
    if (!currentOrganization) return;
    if (!confirm('Reset to default categories? This will remove any custom categories.')) return;

    try {
      setSavingCategories(true);
      const res = await fetch(`/api/organizations/${currentOrganization.id}/categories`, {
        method: 'DELETE',
      });

      if (res.ok) {
        const data = await res.json();
        setCategories(data.categories);
        setIsCustomCategories(false);
        toast.success('Categories reset to defaults');
      } else {
        const error = await res.json();
        toast.error(error.error || 'Failed to reset categories');
      }
    } catch (error) {
      console.error('Error resetting categories:', error);
      toast.error('Failed to reset categories');
    } finally {
      setSavingCategories(false);
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

        {/* Course Categories */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  Course Categories
                </CardTitle>
                <CardDescription>
                  Customize the categories available when creating courses
                </CardDescription>
              </div>
              {isCustomCategories && (
                <Badge variant="secondary">Custom</Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {loadingCategories ? (
              <div className="space-y-2">
                <Skeleton className="h-8 w-full" />
                <Skeleton className="h-8 w-full" />
              </div>
            ) : (
              <>
                {/* Add new category */}
                <div className="space-y-2">
                  <Label htmlFor="newCategory">Add New Category</Label>
                  <div className="flex gap-2">
                    <Input
                      id="newCategory"
                      value={newCategory}
                      onChange={(e) => setNewCategory(e.target.value)}
                      placeholder="e.g., Leadership"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddCategory();
                        }
                      }}
                    />
                    <Button
                      onClick={handleAddCategory}
                      disabled={!newCategory.trim()}
                      variant="outline"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {/* Category list */}
                <div className="space-y-2">
                  <Label>Current Categories</Label>
                  <div className="flex flex-wrap gap-2">
                    {categories.map((category) => (
                      <Badge
                        key={category}
                        variant="secondary"
                        className="pl-3 pr-1 py-1.5 text-sm flex items-center gap-1"
                      >
                        <span className="capitalize">{category.replace(/-/g, ' ')}</span>
                        <button
                          onClick={() => handleRemoveCategory(category)}
                          className="ml-1 p-0.5 rounded-full hover:bg-destructive/20 transition-colors"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  {categories.length === 0 && (
                    <p className="text-sm text-muted-foreground">
                      No categories. Add at least one category.
                    </p>
                  )}
                </div>

                {/* Save / Reset buttons */}
                <div className="flex justify-between items-center pt-2">
                  <Button
                    variant="outline"
                    onClick={handleResetCategories}
                    disabled={savingCategories || !isCustomCategories}
                    className="gap-2"
                  >
                    <RotateCcw className="h-4 w-4" />
                    Reset to Defaults
                  </Button>
                  <Button
                    onClick={handleSaveCategories}
                    disabled={savingCategories || categories.length === 0}
                  >
                    {savingCategories ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Saving...
                      </>
                    ) : (
                      'Save Categories'
                    )}
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* AI Agents Section */}
        <Card className="border border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bot className="h-5 w-5 text-primary" />
              AI Agents
            </CardTitle>
            <CardDescription>
              Monitor and manage your organization&apos;s AI agents
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loadingAgents ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              </div>
            ) : agentHealth ? (
              <div className="space-y-4">
                {agentHealth.agents.map((agent) => (
                  <div
                    key={agent.type}
                    className="flex items-center justify-between p-4 rounded-lg border bg-card"
                  >
                    <div className="flex items-center gap-4">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center ${agent.status === 'healthy'
                            ? 'bg-green-100 dark:bg-green-900/30'
                            : agent.status === 'needs_update'
                              ? 'bg-yellow-100 dark:bg-yellow-900/30'
                              : 'bg-red-100 dark:bg-red-900/30'
                          }`}
                      >
                        {agent.status === 'healthy' ? (
                          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                        ) : agent.status === 'needs_update' ? (
                          <AlertTriangle className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600 dark:text-red-400" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium">{agent.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {agent.status === 'missing' || agent.status === 'error' ? (
                            agent.error || 'Not configured'
                          ) : (
                            <>
                              v{agent.currentVersion}
                              {agent.status === 'needs_update' && (
                                <span className="ml-2 text-yellow-600 dark:text-yellow-400">
                                  → v{agent.latestVersion} available
                                </span>
                              )}
                            </>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={
                          agent.status === 'healthy'
                            ? 'default'
                            : agent.status === 'needs_update'
                              ? 'secondary'
                              : 'destructive'
                        }
                        className={
                          agent.status === 'healthy'
                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                            : ''
                        }
                      >
                        {agent.status === 'healthy'
                          ? 'Healthy'
                          : agent.status === 'needs_update'
                            ? 'Update Available'
                            : agent.status === 'missing'
                              ? 'Missing'
                              : 'Error'}
                      </Badge>
                      {agent.toolsStatus && (
                        <Badge
                          variant="outline"
                          className={`text-xs ${agent.toolsStatus === 'healthy'
                              ? 'border-green-500 text-green-600'
                              : agent.toolsStatus === 'needs_update'
                                ? 'border-yellow-500 text-yellow-600'
                                : 'border-red-500 text-red-600'
                            }`}
                        >
                          <Wrench className="h-3 w-3 mr-1" />
                          Tools
                        </Badge>
                      )}
                    </div>
                  </div>
                ))}

                {agentHealth.agents.length === 0 && (
                  <p className="text-sm text-muted-foreground text-center py-4">
                    No agents configured for this organization.
                  </p>
                )}

                {/* Agent Actions */}
                <div className="flex justify-between items-center pt-4 border-t">
                  <p className="text-sm text-muted-foreground">
                    {agentHealth.summary.healthy} of {agentHealth.summary.total} agents healthy
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      onClick={() => fetchAgentHealth()}
                      disabled={loadingAgents}
                      className="gap-2"
                    >
                      <RefreshCw
                        className={`h-4 w-4 ${loadingAgents ? 'animate-spin' : ''}`}
                      />
                      Refresh
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleUpdateAgents}
                      disabled={updatingAgents}
                    >
                      {updatingAgents ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Updating...
                        </>
                      ) : (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          Update Agents
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                Unable to load agent health. Please try again.
              </p>
            )}
          </CardContent>
        </Card>

        {/* User Profile Section */}
        <Card className="border border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5 text-primary" />
              Your Profile
            </CardTitle>
            <CardDescription>
              Update your personal information and avatar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Avatar Upload */}
              <div className="flex items-center gap-6">
                <div className="relative">
                  <Avatar className="h-20 w-20">
                    <AvatarImage
                      src={avatarPreview || userAvatar || ''}
                      alt={userName || 'User'}
                    />
                    <AvatarFallback className="text-xl">
                      {userName?.charAt(0)?.toUpperCase() ||
                        userEmail?.charAt(0)?.toUpperCase() ||
                        'U'}
                    </AvatarFallback>
                  </Avatar>
                  <label
                    htmlFor="avatar-upload"
                    className="absolute bottom-0 right-0 p-1.5 rounded-full bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90 transition-colors"
                    title="Upload avatar"
                  >
                    <Camera className="h-4 w-4" />
                    <input
                      id="avatar-upload"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      title="Choose avatar image"
                      onChange={handleAvatarChange}
                    />
                  </label>
                </div>
                <div className="flex-1">
                  <Label htmlFor="profile-name">Display Name</Label>
                  <Input
                    id="profile-name"
                    value={userName}
                    onChange={(e) => setUserName(e.target.value)}
                    placeholder="Enter your name"
                    className="mt-1.5"
                  />
                </div>
              </div>

              {/* Email (read-only) */}
              <div>
                <Label>Email</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  {userEmail || authEmail || 'Not available'}
                </p>
              </div>

              {/* Save Button */}
              <div className="flex justify-end pt-2">
                <Button
                  onClick={handleSaveProfile}
                  disabled={savingProfile}
                >
                  {savingProfile ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Save Profile'
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
