import { NextRequest, NextResponse } from 'next/server'
import { AuthUtils } from '@/lib/auth-utils'
import { UserModel, NGOModel, UserNGOModel } from '@/lib/models'

// POST /api/admin/fix-ngo-associations - Fix orphaned NGO_ADMIN users
export async function POST(request: NextRequest) {
  try {
    // Require admin authentication
    const user = await AuthUtils.requireAuth(request)
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    console.log(`🔧 [NGO FIX] Starting to fix orphaned NGO_ADMIN users`)

    // Find all users with NGO_ADMIN role
    const ngoAdmins = await UserModel.getAll()
    const orphanedAdmins = ngoAdmins.filter(u => u.role === 'NGO_ADMIN')

    console.log(`👥 [NGO FIX] Found ${orphanedAdmins.length} NGO_ADMIN users`)

    const fixes = []

    for (const admin of orphanedAdmins) {
      try {
        // Check if they already have NGO associations
        const existingAssociations = await UserNGOModel.getByUser(admin.id)
        
        if (existingAssociations.length > 0) {
          console.log(`✅ [NGO FIX] User ${admin.email} already has NGO associations`)
          continue
        }

        // Try to find an NGO with matching email
        const allNGOs = await NGOModel.getAll()
        const matchingNGO = allNGOs.find(ngo => 
          ngo.email && admin.email && ngo.email.toLowerCase() === admin.email.toLowerCase()
        )

        if (matchingNGO) {
          // Create the association
          await UserNGOModel.associateUserWithNGO(admin.id, matchingNGO.id, user.id)
          
          fixes.push({
            userId: admin.id,
            userEmail: admin.email,
            ngoId: matchingNGO.id,
            ngoName: matchingNGO.name,
            status: 'fixed'
          })
          
          console.log(`🔗 [NGO FIX] Associated user ${admin.email} with NGO ${matchingNGO.name}`)
        } else {
          fixes.push({
            userId: admin.id,
            userEmail: admin.email,
            status: 'no_matching_ngo'
          })
          
          console.log(`⚠️ [NGO FIX] No matching NGO found for user ${admin.email}`)
        }
      } catch (error) {
        console.error(`❌ [NGO FIX] Error fixing user ${admin.email}:`, error)
        fixes.push({
          userId: admin.id,
          userEmail: admin.email,
          status: 'error',
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      }
    }

    const successCount = fixes.filter(f => f.status === 'fixed').length
    const errorCount = fixes.filter(f => f.status === 'error').length
    const noMatchCount = fixes.filter(f => f.status === 'no_matching_ngo').length

    console.log(`🎯 [NGO FIX] Results: ${successCount} fixed, ${errorCount} errors, ${noMatchCount} no match`)

    return NextResponse.json({
      success: true,
      message: `Fixed ${successCount} NGO admin associations`,
      results: {
        totalProcessed: orphanedAdmins.length,
        fixed: successCount,
        errors: errorCount,
        noMatch: noMatchCount
      },
      details: fixes
    })

  } catch (error) {
    console.error('❌ [NGO FIX] Error fixing NGO associations:', error)
    return NextResponse.json(
      { error: 'Failed to fix NGO associations' },
      { status: 500 }
    )
  }
}