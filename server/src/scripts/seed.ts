import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import prisma from '../db.js'
import { hashPassword } from '../services/authService.js'
import { MEDIA_DIR } from '../config.js'

async function createDummyImage(text: string, color: string, filename: string, subfolder: string): Promise<string> {
  const dir = path.join(MEDIA_DIR, subfolder)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const svg = `
    <svg width="300" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}"/>
      <rect x="2" y="2" width="296" height="296" fill="none" stroke="#E0A526" stroke-width="4"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" font-weight="bold" fill="white">
        ${text}
      </text>
    </svg>
  `

  const filePath = path.join(dir, filename)
  await sharp(Buffer.from(svg)).jpeg({ quality: 85 }).toFile(filePath)
  return `${subfolder}/${filename}`
}

async function main() {
  console.log('Starting Sahar Police Station data seeding...')

  // Create or update officer
  const hashedPassword = await hashPassword('police123')
  const officer = await prisma.user.upsert({
    where: { username: 'officer' },
    update: {
      password: hashedPassword,
      fullName: 'Rajesh Shinde',
      isStaff: true,
    },
    create: {
      username: 'officer',
      password: hashedPassword,
      fullName: 'Rajesh Shinde',
      isStaff: true,
    },
  })

  // Clear existing dummy records
  await prisma.accusedPhoto.deleteMany()
  await prisma.locationCheck.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.accused.deleteMany()
  await prisma.famousPlace.deleteMany()

  const accusedData = [
    // 1. VERIFIED - 5 records
    {
      fullName: 'Suresh Tukaram Kadam',
      mobileNumber: '9820112233',
      detailedAddress: 'Flat 302, Sai Shraddha Apts, Navpada Road, Near Sahar Cargo Gate',
      village: 'Sahar Village',
      taluka: 'Andheri',
      city: 'Mumbai',
      district: 'Mumbai Suburban',
      pincode: '400099',
      latitude: 19.098821,
      longitude: 72.871145,
      locationStatus: 'verified',
      locationAccuracy: 'exact',
      geocodedQuery: 'Flat 302, Sai Shraddha Apts, Navpada Road, Sahar Village, Andheri, Mumbai Suburban, Maharashtra, 400099, India',
      geocodedDisplayName: 'Sahar Village, Navpada, Andheri East, Zone VIII, Mumbai, Maharashtra, 400099, India',
      verified: true,
    },
    {
      fullName: 'Vijay Balkrishna Patil',
      mobileNumber: '9819234567',
      detailedAddress: 'Room 12, Chawl No. 4, Marol Pipeline Road, Bori Colony',
      village: 'Marol',
      taluka: 'Andheri',
      city: 'Mumbai',
      district: 'Mumbai Suburban',
      pincode: '400059',
      latitude: 19.112450,
      longitude: 72.886320,
      locationStatus: 'verified',
      locationAccuracy: 'exact',
      geocodedQuery: 'Marol Pipeline Road, Marol, Andheri, Mumbai Suburban, Maharashtra, 400059, India',
      geocodedDisplayName: 'Marol Pipeline, Andheri East, Mumbai Suburban, Maharashtra, 400059, India',
      verified: true,
    },
    {
      fullName: 'Sachin Eknath Jadhav',
      mobileNumber: '9768345678',
      detailedAddress: 'Gala 5, Shivaji Chowk, Near ST Stand, Naupada',
      village: 'Naupada',
      taluka: 'Thane',
      city: 'Thane',
      district: 'Thane',
      pincode: '400602',
      latitude: 19.186540,
      longitude: 72.975410,
      locationStatus: 'verified',
      locationAccuracy: 'exact',
      geocodedQuery: 'Naupada, Thane, Maharashtra, 400602, India',
      geocodedDisplayName: 'Naupada, Thane West, Thane, Maharashtra, 400602, India',
      verified: true,
    },
    {
      fullName: 'Ganesh Namdeo Shinde',
      mobileNumber: '9890456789',
      detailedAddress: 'Building B-4, Near Balgandharva Rangmandir, JM Road',
      village: 'Shivajinagar',
      taluka: 'Haveli',
      city: 'Pune',
      district: 'Pune',
      pincode: '411005',
      latitude: 18.531420,
      longitude: 73.844610,
      locationStatus: 'verified',
      locationAccuracy: 'exact',
      geocodedQuery: 'Shivajinagar, Haveli, Pune, Maharashtra, 411005, India',
      geocodedDisplayName: 'Shivajinagar, Pune, Maharashtra, 411005, India',
      verified: true,
    },
    {
      fullName: 'Mahesh Pandurang More',
      mobileNumber: '9822567890',
      detailedAddress: 'Plot 45, Behind Ram Mandir, Old Agra Road, Panchavati',
      village: 'Panchavati',
      taluka: 'Nashik',
      city: 'Nashik',
      district: 'Nashik',
      pincode: '422003',
      latitude: 19.997450,
      longitude: 73.789820,
      locationStatus: 'verified',
      locationAccuracy: 'exact',
      geocodedQuery: 'Panchavati, Nashik, Maharashtra, 422003, India',
      geocodedDisplayName: 'Panchavati, Nashik, Maharashtra, 422003, India',
      verified: true,
    },

    // 2. MANUALLY_SET - 4 records
    {
      fullName: 'Anil Dattatray Sawant',
      mobileNumber: '9833678901',
      detailedAddress: 'Hutment 18, Slum Pocket Near Mithi River Bridge, Kurla West',
      village: 'Kurla',
      taluka: 'Kurla',
      city: 'Mumbai',
      district: 'Mumbai Suburban',
      pincode: '400070',
      latitude: 19.068540,
      longitude: 72.879410,
      locationStatus: 'manually_set',
      locationAccuracy: 'exact',
      geocodedQuery: 'Kurla West, Mumbai, Maharashtra, 400070, India',
      geocodedDisplayName: 'Kurla West, Mumbai Suburban, Maharashtra, 400070, India',
      verified: false,
    },
    {
      fullName: 'Ramesh Vilas Gaikwad',
      mobileNumber: '9869789012',
      detailedAddress: 'Gala No 14, APMC Market Yard, Sector 19',
      village: 'Vashi',
      taluka: 'Thane',
      city: 'Navi Mumbai',
      district: 'Thane',
      pincode: '400703',
      latitude: 19.076820,
      longitude: 72.998410,
      locationStatus: 'manually_set',
      locationAccuracy: 'exact',
      geocodedQuery: 'Sector 19, Vashi, Navi Mumbai, Maharashtra, India',
      geocodedDisplayName: 'Sector 19, Vashi, Navi Mumbai, Maharashtra, India',
      verified: false,
    },
    {
      fullName: 'Pravin Ashok Thorat',
      mobileNumber: '9821890123',
      detailedAddress: 'Shop 8, Station Road, Near Railway Crossing, Diva East',
      village: 'Diva',
      taluka: 'Thane',
      city: 'Thane',
      district: 'Thane',
      pincode: '400612',
      latitude: 19.189510,
      longitude: 73.042120,
      locationStatus: 'manually_set',
      locationAccuracy: 'exact',
      geocodedQuery: 'Diva East, Thane, Maharashtra, India',
      geocodedDisplayName: 'Diva, Thane, Maharashtra, 400612, India',
      verified: false,
    },
    {
      fullName: 'Deepak Chandrakant Chavan',
      mobileNumber: '9892901234',
      detailedAddress: 'Room 5, Gokhale Wadi, Near Paud Phata, Kothrud',
      village: 'Kothrud',
      taluka: 'Haveli',
      city: 'Pune',
      district: 'Pune',
      pincode: '411038',
      latitude: 18.507420,
      longitude: 73.807650,
      locationStatus: 'manually_set',
      locationAccuracy: 'exact',
      geocodedQuery: 'Kothrud, Pune, Maharashtra, 411038, India',
      geocodedDisplayName: 'Kothrud, Pune, Maharashtra, 411038, India',
      verified: false,
    },

    // 3. NEEDS_REVIEW - 4 records
    {
      fullName: 'Santosh Mahadev Salunkhe',
      mobileNumber: '9870012345',
      detailedAddress: 'Survey 88, Near Ganpati Temple, Village Outskirts',
      village: 'Wakad',
      taluka: 'Mulshi',
      city: 'Pimpri-Chinchwad',
      district: 'Pune',
      pincode: '411057',
      latitude: 18.598640,
      longitude: 73.768410,
      locationStatus: 'needs_review',
      locationAccuracy: 'village',
      geocodedQuery: 'Wakad, Mulshi, Pune, Maharashtra, India',
      geocodedDisplayName: 'Wakad, Pimpri-Chinchwad, Pune, Maharashtra, 411057, India',
      verified: false,
    },
    {
      fullName: 'Sunil Bhagwan Bhosale',
      mobileNumber: '9811123456',
      detailedAddress: 'House 140, Market Yard, Taluka Main Road',
      village: 'Baramati Rural',
      taluka: 'Baramati',
      city: 'Baramati',
      district: 'Pune',
      pincode: '413102',
      latitude: 18.151420,
      longitude: 74.577540,
      locationStatus: 'needs_review',
      locationAccuracy: 'taluka',
      geocodedQuery: 'Baramati, Pune, Maharashtra, India',
      geocodedDisplayName: 'Baramati, Pune District, Maharashtra, 413102, India',
      verified: false,
    },
    {
      fullName: 'Nitin Jaywant Desai',
      mobileNumber: '9823234567',
      detailedAddress: 'Farmhouse Plot 12, Near Sugar Factory Road',
      village: 'Karad Rural',
      taluka: 'Karad',
      city: 'Karad',
      district: 'Satara',
      pincode: '415110',
      latitude: 17.288540,
      longitude: 74.184510,
      locationStatus: 'needs_review',
      locationAccuracy: 'taluka',
      geocodedQuery: 'Karad, Satara, Maharashtra, India',
      geocodedDisplayName: 'Karad, Satara, Maharashtra, 415110, India',
      verified: false,
    },
    {
      fullName: 'Rahul Yashwant Shirodkar',
      mobileNumber: '9890345678',
      detailedAddress: 'Sea Face Chawl, Bandar Road, Malvan Town',
      village: 'Malvan',
      taluka: 'Malvan',
      city: 'Malvan',
      district: 'Sindhudurg',
      pincode: '416606',
      latitude: 16.061450,
      longitude: 73.468410,
      locationStatus: 'needs_review',
      locationAccuracy: 'district',
      geocodedQuery: 'Sindhudurg, Maharashtra, India',
      geocodedDisplayName: 'Sindhudurg District, Konkan Division, Maharashtra, India',
      verified: false,
    },

    // 4. AUTO_GEOCODED - 4 records
    {
      fullName: 'Akash Subhash Mane',
      mobileNumber: '9834456789',
      detailedAddress: 'CTS 921, Western Express Highway, Near Gundavali Metro',
      village: 'Andheri East',
      taluka: 'Andheri',
      city: 'Mumbai',
      district: 'Mumbai Suburban',
      pincode: '400069',
      latitude: 19.117450,
      longitude: 72.854120,
      locationStatus: 'auto_geocoded',
      locationAccuracy: 'exact',
      geocodedQuery: 'Gundavali Metro, Andheri East, Mumbai Suburban, Maharashtra, 400069, India',
      geocodedDisplayName: 'Gundavali, Andheri East, Mumbai Suburban, Maharashtra, 400069, India',
      verified: false,
    },
    {
      fullName: 'Prashant Manohar Rane',
      mobileNumber: '9867567890',
      detailedAddress: 'Opposite Cidco Bus Stand, Jalna Road',
      village: 'Cidco',
      taluka: 'Aurangabad',
      city: 'Aurangabad (Chhatrapati Sambhajinagar)',
      district: 'Aurangabad (Chhatrapati Sambhajinagar)',
      pincode: '431003',
      latitude: 19.876540,
      longitude: 75.362140,
      locationStatus: 'auto_geocoded',
      locationAccuracy: 'exact',
      geocodedQuery: 'Cidco, Jalna Road, Aurangabad, Maharashtra, India',
      geocodedDisplayName: 'CIDCO, Chhatrapati Sambhajinagar, Maharashtra, 431003, India',
      verified: false,
    },
    {
      fullName: 'Amol Vasantrao Pawar',
      mobileNumber: '9891678901',
      detailedAddress: 'Ward No 4, Main Bazaar Road, Near Bus Stand',
      village: 'Dharampeth',
      taluka: 'Nagpur Urban',
      city: 'Nagpur',
      district: 'Nagpur',
      pincode: '440010',
      latitude: 21.145820,
      longitude: 79.068410,
      locationStatus: 'auto_geocoded',
      locationAccuracy: 'exact',
      geocodedQuery: 'Dharampeth, Nagpur, Maharashtra, India',
      geocodedDisplayName: 'Dharampeth, Nagpur, Maharashtra, 440010, India',
      verified: false,
    },
    {
      fullName: 'Vinod Ramdas Shelar',
      mobileNumber: '9822789012',
      detailedAddress: 'Opposite District Court, Old Pune-Bangalore Road',
      village: 'Shahupuri',
      taluka: 'Karveer',
      city: 'Kolhapur',
      district: 'Kolhapur',
      pincode: '416001',
      latitude: 16.704510,
      longitude: 74.243210,
      locationStatus: 'auto_geocoded',
      locationAccuracy: 'exact',
      geocodedQuery: 'Shahupuri, Kolhapur, Maharashtra, India',
      geocodedDisplayName: 'Shahupuri, Kolhapur, Maharashtra, 416001, India',
      verified: false,
    },

    // 5. NOT_GEOCODED - 3 records
    {
      fullName: 'Kishore Jagannath Wagh',
      mobileNumber: '9893890123',
      detailedAddress: 'Unnumbered Forest Hut, Past Dongar Nala, Dense Jungle Border',
      village: 'Bhamragad Forest',
      taluka: 'Bhamragad',
      city: 'Gadchiroli',
      district: 'Gadchiroli',
      pincode: '442710',
      latitude: null,
      longitude: null,
      locationStatus: 'not_geocoded',
      locationAccuracy: 'unknown',
      geocodedQuery: 'Bhamragad Forest, Gadchiroli, Maharashtra, India',
      geocodedDisplayName: '',
      verified: false,
    },
    {
      fullName: 'Manoj Prabhakar Londhe',
      mobileNumber: '9868901234',
      detailedAddress: 'Remote Canal Post, Near Unsurveyed Checkpost',
      village: 'Umarkhed Remote',
      taluka: 'Umarkhed',
      city: 'Yavatmal',
      district: 'Yavatmal',
      pincode: '445206',
      latitude: null,
      longitude: null,
      locationStatus: 'not_geocoded',
      locationAccuracy: 'unknown',
      geocodedQuery: 'Umarkhed Remote, Yavatmal, Maharashtra, India',
      geocodedDisplayName: '',
      verified: false,
    },
    {
      fullName: 'Tanaji Sambhaji Ghadge',
      mobileNumber: '9820012399',
      detailedAddress: 'Tribal Settlement Cluster 3, Hills Beyond Jawhar Taluka',
      village: 'Jawhar Hills',
      taluka: 'Palghar',
      city: 'Palghar',
      district: 'Palghar',
      pincode: '401603',
      latitude: null,
      longitude: null,
      locationStatus: 'not_geocoded',
      locationAccuracy: 'unknown',
      geocodedQuery: 'Jawhar Hills, Palghar, Maharashtra, India',
      geocodedDisplayName: '',
      verified: false,
    },
  ]

  const createdAccused = []
  for (const item of accusedData) {
    const isVerified = item.verified
    const accused = await prisma.accused.create({
      data: {
        fullName: item.fullName,
        mobileNumber: item.mobileNumber,
        detailedAddress: item.detailedAddress,
        village: item.village,
        city: item.city,
        taluka: item.taluka,
        district: item.district,
        state: 'Maharashtra',
        pincode: item.pincode,
        latitude: item.latitude,
        longitude: item.longitude,
        locationStatus: item.locationStatus,
        locationAccuracy: item.locationAccuracy,
        geocodedQuery: item.geocodedQuery,
        geocodedDisplayName: item.geocodedDisplayName,
        geocodedAt: new Date(),
        verifiedById: isVerified ? officer.id : null,
        verifiedAt: isVerified ? new Date() : null,
      },
    })
    createdAccused.push(accused)

    await prisma.locationCheck.create({
      data: {
        accusedId: accused.id,
        officerId: isVerified ? officer.id : null,
        action: accused.locationStatus,
        latitude: accused.latitude,
        longitude: accused.longitude,
        locationStatus: accused.locationStatus,
        locationAccuracy: accused.locationAccuracy,
        note: `Initial seeded record established with status '${accused.locationStatus}'`,
      },
    })

    await prisma.auditLog.create({
      data: {
        userId: officer.id,
        action: 'create',
        modelName: 'Accused',
        objectId: accused.id,
        description: `Seeded dossier ${accused.fullName} (${accused.locationStatus})`,
      },
    })
  }

  console.log(`Created ${createdAccused.length} accused records across all 5 verification statuses.`)

  // Create 10 photos
  const accusedWithCoords = createdAccused.filter((a) => a.latitude != null && a.longitude != null)
  const colors = [
    '#0B2A5B', '#071C3F', '#2E7D32', '#C62828', '#B26A00',
    '#1E3A8A', '#065F46', '#831843', '#1F2937', '#312E81'
  ]
  const captions = [
    'Spot verification at residence gate',
    'Surveillance checkpoint documentation',
    'Interrogation spot photo',
    'Field identification confirmation',
    'Property entrance verification',
    'Night surveillance check',
    'Vehicular movement checkpoint',
    'Local area market spot verification',
    'Transit point inspection photo',
    'Joint police field verification log',
  ]

  for (let i = 0; i < Math.min(10, accusedWithCoords.length); i++) {
    const accused = accusedWithCoords[i]
    const filename = `accused_${accused.id}_photo_${i + 1}.jpg`
    const relativePath = await createDummyImage(
      `PHOTO #${i + 1}: ${accused.fullName.slice(0, 15)}`,
      colors[i % colors.length],
      filename,
      'accused_photos'
    )

    await prisma.accusedPhoto.create({
      data: {
        accusedId: accused.id,
        image: relativePath,
        locationAddress: `${accused.detailedAddress}, ${accused.village}`,
        latitude: accused.latitude! + 0.0001 * (i % 3),
        longitude: accused.longitude! + 0.0001 * (i % 3),
        caption: captions[i % captions.length],
      },
    })
  }
  console.log('Created 10 field location photos with image integrity.')

  // Create 5 famous places
  const placesData = [
    {
      name: 'Chhatrapati Shivaji Maharaj International Airport (T2)',
      description: 'Primary international aviation hub and critical transit infrastructure under Sahar Police Station perimeter jurisdiction.',
      city: 'Mumbai',
      district: 'Mumbai Suburban',
      address: 'Terminal 2, Sahar Road, Navpada, Andheri East',
      latitude: 19.0988,
      longitude: 72.8711,
    },
    {
      name: 'Gateway of India',
      description: 'Historic 20th-century arch monument overlooking the Arabian Sea in South Mumbai; high-security public landmark.',
      city: 'Mumbai',
      district: 'Mumbai City',
      address: 'Apollo Bandar, Colaba',
      latitude: 18.9220,
      longitude: 72.8347,
    },
    {
      name: 'Shaniwar Wada',
      description: 'Historic 18th-century fortification seat of the Peshwas of the Maratha Empire.',
      city: 'Pune',
      district: 'Pune',
      address: 'Shaniwar Peth, Near Bajirao Road',
      latitude: 18.5196,
      longitude: 73.8553,
    },
    {
      name: 'Ellora Caves (Verul)',
      description: 'UNESCO World Heritage monument complex featuring monumental rock-cut cave architecture.',
      city: 'Aurangabad (Chhatrapati Sambhajinagar)',
      district: 'Aurangabad (Chhatrapati Sambhajinagar)',
      address: 'Verul Village, Khuldabad Taluka',
      latitude: 20.0268,
      longitude: 75.1772,
    },
    {
      name: 'Deekshabhoomi',
      description: 'Sacred monument of Navayana Buddhism where Dr. B. R. Ambedkar embraced Buddhism with hundreds of thousands of followers.',
      city: 'Nagpur',
      district: 'Nagpur',
      address: 'South Ambazari Road, Ramdaspeth',
      latitude: 21.1278,
      longitude: 79.0669,
    },
  ]

  for (let i = 0; i < placesData.length; i++) {
    const place = placesData[i]
    const filename = `place_${i + 1}.jpg`
    const relativePath = await createDummyImage(
      place.name.slice(0, 20),
      colors[i % colors.length],
      filename,
      'famous_places'
    )

    await prisma.famousPlace.create({
      data: {
        ...place,
        photo: relativePath,
      },
    })
  }
  console.log('Created 5 famous landmark records.')

  console.log('Seeding finished successfully!')
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Error seeding data:', err)
  process.exit(1)
})
