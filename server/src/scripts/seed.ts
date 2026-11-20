import fs from 'node:fs'
import path from 'node:path'
import sharp from 'sharp'
import prisma from '../db.js'
import { MEDIA_DIR } from '../config.js'

async function createDummyImage(text: string, color: string, filename: string, subfolder: string): Promise<string> {
  const dir = path.join(MEDIA_DIR, subfolder)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }

  const svg = `
    <svg width="400" height="300" xmlns="http://www.w3.org/2000/svg">
      <rect width="100%" height="100%" fill="${color}"/>
      <rect x="4" y="4" width="392" height="292" fill="none" stroke="#E0A526" stroke-width="4"/>
      <circle cx="200" cy="110" r="45" fill="#FFFFFF22" stroke="#FFFFFF" stroke-width="2"/>
      <path d="M 160 210 Q 200 170 240 210 Z" fill="#FFFFFF22" stroke="#FFFFFF" stroke-width="2"/>
      <text x="50%" y="250" dominant-baseline="middle" text-anchor="middle" font-family="system-ui, sans-serif" font-size="14" font-weight="bold" fill="white">
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

  // Check if an existing officer exists to link verified records (do NOT create one, do NOT print passwords)
  const existingOfficer = await prisma.user.findFirst({
    where: { isStaff: true },
    select: { id: true, username: true },
  })

  // Clear existing records idempotently
  await prisma.accusedPhoto.deleteMany()
  await prisma.locationCheck.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.accused.deleteMany()
  await prisma.famousPlace.deleteMany()

  // 30 realistic Maharashtra Accused Records
  // Covering all 5 statuses (verified, manually_set, needs_review, auto_geocoded, not_geocoded)
  // and all 6 accuracy levels (exact, village, taluka, district, state, unknown)
  // All coordinates strictly inside Maharashtra bbox: lat 15.6 to 22.1, lon 72.6 to 80.9
  const accusedData = [
    // --- 1. VERIFIED (7 records) ---
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
      geocodedDisplayName: 'Sahar Village, Navpada, Andheri East, Mumbai Suburban, Maharashtra, 400099, India',
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
    {
      fullName: 'Kiran Madhav Rao',
      mobileNumber: '9823123450',
      detailedAddress: 'Near Zilla Parishad School, Tarabai Park',
      village: 'Tarabai Park',
      taluka: 'Karvir',
      city: 'Kolhapur',
      district: 'Kolhapur',
      pincode: '416003',
      latitude: 16.711800,
      longitude: 74.238200,
      locationStatus: 'verified',
      locationAccuracy: 'village',
      geocodedQuery: 'Tarabai Park, Karvir, Kolhapur, Maharashtra, 416003, India',
      geocodedDisplayName: 'Tarabai Park, Kolhapur, Maharashtra, 416003, India',
      verified: true,
    },
    {
      fullName: 'Sunil Bhaskar Deshmukh',
      mobileNumber: '9822334455',
      detailedAddress: 'Ward No 3, Station Area, Badnera',
      village: 'Badnera',
      taluka: 'Amravati',
      city: 'Amravati',
      district: 'Amravati',
      pincode: '444701',
      latitude: 20.865400,
      longitude: 77.728900,
      locationStatus: 'verified',
      locationAccuracy: 'taluka',
      geocodedQuery: 'Badnera, Amravati, Maharashtra, 444701, India',
      geocodedDisplayName: 'Badnera, Amravati, Maharashtra, 444701, India',
      verified: true,
    },

    // --- 2. MANUALLY_SET (6 records) ---
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
      geocodedQuery: 'Kothrud, Haveli, Pune, Maharashtra, 411038, India',
      geocodedDisplayName: 'Kothrud, Pune, Maharashtra, 411038, India',
      verified: false,
    },
    {
      fullName: 'Santosh Janardhan Rane',
      mobileNumber: '9822456781',
      detailedAddress: 'Behind ST Workshop, Sawantwadi Road',
      village: 'Charathe',
      taluka: 'Sawantwadi',
      city: 'Sawantwadi',
      district: 'Sindhudurg',
      pincode: '416510',
      latitude: 15.908200,
      longitude: 73.821400,
      locationStatus: 'manually_set',
      locationAccuracy: 'village',
      geocodedQuery: 'Charathe, Sawantwadi, Sindhudurg, Maharashtra, 416510, India',
      geocodedDisplayName: 'Charathe, Sindhudurg, Maharashtra, 416510, India',
      verified: false,
    },
    {
      fullName: 'Balu Kisan Ghodke',
      mobileNumber: '9822678912',
      detailedAddress: 'Near MIDC Gate 2, Waluj Industrial Area',
      village: 'Waluj',
      taluka: 'Gangapur',
      city: 'Aurangabad',
      district: 'Aurangabad (Chhatrapati Sambhajinagar)',
      pincode: '431136',
      latitude: 19.824500,
      longitude: 75.228900,
      locationStatus: 'manually_set',
      locationAccuracy: 'taluka',
      geocodedQuery: 'Waluj, Gangapur, Aurangabad, Maharashtra, 431136, India',
      geocodedDisplayName: 'Waluj, Chhatrapati Sambhajinagar, Maharashtra, 431136, India',
      verified: false,
    },

    // --- 3. NEEDS_REVIEW (6 records) ---
    {
      fullName: 'Pradeep Vishnu Salvi',
      mobileNumber: '9820011224',
      detailedAddress: 'Old Bori Chawl, Airport Perimeter Wall, Sahar Road',
      village: 'Sahar Village',
      taluka: 'Andheri',
      city: 'Mumbai',
      district: 'Mumbai Suburban',
      pincode: '400099',
      latitude: 19.096500,
      longitude: 72.868200,
      locationStatus: 'needs_review',
      locationAccuracy: 'exact',
      geocodedQuery: 'Sahar Road, Sahar Village, Andheri, Mumbai Suburban, Maharashtra, 400099, India',
      geocodedDisplayName: 'Sahar Road, Andheri East, Mumbai Suburban, Maharashtra, 400099, India',
      verified: false,
    },
    {
      fullName: 'Manoj Vitthal Shinde',
      mobileNumber: '9819922334',
      detailedAddress: 'Opposite Fish Market, Kasarvadavali, Ghodbunder Road',
      village: 'Kasarvadavali',
      taluka: 'Thane',
      city: 'Thane',
      district: 'Thane',
      pincode: '400615',
      latitude: 19.268420,
      longitude: 72.964210,
      locationStatus: 'needs_review',
      locationAccuracy: 'village',
      geocodedQuery: 'Kasarvadavali, Ghodbunder Road, Thane, Maharashtra, 400615, India',
      geocodedDisplayName: 'Kasarvadavali, Thane, Maharashtra, 400615, India',
      verified: false,
    },
    {
      fullName: 'Nitin Baban Pawar',
      mobileNumber: '9890123456',
      detailedAddress: 'Near Octroi Naka, Hadapsar-Saswad Road',
      village: 'Hadapsar',
      taluka: 'Haveli',
      city: 'Pune',
      district: 'Pune',
      pincode: '411028',
      latitude: 18.501230,
      longitude: 73.926540,
      locationStatus: 'needs_review',
      locationAccuracy: 'village',
      geocodedQuery: 'Hadapsar, Pune, Maharashtra, 411028, India',
      geocodedDisplayName: 'Hadapsar, Pune, Maharashtra, 411028, India',
      verified: false,
    },
    {
      fullName: 'Rahul Prakash Gholap',
      mobileNumber: '9822987654',
      detailedAddress: 'Behind Bus Stand, Jalna Road, CIDCO N-5',
      village: 'CIDCO',
      taluka: 'Aurangabad',
      city: 'Aurangabad',
      district: 'Aurangabad (Chhatrapati Sambhajinagar)',
      pincode: '431003',
      latitude: 19.883450,
      longitude: 75.362140,
      locationStatus: 'needs_review',
      locationAccuracy: 'taluka',
      geocodedQuery: 'CIDCO, Aurangabad, Maharashtra, 431003, India',
      geocodedDisplayName: 'CIDCO, Chhatrapati Sambhajinagar, Maharashtra, 431003, India',
      verified: false,
    },
    {
      fullName: 'Ashok Shankar Mhatre',
      mobileNumber: '9820456123',
      detailedAddress: 'Near Uran Wharf, Mora Bunder Road',
      village: 'Mora',
      taluka: 'Uran',
      city: 'Uran',
      district: 'Raigad',
      pincode: '400702',
      latitude: 18.887600,
      longitude: 72.934100,
      locationStatus: 'needs_review',
      locationAccuracy: 'exact',
      geocodedQuery: 'Mora Bunder Road, Mora, Uran, Raigad, Maharashtra, 400702, India',
      geocodedDisplayName: 'Mora, Uran, Raigad, Maharashtra, 400702, India',
      verified: false,
    },
    {
      fullName: 'Dnyaneshwar Shivaji Doke',
      mobileNumber: '9823456799',
      detailedAddress: 'Near Civil Hospital Road, Beed By-pass',
      village: 'Peth',
      taluka: 'Beed',
      city: 'Beed',
      district: 'Beed',
      pincode: '431122',
      latitude: 18.991200,
      longitude: 75.761200,
      locationStatus: 'needs_review',
      locationAccuracy: 'district',
      geocodedQuery: 'Beed, Maharashtra, 431122, India',
      geocodedDisplayName: 'Beed District, Maharashtra, India',
      verified: false,
    },

    // --- 4. AUTO_GEOCODED (6 records) ---
    {
      fullName: 'Amol Sanjay Jagtap',
      mobileNumber: '9823456789',
      detailedAddress: 'Shree Complex, Near ST Bus Stand, Market Yard Road',
      village: 'Baramati',
      taluka: 'Baramati',
      city: 'Baramati',
      district: 'Pune',
      pincode: '413102',
      latitude: 18.151240,
      longitude: 74.578650,
      locationStatus: 'auto_geocoded',
      locationAccuracy: 'exact',
      geocodedQuery: 'Market Yard Road, Baramati, Pune, Maharashtra, 413102, India',
      geocodedDisplayName: 'Baramati, Pune, Maharashtra, 413102, India',
      verified: false,
    },
    {
      fullName: 'Vikas Madhukar Kale',
      mobileNumber: '9850123456',
      detailedAddress: 'Gala 12, APMC Market Yard, New Mondha',
      village: 'Mondha',
      taluka: 'Nanded',
      city: 'Nanded',
      district: 'Nanded',
      pincode: '431602',
      latitude: 19.158420,
      longitude: 77.316540,
      locationStatus: 'auto_geocoded',
      locationAccuracy: 'exact',
      geocodedQuery: 'New Mondha, Nanded, Maharashtra, 431602, India',
      geocodedDisplayName: 'Nanded, Maharashtra, 431602, India',
      verified: false,
    },
    {
      fullName: 'Sandip Dnyaneshwar Wagh',
      mobileNumber: '9860234567',
      detailedAddress: 'Plot 7, Near Shivaji Maharaj Statue, Main Road',
      village: 'Sangamner',
      taluka: 'Sangamner',
      city: 'Sangamner',
      district: 'Ahmednagar',
      pincode: '422605',
      latitude: 19.574510,
      longitude: 74.208740,
      locationStatus: 'auto_geocoded',
      locationAccuracy: 'village',
      geocodedQuery: 'Sangamner, Ahmednagar, Maharashtra, 422605, India',
      geocodedDisplayName: 'Sangamner, Ahilyanagar, Maharashtra, 422605, India',
      verified: false,
    },
    {
      fullName: 'Rohan Suresh Kulkarni',
      mobileNumber: '9870345678',
      detailedAddress: 'Flat 101, Ganpati Mandir Chowk, Old Ausa Road',
      village: 'Ausa Road',
      taluka: 'Latur',
      city: 'Latur',
      district: 'Latur',
      pincode: '413512',
      latitude: 18.408750,
      longitude: 76.568420,
      locationStatus: 'auto_geocoded',
      locationAccuracy: 'village',
      geocodedQuery: 'Ausa Road, Latur, Maharashtra, 413512, India',
      geocodedDisplayName: 'Latur, Maharashtra, 413512, India',
      verified: false,
    },
    {
      fullName: 'Tanaji Pandurang Shinde',
      mobileNumber: '9881456789',
      detailedAddress: 'Near Subhash Chowk, Cotton Market',
      village: 'Hinganghat',
      taluka: 'Hinganghat',
      city: 'Hinganghat',
      district: 'Wardha',
      pincode: '442301',
      latitude: 20.551240,
      longitude: 78.834510,
      locationStatus: 'auto_geocoded',
      locationAccuracy: 'taluka',
      geocodedQuery: 'Hinganghat, Wardha, Maharashtra, 442301, India',
      geocodedDisplayName: 'Hinganghat, Wardha, Maharashtra, 442301, India',
      verified: false,
    },
    {
      fullName: 'Somnath Bapurao Deshmukh',
      mobileNumber: '9892567890',
      detailedAddress: 'Bazaar Peth, Near Gram Panchayat Office',
      village: 'Bhum',
      taluka: 'Bhum',
      city: 'Bhum',
      district: 'Osmanabad (Dharashiv)',
      pincode: '413504',
      latitude: 18.471200,
      longitude: 75.667800,
      locationStatus: 'auto_geocoded',
      locationAccuracy: 'district',
      geocodedQuery: 'Bhum, Osmanabad, Maharashtra, 413504, India',
      geocodedDisplayName: 'Dharashiv District, Maharashtra, 413504, India',
      verified: false,
    },

    // --- 5. NOT_GEOCODED (5 records) ---
    {
      fullName: 'Vinod Ramchandra Kamble',
      mobileNumber: '9921678901',
      detailedAddress: 'Remote Farm House, Unnamed Road, Deep Forest Area',
      village: 'Bhamragad',
      taluka: 'Bhamragad',
      city: 'Bhamragad',
      district: 'Gadchiroli',
      pincode: '442710',
      latitude: null,
      longitude: null,
      locationStatus: 'not_geocoded',
      locationAccuracy: 'unknown',
      geocodedQuery: null,
      geocodedDisplayName: null,
      verified: false,
    },
    {
      fullName: 'Yogesh Ankush Shingare',
      mobileNumber: '9922789012',
      detailedAddress: 'Jungle Pathar, Beyond Checkpost 4, Tribal Belt',
      village: 'Toranmal',
      taluka: 'Shahada',
      city: 'Toranmal',
      district: 'Nandurbar',
      pincode: '425423',
      latitude: null,
      longitude: null,
      locationStatus: 'not_geocoded',
      locationAccuracy: 'unknown',
      geocodedQuery: null,
      geocodedDisplayName: null,
      verified: false,
    },
    {
      fullName: 'Prakash Bhagwan Solanke',
      mobileNumber: '9923890123',
      detailedAddress: 'Old Abandoned Stone Quarry, Off Highway 53',
      village: 'Motala',
      taluka: 'Motala',
      city: 'Motala',
      district: 'Buldhana',
      pincode: '443103',
      latitude: null,
      longitude: null,
      locationStatus: 'not_geocoded',
      locationAccuracy: 'unknown',
      geocodedQuery: null,
      geocodedDisplayName: null,
      verified: false,
    },
    {
      fullName: 'Kishor Dattatraya Raut',
      mobileNumber: '9924901234',
      detailedAddress: 'Hutment near Canal Siphon, Unmapped Canal Bank',
      village: 'Shevgaon',
      taluka: 'Shevgaon',
      city: 'Shevgaon',
      district: 'Ahmednagar',
      pincode: '414502',
      latitude: null,
      longitude: null,
      locationStatus: 'not_geocoded',
      locationAccuracy: 'unknown',
      geocodedQuery: null,
      geocodedDisplayName: null,
      verified: false,
    },
    {
      fullName: 'Devidas Shrirang Sonawane',
      mobileNumber: '9925012345',
      detailedAddress: 'Temporary Nomad Shelter, Near Riverbed Shindkheda',
      village: 'Shindkheda',
      taluka: 'Shindkheda',
      city: 'Dhule',
      district: 'Dhule',
      pincode: '425406',
      latitude: null,
      longitude: null,
      locationStatus: 'not_geocoded',
      locationAccuracy: 'state',
      geocodedQuery: null,
      geocodedDisplayName: null,
      verified: false,
    },
  ]

  console.log(`Seeding exactly ${accusedData.length} accused records...`)

  const createdAccusedList = []
  for (let i = 0; i < accusedData.length; i++) {
    const item = accusedData[i]
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
        geocodedAt: item.latitude != null ? new Date(Date.now() - (30 - i) * 86400000) : null,
        verifiedById,
        verifiedAt,
      },
    })
    createdAccusedList.push(accused)

    // Add AuditLog and LocationCheck for verified and manually set records
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
      const checkDate = new Date(Date.now() - (15 - (i % 5)) * 86400000)
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

  console.log(`Created ${createdAccusedList.length} accused records with audit trails.`)

  // Create exactly 15 valid JPEG photos across records
  const colors = ['#0B2A5B', '#1B365D', '#2E7D32', '#37474F', '#4A148C', '#004D40']
  const photoCaptions = [
    'Frontal profile during station roll call verification',
    'Spot photograph taken at residence entrance',
    'Secondary photo during local enquiry at village square',
    'Front face photograph for physical verification dossier',
    'Side profile documented during summons service',
    'Identity photograph taken at market yard verification',
    'Field photo captured during beat patrol verification',
    'Dwelling entrance photo taken with local panchas',
    'Verification snapshot taken at workshop gate',
    'Current physical identification photograph',
    'Photograph taken during neighborhood verification inquiry',
    'Portrait captured at taluka administrative office',
    'Field location photo taken near landmark junction',
    'Suspect dwelling exterior documented during field visit',
    'Facial profile photo taken during inquiry documentation',
  ]

  for (let i = 0; i < 15; i++) {
    // Distribute among geocoded records (first 25 records)
    const targetAccused = createdAccusedList[i % 25]
    const filename = `accused_${targetAccused.id}_photo_${i + 1}.jpg`
    const relativePath = await createDummyImage(
      `Photo #${i + 1}: ${targetAccused.fullName.slice(0, 18)}`,
      colors[i % colors.length],
      filename,
      'accused_photos'
    )

    const lat = targetAccused.latitude ? targetAccused.latitude + (i * 0.0001) : 19.0988
    const lon = targetAccused.longitude ? targetAccused.longitude + (i * 0.0001) : 72.8711

    await prisma.accusedPhoto.create({
      data: {
        accusedId: targetAccused.id,
        image: relativePath,
        locationAddress: `${targetAccused.detailedAddress}, ${targetAccused.village}`,
        latitude: lat,
        longitude: lon,
        caption: photoCaptions[i],
        uploadedAt: new Date(Date.now() - (20 - i) * 86400000),
      },
    })
  }
  console.log('Created exactly 15 valid accused photographs.')

  // Create exactly 8 famous places across at least 3 districts
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
      name: 'Kanheri Caves, Sanjay Gandhi National Park',
      description: 'Ancient rock-cut Buddhist monument cluster situated deep inside Sanjay Gandhi National Park.',
      city: 'Borivali, Mumbai',
      district: 'Mumbai Suburban',
      address: 'Sanjay Gandhi National Park, Borivali East',
      latitude: 19.2060,
      longitude: 72.9064,
    },
    {
      name: 'Gateway of India',
      description: 'Historic 20th-century basalt arch monument overlooking the Arabian Sea; high-security public landmark.',
      city: 'Mumbai',
      district: 'Mumbai City',
      address: 'Apollo Bandar, Colaba',
      latitude: 18.9220,
      longitude: 72.8347,
    },
    {
      name: 'Chhatrapati Shivaji Maharaj Terminus (CSMT)',
      description: 'UNESCO World Heritage railway terminus and iconic Victorian Gothic revival landmark in South Mumbai.',
      city: 'Mumbai',
      district: 'Mumbai City',
      address: 'DN Road, Fort',
      latitude: 18.9400,
      longitude: 72.8354,
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
      name: 'Aga Khan Palace',
      description: 'Historic palace in Pune that served as a prison for Mahatma Gandhi and Kasturba Gandhi during the Quit India movement.',
      city: 'Pune',
      district: 'Pune',
      address: 'Pune-Nagar Road, Kalyani Nagar',
      latitude: 18.5524,
      longitude: 73.9015,
    },
    {
      name: 'Ellora Caves (Verul)',
      description: 'UNESCO World Heritage monument complex featuring monumental rock-cut Hindu, Buddhist, and Jain cave architecture.',
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
      place.name.slice(0, 24),
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
  console.log(`Created exactly ${placesData.length} famous landmark records across 5 districts.`)

  console.log('Seeding finished successfully!')
  await prisma.$disconnect()
}

main().catch((err) => {
  console.error('Error seeding data:', err)
  process.exit(1)
})
