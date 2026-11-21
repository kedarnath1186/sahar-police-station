import prisma from '../db.js'

async function main() {
  console.log('Starting Sahar Police Station test accused records seeding...')

  // Look up existing staff officer to associate with verified records (do NOT create one)
  const existingOfficer = await prisma.user.findFirst({
    where: { isStaff: true },
    select: { id: true, username: true },
  })

  // 10 test accused records covering 5 statuses (2 each) across 5 Maharashtra districts:
  // Pune, Nashik, Nagpur, Kolhapur, Aurangabad (Chhatrapati Sambhajinagar)
  // All coordinates strictly inside Maharashtra bbox: lat 15.6 to 22.1, lon 72.6 to 80.9
  const testAccusedData = [
    // --- 1. VERIFIED (2 records) ---
    {
      fullName: 'Rameshwar Narayan Deshmukh',
      mobileNumber: '9123456701',
      detailedAddress: 'House No. 42, Near Gram Panchayat Office, Uruli Kanchan',
      village: 'Uruli Kanchan',
      taluka: 'Haveli',
      city: 'Pune',
      district: 'Pune',
      pincode: '412202',
      latitude: 18.4875,
      longitude: 74.1328,
      locationStatus: 'verified',
      locationAccuracy: 'exact',
      geocodedQuery: 'House No. 42, Uruli Kanchan, Haveli, Pune, Maharashtra, 412202, India',
      geocodedDisplayName: 'Uruli Kanchan, Haveli, Pune, Maharashtra, 412202, India',
      verified: true,
    },
    {
      fullName: 'Rajeshwar Vasantrao Gaikwad',
      mobileNumber: '9123456702',
      detailedAddress: 'Gala 18, Near Old Agra Road, Ghoti Budruk',
      village: 'Ghoti Budruk',
      taluka: 'Igatpuri',
      city: 'Igatpuri',
      district: 'Nashik',
      pincode: '422402',
      latitude: 19.7214,
      longitude: 73.6268,
      locationStatus: 'verified',
      locationAccuracy: 'village',
      geocodedQuery: 'Gala 18, Old Agra Road, Ghoti Budruk, Igatpuri, Nashik, Maharashtra, 422402, India',
      geocodedDisplayName: 'Ghoti Budruk, Igatpuri, Nashik, Maharashtra, 422402, India',
      verified: true,
    },

    // --- 2. MANUALLY_SET (2 records) ---
    {
      fullName: 'Amitesh Chandrashekhar Verma',
      mobileNumber: '9123456703',
      detailedAddress: 'Plot 105, MIDC Industrial Area, Bori',
      village: 'Bori',
      taluka: 'Hingna',
      city: 'Nagpur',
      district: 'Nagpur',
      pincode: '441108',
      latitude: 20.9167,
      longitude: 78.9667,
      locationStatus: 'manually_set',
      locationAccuracy: 'exact',
      geocodedQuery: 'Plot 105, MIDC Bori, Hingna, Nagpur, Maharashtra, 441108, India',
      geocodedDisplayName: 'Bori, Hingna, Nagpur, Maharashtra, 441108, India',
      verified: false,
    },
    {
      fullName: 'Tanmay Digambar Shinde',
      mobileNumber: '9123456704',
      detailedAddress: 'Lane 3, Near Shivaji Maharaj Statue, Uchgaon',
      village: 'Uchgaon',
      taluka: 'Karvir',
      city: 'Kolhapur',
      district: 'Kolhapur',
      pincode: '416005',
      latitude: 16.6980,
      longitude: 74.2810,
      locationStatus: 'manually_set',
      locationAccuracy: 'village',
      geocodedQuery: 'Lane 3, Uchgaon, Karvir, Kolhapur, Maharashtra, 416005, India',
      geocodedDisplayName: 'Uchgaon, Karvir, Kolhapur, Maharashtra, 416005, India',
      verified: false,
    },

    // --- 3. NEEDS_REVIEW (2 records) ---
    {
      fullName: 'Sandeep Manohar Joshi',
      mobileNumber: '9123456705',
      detailedAddress: 'Survey No. 78, Off State Highway 22, Kannad Rural',
      village: 'Kannad Rural',
      taluka: 'Kannad',
      city: 'Kannad',
      district: 'Aurangabad (Chhatrapati Sambhajinagar)',
      pincode: '431103',
      latitude: 20.2650,
      longitude: 75.1320,
      locationStatus: 'needs_review',
      locationAccuracy: 'taluka',
      geocodedQuery: 'State Highway 22, Kannad Rural, Kannad, Aurangabad, Maharashtra, 431103, India',
      geocodedDisplayName: 'Kannad, Chhatrapati Sambhajinagar, Maharashtra, 431103, India',
      verified: false,
    },
    {
      fullName: 'Prateek Surendra Chauhan',
      mobileNumber: '9123456706',
      detailedAddress: 'House 14, Near ST Stand, Paud Gaon',
      village: 'Paud',
      taluka: 'Mulshi',
      city: 'Mulshi',
      district: 'Pune',
      pincode: '412108',
      latitude: 18.5312,
      longitude: 73.6134,
      locationStatus: 'needs_review',
      locationAccuracy: 'village',
      geocodedQuery: 'Near ST Stand, Paud, Mulshi, Pune, Maharashtra, 412108, India',
      geocodedDisplayName: 'Paud, Mulshi, Pune, Maharashtra, 412108, India',
      verified: false,
    },

    // --- 4. AUTO_GEOCODED (2 records) ---
    {
      fullName: 'Yogendra Pratap Singh',
      mobileNumber: '9123456707',
      detailedAddress: 'Plot 4, MIDC Sector C, Musalgaon',
      village: 'Musalgaon',
      taluka: 'Sinnar',
      city: 'Sinnar',
      district: 'Nashik',
      pincode: '422112',
      latitude: 19.8510,
      longitude: 73.9980,
      locationStatus: 'auto_geocoded',
      locationAccuracy: 'exact',
      geocodedQuery: 'Plot 4, MIDC Sector C, Musalgaon, Sinnar, Nashik, Maharashtra, 422112, India',
      geocodedDisplayName: 'Musalgaon, Sinnar, Nashik, Maharashtra, 422112, India',
      verified: false,
    },
    {
      fullName: 'Deepak Anandrao Kadam',
      mobileNumber: '9123456708',
      detailedAddress: 'Gala 22, Near Shiroli Phata, Hatkanangle Road',
      village: 'Shiroli',
      taluka: 'Hatkanangle',
      city: 'Hatkanangle',
      district: 'Kolhapur',
      pincode: '416122',
      latitude: 16.7521,
      longitude: 74.3214,
      locationStatus: 'auto_geocoded',
      locationAccuracy: 'village',
      geocodedQuery: 'Gala 22, Shiroli, Hatkanangle, Kolhapur, Maharashtra, 416122, India',
      geocodedDisplayName: 'Shiroli, Hatkanangle, Kolhapur, Maharashtra, 416122, India',
      verified: false,
    },

    // --- 5. NOT_GEOCODED (2 records) ---
    {
      fullName: 'Nilesh Babulal Agarwal',
      mobileNumber: '9123456709',
      detailedAddress: 'Remote Orchard Farm, Unnamed Dirt Road, Near Katol Border',
      village: 'Kondhali',
      taluka: 'Katol',
      city: 'Katol',
      district: 'Nagpur',
      pincode: '441103',
      latitude: null,
      longitude: null,
      locationStatus: 'not_geocoded',
      locationAccuracy: 'unknown',
      geocodedQuery: null,
      geocodedDisplayName: null,
      verified: false,
    },
    {
      fullName: 'Harish Jagannath Bansode',
      mobileNumber: '9123456710',
      detailedAddress: 'Kaccha Hutment Near Godavari Backwaters, Dongaon',
      village: 'Dongaon',
      taluka: 'Gangapur',
      city: 'Gangapur',
      district: 'Aurangabad (Chhatrapati Sambhajinagar)',
      pincode: '431109',
      latitude: null,
      longitude: null,
      locationStatus: 'not_geocoded',
      locationAccuracy: 'unknown',
      geocodedQuery: null,
      geocodedDisplayName: null,
      verified: false,
    },
  ]

  let createdCount = 0
  let skippedCount = 0

  for (let i = 0; i < testAccusedData.length; i++) {
    const item = testAccusedData[i]

    // Check whether a record with the same mobile number already exists (idempotency check)
    const existing = await prisma.accused.findFirst({
      where: { mobileNumber: item.mobileNumber },
    })

    if (existing) {
      skippedCount++
      continue
    }

    const verifiedAt = item.verified ? new Date(Date.now() - (i + 1) * 86400000) : null
    const verifiedById = item.verified && existingOfficer ? existingOfficer.id : null

    const accused = await prisma.accused.create({
      data: {
        fullName: item.fullName,
        mobileNumber: item.mobileNumber,
        detailedAddress: item.detailedAddress,
        village: item.village,
        taluka: item.taluka,
        city: item.city,
        district: item.district,
        state: 'Maharashtra',
        pincode: item.pincode,
        latitude: item.latitude,
        longitude: item.longitude,
        locationStatus: item.locationStatus,
        locationAccuracy: item.locationAccuracy,
        geocodedQuery: item.geocodedQuery || '',
        geocodedDisplayName: item.geocodedDisplayName || '',
        geocodedAt: item.latitude != null ? new Date(Date.now() - (10 - i) * 86400000) : null,
        verifiedById,
        verifiedAt,
      },
    })
    createdCount++

    // Step 5: AuditLog entry for creation (action 'create', modelName 'Accused', objectId, description)
    await prisma.auditLog.create({
      data: {
        userId: existingOfficer ? existingOfficer.id : null,
        action: 'create',
        modelName: 'Accused',
        objectId: accused.id,
        description: `Created ${accused.fullName}`,
        timestamp: new Date(),
      },
    })

    // Step 4: LocationCheck entries for verified and manually_set statuses
    if (item.locationStatus === 'verified') {
      await prisma.locationCheck.create({
        data: {
          accusedId: accused.id,
          officerId: verifiedById,
          action: 'verified',
          latitude: item.latitude,
          longitude: item.longitude,
          locationStatus: 'verified',
          locationAccuracy: item.locationAccuracy,
          note: 'Physical spot verification completed by investigating officer.',
          timestamp: verifiedAt || new Date(),
        },
      })
      await prisma.auditLog.create({
        data: {
          userId: verifiedById,
          action: 'LOCATION_VERIFIED',
          modelName: 'Accused',
          objectId: accused.id,
          description: `Location marked as verified by inspecting officer for record #${accused.id}. Coordinates: (${item.latitude}, ${item.longitude})`,
          timestamp: verifiedAt || new Date(),
        },
      })
    } else if (item.locationStatus === 'manually_set') {
      const checkDate = new Date(Date.now() - (7 - (i % 3)) * 86400000)
      await prisma.locationCheck.create({
        data: {
          accusedId: accused.id,
          officerId: existingOfficer ? existingOfficer.id : null,
          action: 'manually_set',
          latitude: item.latitude,
          longitude: item.longitude,
          locationStatus: 'manually_set',
          locationAccuracy: item.locationAccuracy,
          note: 'Coordinates manually verified against ration card and voter registry.',
          timestamp: checkDate,
        },
      })
      await prisma.auditLog.create({
        data: {
          userId: existingOfficer ? existingOfficer.id : null,
          action: 'LOCATION_MANUALLY_SET',
          modelName: 'Accused',
          objectId: accused.id,
          description: `Location manually pinned for record #${accused.id}. Coordinates: (${item.latitude}, ${item.longitude})`,
          timestamp: checkDate,
        },
      })
    }
  }

  const finalTotal = await prisma.accused.count()

  console.log(`Test Accused: ${testAccusedData.length} total, ${createdCount} created, ${skippedCount} skipped`)
  console.log(`Final total in Accused table: ${finalTotal}`)

  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Error seeding test accused records:', err)
  process.exit(1)
})
