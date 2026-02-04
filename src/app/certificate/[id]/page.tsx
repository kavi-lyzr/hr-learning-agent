"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Award, AlertTriangle, Calendar, Building2 } from "lucide-react";
import Image from "next/image";

interface CertificateData {
  certificateId: string;
  userName: string;
  userAvatarUrl?: string;
  courseTitle: string;
  organizationName: string;
  organizationIconUrl?: string;
  issuedAt: string;
  completedAt: string;
  isValid: boolean;
  invalidationReason?: string;
}

export default function CertificatePage() {
  const params = useParams();
  const certificateId = params.id as string;

  const [certificate, setCertificate] = useState<CertificateData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchCertificate() {
      try {
        const res = await fetch(`/api/certificates/${certificateId}`);
        const data = await res.json();

        if (!res.ok) {
          setError(data.error || "Certificate not found");
          return;
        }

        setCertificate(data.certificate);
      } catch (err) {
        setError("Failed to load certificate");
        console.error("Error fetching certificate:", err);
      } finally {
        setLoading(false);
      }
    }

    if (certificateId) {
      fetchCertificate();
    }
  }, [certificateId]);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-3xl p-8 md:p-12">
          <div className="space-y-8">
            <Skeleton className="h-8 w-48 mx-auto" />
            <Skeleton className="h-12 w-3/4 mx-auto" />
            <div className="flex justify-center gap-4">
              <Skeleton className="h-20 w-20 rounded-full" />
            </div>
            <Skeleton className="h-6 w-1/2 mx-auto" />
            <Skeleton className="h-4 w-1/3 mx-auto" />
          </div>
        </Card>
      </main>
    );
  }

  if (error || !certificate) {
    return (
      <main className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 text-center">
          <div className="flex flex-col items-center gap-4">
            <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
              <AlertTriangle className="h-8 w-8 text-destructive" />
            </div>
            <h1 className="text-xl font-semibold">Certificate Not Found</h1>
            <p className="text-muted-foreground">
              {error || "This certificate does not exist or has been removed."}
            </p>
          </div>
        </Card>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-muted/30 flex items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-3xl">
        {/* Validity Warning */}
        {!certificate.isValid && (
          <div className="mb-4 p-4 bg-destructive/10 border border-destructive/20 rounded-lg flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-destructive flex-shrink-0" />
            <div>
              <p className="font-medium text-destructive">Certificate Invalid</p>
              <p className="text-sm text-muted-foreground">
                {certificate.invalidationReason || "This certificate is no longer valid."}
              </p>
            </div>
          </div>
        )}

        {/* Certificate Card */}
        <Card className="relative overflow-hidden">
          {/* Decorative border */}
          <div className="absolute inset-0 border-[12px] border-primary/5 rounded-xl pointer-events-none" />
          <div className="absolute inset-3 border border-primary/10 rounded-lg pointer-events-none" />

          <div className="p-8 md:p-12 lg:p-16">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center gap-2 mb-4">
                <Award className="h-6 w-6 text-primary" />
                <span className="text-sm font-medium tracking-widest uppercase text-primary">
                  Certificate of Completion
                </span>
              </div>
            </div>

            {/* Course Title */}
            <div className="text-center mb-10">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold text-foreground mb-2">
                {certificate.courseTitle}
              </h1>
            </div>

            {/* Recipient */}
            <div className="text-center mb-10">
              <p className="text-muted-foreground mb-4">
                This certifies that
              </p>
              <div className="flex flex-col items-center gap-4">
                <Avatar className="h-20 w-20 border-2 border-primary/20">
                  <AvatarImage src={certificate.userAvatarUrl} alt={certificate.userName} />
                  <AvatarFallback className="text-xl bg-primary/10 text-primary">
                    {getInitials(certificate.userName)}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-xl md:text-2xl font-semibold text-foreground">
                  {certificate.userName}
                </h2>
              </div>
              <p className="text-muted-foreground mt-4">
                has successfully completed all requirements for this course
              </p>
            </div>

            {/* Details */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6 text-sm text-muted-foreground mb-10">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span>Issued {formatDate(certificate.issuedAt)}</span>
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4" />
                <div className="flex items-center gap-2">
                  {certificate.organizationIconUrl && (
                    <img
                      src={certificate.organizationIconUrl}
                      alt={certificate.organizationName}
                      className="h-5 w-5 rounded object-cover"
                    />
                  )}
                  <span>{certificate.organizationName}</span>
                </div>
              </div>
            </div>

            {/* Validity Badge */}
            <div className="flex justify-center mb-8">
              {certificate.isValid ? (
                <Badge variant="default" className="px-4 py-1 text-sm bg-emerald-500 hover:bg-emerald-500">
                  Verified
                </Badge>
              ) : (
                <Badge variant="destructive" className="px-4 py-1 text-sm">
                  Invalid
                </Badge>
              )}
            </div>

            {/* Footer with Lyzr branding */}
            <div className="pt-8 border-t border-border">
              <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="text-xs text-muted-foreground">
                  Certificate ID: {certificate.certificateId}
                </div>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Powered by</span>
                  <Image
                    src="/lyzr.png"
                    alt="Lyzr AI"
                    width={48}
                    height={16}
                    className="h-4 w-auto"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </main>
  );
}
