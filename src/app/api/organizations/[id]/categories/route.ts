import { NextRequest, NextResponse } from 'next/server';
import connectDB from '@/lib/db';
import Organization from '@/models/organization';

// Default categories available to all organizations
const DEFAULT_CATEGORIES = [
    'onboarding',
    'technical',
    'sales',
    'soft-skills',
    'compliance',
    'other',
];

// GET - Fetch organization's course categories
export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;

        const organization = await Organization.findById(id).select('courseCategories');

        if (!organization) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        // Return custom categories if set, otherwise return defaults
        const categories = organization.courseCategories && organization.courseCategories.length > 0
            ? organization.courseCategories
            : DEFAULT_CATEGORIES;

        const isCustom = !!(organization.courseCategories && organization.courseCategories.length > 0);
        return NextResponse.json({ categories, isCustom });
    } catch (error: any) {
        console.error('Error fetching categories:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// PUT - Update organization's course categories
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;
        const body = await request.json();

        const { categories } = body;

        if (!Array.isArray(categories)) {
            return NextResponse.json({ error: 'Categories must be an array' }, { status: 400 });
        }

        // Validate categories - must be non-empty strings
        const validCategories = categories
            .filter((c: any) => typeof c === 'string' && c.trim().length > 0)
            .map((c: string) => c.trim().toLowerCase().replace(/\s+/g, '-'));

        if (validCategories.length === 0) {
            return NextResponse.json({ error: 'At least one valid category is required' }, { status: 400 });
        }

        const organization = await Organization.findByIdAndUpdate(
            id,
            { courseCategories: validCategories },
            { new: true }
        ).select('courseCategories');

        if (!organization) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        return NextResponse.json({
            categories: organization.courseCategories,
            message: 'Categories updated successfully'
        });
    } catch (error: any) {
        console.error('Error updating categories:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Reset to default categories
export async function DELETE(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();
        const { id } = await params;

        const organization = await Organization.findByIdAndUpdate(
            id,
            { $unset: { courseCategories: 1 } },
            { new: true }
        );

        if (!organization) {
            return NextResponse.json({ error: 'Organization not found' }, { status: 404 });
        }

        return NextResponse.json({
            categories: DEFAULT_CATEGORIES,
            message: 'Categories reset to defaults'
        });
    } catch (error: any) {
        console.error('Error resetting categories:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
