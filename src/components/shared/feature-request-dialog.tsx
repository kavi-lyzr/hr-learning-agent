'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from '@/components/ui/dialog';
import { FeatureRequestForm } from './feature-request-form';

interface FeatureRequestDialogProps {
    children: React.ReactNode;
    appName: string;
}

export function FeatureRequestDialog({ children, appName }: FeatureRequestDialogProps) {
    const [open, setOpen] = useState(false);

    const handleSuccess = () => {
        // Close the dialog immediately after form completion
        setOpen(false);
    };

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                {children}
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                    <DialogTitle className="text-2xl">Submit a Feature Request</DialogTitle>
                    <DialogDescription>
                        Have an idea to improve our product? Let us know! Your feedback will be sent directly to our team on Slack.
                    </DialogDescription>
                </DialogHeader>
                <FeatureRequestForm appName={appName} onSuccess={handleSuccess} />
            </DialogContent>
        </Dialog>
    );
}