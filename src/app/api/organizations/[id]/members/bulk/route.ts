import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import OrganizationMember from '@/models/organizationMember';
import Department from '@/models/department';
import mongoose from 'mongoose';

interface BulkMemberData {
  email: string;
  name?: string;
  department?: string; // Department name
}

/**
 * POST /api/organizations/[id]/members/bulk
 * Bulk import members from CSV data
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  await dbConnect();

  try {
    const { id: organizationId } = await params;

    if (!mongoose.Types.ObjectId.isValid(organizationId)) {
      return NextResponse.json(
        { error: 'Invalid organization ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { members } = body;

    if (!members || !Array.isArray(members) || members.length === 0) {
      return NextResponse.json(
        { error: 'Members array is required and must not be empty' },
        { status: 400 }
      );
    }

    if (members.length > 500) {
      return NextResponse.json(
        { error: 'Cannot import more than 500 members at once' },
        { status: 400 }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    
    // Get all departments for this organization (for name lookup)
    const departments = await Department.find({ organizationId }).lean();
    const departmentMap = new Map(
      departments.map((d: any) => [d.name.toLowerCase(), d._id.toString()])
    );

    // Get existing members to check for duplicates
    const existingEmails = new Set(
      (await OrganizationMember.find({ organizationId }).select('email').lean())
        .map((m: any) => m.email.toLowerCase())
    );

    const results = {
      success: [] as any[],
      errors: [] as any[],
      skipped: [] as any[],
    };

    // Process each member
    for (let i = 0; i < members.length; i++) {
      const memberData: BulkMemberData = members[i];
      const rowNumber = i + 1;

      try {
        // Validate email
        if (!memberData.email) {
          results.errors.push({
            row: rowNumber,
            email: memberData.email || 'N/A',
            error: 'Email is required'
          });
          continue;
        }

        const email = memberData.email.trim().toLowerCase();

        if (!emailRegex.test(email)) {
          results.errors.push({
            row: rowNumber,
            email: memberData.email,
            error: 'Invalid email format'
          });
          continue;
        }

        // Check for duplicates
        if (existingEmails.has(email)) {
          results.skipped.push({
            row: rowNumber,
            email: memberData.email,
            reason: 'Already exists'
          });
          continue;
        }

        // Find department ID if department name provided
        let departmentId = undefined;
        if (memberData.department) {
          const deptName = memberData.department.trim().toLowerCase();
          departmentId = departmentMap.get(deptName);
          
          if (!departmentId) {
            results.errors.push({
              row: rowNumber,
              email: memberData.email,
              error: `Department "${memberData.department}" not found`
            });
            continue;
          }
        }

        // Create member
        const member = new OrganizationMember({
          organizationId,
          email,
          name: memberData.name?.trim() || '',
          role: 'employee',
          status: 'invited',
          departmentId: departmentId || undefined,
          invitedAt: new Date(),
        });

        await member.save();
        existingEmails.add(email); // Add to set to prevent duplicates within the same batch

        results.success.push({
          row: rowNumber,
          email: memberData.email,
          name: memberData.name,
          department: memberData.department,
        });
      } catch (error: any) {
        results.errors.push({
          row: rowNumber,
          email: memberData.email || 'N/A',
          error: error.message || 'Failed to create member'
        });
      }
    }

    return NextResponse.json({
      message: 'Bulk import completed',
      summary: {
        total: members.length,
        success: results.success.length,
        errors: results.errors.length,
        skipped: results.skipped.length,
      },
      results,
    }, { status: results.success.length > 0 ? 201 : 400 });
  } catch (error: any) {
    console.error('Error bulk importing members:', error);
    return NextResponse.json(
      { error: 'Internal Server Error', details: error.message },
      { status: 500 }
    );
  }
}

