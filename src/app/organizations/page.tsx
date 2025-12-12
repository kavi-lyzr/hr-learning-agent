"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, Building, Loader2, LogOut, ChevronDown, GraduationCap } from "lucide-react";
import { useAuth } from "@/lib/AuthProvider";
import { useOrganization } from "@/lib/OrganizationProvider";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { toast } from "sonner";

interface Organization {
  id: string;
  name: string;
  slug: string;
  iconUrl?: string;
  role: 'admin' | 'employee';
  status: 'active' | 'invited' | 'inactive';
  joinedAt?: Date;
}

export default function OrganizationsPage() {
  const { isAuthenticated, isLoading, userId, email, displayName, logout } = useAuth();
  const { setCurrentOrganization } = useOrganization();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loadingOrgs, setLoadingOrgs] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [orgName, setOrgName] = useState("");
  const router = useRouter();

  // Helper function to extract name from email
  const getNameFromEmail = (email: string | null | undefined): string => {
    if (!email) return 'User';
    const name = email.split('@')[0];
    return name.charAt(0).toUpperCase() + name.slice(1);
  };

  // Redirect to landing page if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  // Load user's organizations
  useEffect(() => {
    const loadOrganizations = async () => {
      if (!userId) return;

      try {
        const response = await fetch(`/api/organizations?userId=${userId}`);
        if (response.ok) {
          const data = await response.json();
          console.log('Organizations data:', data);
          setOrganizations(data.organizations || []);
        } else {
          console.error('Failed to load organizations');
          setOrganizations([]);
        }
      } catch (error) {
        console.error('Error loading organizations:', error);
        setOrganizations([]);
      } finally {
        setLoadingOrgs(false);
      }
    };

    if (userId) {
      loadOrganizations();
    }
  }, [userId]);

  const handleCreateOrganization = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || !orgName.trim()) return;

    setIsCreating(true);
    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: orgName.trim(),
          ownerId: userId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('Organization created successfully!');

        // Add the new organization to the list
        setOrganizations([
          ...organizations,
          {
            id: data.organization.id,
            name: data.organization.name,
            slug: data.organization.slug,
            role: 'admin',
            status: 'active',
            joinedAt: new Date(),
          }
        ]);

        setCreateDialogOpen(false);
        setOrgName("");
      } else {
        const error = await response.json();
        toast.error(error.error || 'Failed to create organization');
      }
    } catch (error) {
      console.error('Error creating organization:', error);
      toast.error('Failed to create organization. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleOrganizationSelect = (org: Organization) => {
    // Set the organization in context (this updates state + cookie)
    setCurrentOrganization({
      id: org.id,
      name: org.name,
      slug: org.slug,
      iconUrl: org.iconUrl,
      role: org.role,
    });

    // Navigate to appropriate dashboard based on role
    if (org.role === 'admin') {
      router.push('/admin/dashboard');
    } else {
      router.push('/employee/dashboard');
    }
  };

  const handleLogout = async () => {
    await logout();
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <Loader2 className="h-8 w-8 animate-spin mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Logo Section */}
          <div className="flex items-center gap-3">
            <Image
              src="https://i0.wp.com/www.lyzr.ai/wp-content/uploads/2024/11/cropped_lyzr_logo_1.webp?fit=452%2C180&ssl=1"
              alt="Lyzr"
              width={80}
              height={32}
              className="h-8 object-contain dark:invert"
              style={{ width: 'auto', height: '32px' }}
            />
            <div className="flex flex-col">
              <span className="font-semibold text-base">Lyzr L&D</span>
              <p className="text-xs text-muted-foreground">Learning Platform</p>
            </div>
          </div>

          {/* User Menu */}
          <div className="flex items-center gap-3">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="flex items-center gap-2 pr-3 pl-0">
                  <Avatar className="h-9 w-9">
                    <AvatarImage src="" />
                    <AvatarFallback className="text-xs bg-muted">
                      {(displayName || getNameFromEmail(email)).charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-4 w-4 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <div className="px-2 py-1.5">
                  <p className="text-sm font-medium">Account</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {displayName || getNameFromEmail(email)}
                  </p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="max-w-5xl mx-auto">
          {/* Page Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-2xl font-semibold mb-2">Your Organizations</h1>
              <p className="text-muted-foreground">
                Choose an organization to continue
              </p>
            </div>

            {/* New Organization Button */}
            <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  New organization
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-xl">Create New Organization</DialogTitle>
                  <p className="text-sm text-muted-foreground">
                    Set up a new organization for your learning programs.
                  </p>
                </DialogHeader>
                <form onSubmit={handleCreateOrganization} className="space-y-6 mt-6">
                  <div className="space-y-2">
                    <Label htmlFor="org-name" className="text-sm font-medium">
                      Organization Name
                    </Label>
                    <Input
                      id="org-name"
                      placeholder="e.g., Acme Corporation"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      required
                      className="h-10"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setCreateDialogOpen(false)}
                      disabled={isCreating}
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isCreating || !orgName.trim()}
                      className="min-w-[120px]"
                    >
                      {isCreating ? (
                        <>
                          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        'Create'
                      )}
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {loadingOrgs ? (
            <div className="flex h-full items-center justify-center py-32">
              <div className="text-center space-y-4">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading organizations...</p>
              </div>
            </div>
          ) : (
            <>
              {/* Organizations Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                {organizations.map((org) => (
                  <Card
                    key={org.id}
                    className="group relative hover:bg-muted/40 overflow-hidden border-border/50 backdrop-blur-sm hover:border-border transition-all duration-200 cursor-pointer"
                    onClick={() => handleOrganizationSelect(org)}
                  >
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3 flex-1">
                          {org.iconUrl ? (
                            <div className="h-10 w-10 rounded-lg overflow-hidden flex-shrink-0">
                              <img
                                src={org.iconUrl}
                                alt={org.name}
                                className="h-full w-full object-cover"
                                onError={(e) => {
                                  // Replace with fallback icon on error
                                  e.currentTarget.style.display = 'none';
                                  e.currentTarget.parentElement!.innerHTML = `<div class="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors h-10 w-10 flex items-center justify-center"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-primary"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></div>`;
                                }}
                              />
                            </div>
                          ) : (
                            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                              <GraduationCap className="h-5 w-5 text-primary" />
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <h3 className="font-medium text-base truncate">
                              {org.name}
                            </h3>
                            <p className="text-xs text-muted-foreground mt-1">
                              {org.role === 'admin' ? 'Administrator' : 'Employee'}
                            </p>
                          </div>
                        </div>
                        <Badge
                          variant={org.role === 'admin' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {org.role}
                        </Badge>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          )}

          {!loadingOrgs && organizations.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 space-y-6">
              <div className="p-4 rounded-full bg-muted/50">
                <Building className="h-12 w-12 text-muted-foreground" />
              </div>
              <div className="text-center space-y-2">
                <h3 className="text-lg font-semibold">No organizations found</h3>
                <p className="text-muted-foreground max-w-md">
                  You haven't joined any organizations yet. Create your first organization to get started.
                </p>
              </div>
              <Button
                size="lg"
                className="mt-4"
                onClick={() => setCreateDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Your First Organization
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
