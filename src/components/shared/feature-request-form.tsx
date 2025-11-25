'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Loader2, Send } from 'lucide-react';
import { toast } from 'sonner';
import { generateSignatureAction } from '@/lib/actions/generate-signature';

interface FormData {
    title: string;
    description: string;
    name: string;
    email: string;
}

interface FormErrors {
    title?: string;
    description?: string;
    name?: string;
    email?: string;
}

interface FeatureRequestFormProps {
    appName: string;
    onSuccess?: () => void;
}

export function FeatureRequestForm({ appName, onSuccess }: FeatureRequestFormProps) {
    const [formData, setFormData] = useState<FormData>({
        title: '',
        description: '',
        name: '',
        email: '',
    });

    const [errors, setErrors] = useState<FormErrors>({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const validateForm = (): boolean => {
        const newErrors: FormErrors = {};

        if (!formData.title.trim()) {
            newErrors.title = 'Title is required';
        } else if (formData.title.length < 5) {
            newErrors.title = 'Title must be at least 5 characters';
        }

        if (!formData.description.trim()) {
            newErrors.description = 'Description is required';
        } else if (formData.description.length < 10) {
            newErrors.description = 'Description must be at least 10 characters';
        }

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }

        if (!formData.email.trim()) {
            newErrors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            newErrors.email = 'Invalid email format';
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!validateForm()) {
            toast.error('Validation Failed', {
                description: 'Please fill in all required fields correctly.',
            });
            return;
        }

        setIsSubmitting(true);

        // Show loading toast
        const loadingToast = toast.loading('Submitting your feature request...');

        try {
            // Prepare payload without signature
            const payloadWithoutSignature = {
                title: formData.title,
                description: formData.description,
                name: formData.name,
                email: formData.email,
                appName: appName,
            };

            // Generate signature using server action (keeps secret secure)
            const signature = await generateSignatureAction(payloadWithoutSignature);

            // Send request with signature
            const response = await fetch('/api/feature-request', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    ...payloadWithoutSignature,
                    signature,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Failed to submit feature request');
            }

            // Dismiss loading toast
            toast.dismiss(loadingToast);

            // Show success toast
            toast.success('Feature Request Submitted!', {
                description: 'Your request has been sent to our team. Thank you for your feedback!',
            });

            // Reset form
            setFormData({
                title: '',
                description: '',
                name: '',
                email: '',
            });
            setErrors({});

            // Close dialog after a short delay
            if (onSuccess) {
                setTimeout(() => {
                    onSuccess();
                }, 500);
            }
        } catch (error) {
            // Dismiss loading toast
            toast.dismiss(loadingToast);

            // Show error toast
            toast.error('Submission Failed', {
                description: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
            });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (field: keyof FormData, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Clear error for this field when user starts typing
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
                <Label htmlFor="title">
                    Feature Title <span className="text-red-500">*</span>
                </Label>
                <Input
                    id="title"
                    placeholder="e.g., Dark Mode Support"
                    value={formData.title}
                    onChange={(e) => handleChange('title', e.target.value)}
                    className={errors.title ? 'border-red-500' : ''}
                />
                {errors.title && <p className="text-sm text-red-500">{errors.title}</p>}
            </div>

            <div className="space-y-2">
                <Label htmlFor="description">
                    Description <span className="text-red-500">*</span>
                </Label>
                <Textarea
                    id="description"
                    placeholder="Describe your feature request in detail..."
                    value={formData.description}
                    onChange={(e) => handleChange('description', e.target.value)}
                    className={errors.description ? 'border-red-500' : ''}
                    rows={5}
                />
                {errors.description && <p className="text-sm text-red-500">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label htmlFor="name">
                        Your Name <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="name"
                        placeholder="John Doe"
                        value={formData.name}
                        onChange={(e) => handleChange('name', e.target.value)}
                        className={errors.name ? 'border-red-500' : ''}
                    />
                    {errors.name && <p className="text-sm text-red-500">{errors.name}</p>}
                </div>

                <div className="space-y-2">
                    <Label htmlFor="email">
                        Email Address <span className="text-red-500">*</span>
                    </Label>
                    <Input
                        id="email"
                        type="email"
                        placeholder="john@example.com"
                        value={formData.email}
                        onChange={(e) => handleChange('email', e.target.value)}
                        className={errors.email ? 'border-red-500' : ''}
                    />
                    {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
                </div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? (
                    <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Submitting...
                    </>
                ) : (
                    <>
                        <Send className="mr-2 h-4 w-4" />
                        Submit Feature Request
                    </>
                )}
            </Button>
        </form>
    );
}