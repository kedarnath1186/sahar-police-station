import path from 'node:path'
import { fileURLToPath } from 'node:url'
import dotenv from 'dotenv'

dotenv.config()

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

export const ROOT_DIR = path.resolve(__dirname, '../..')
export const MEDIA_DIR = path.resolve(ROOT_DIR, 'media')
export const STATIC_DIR = path.resolve(ROOT_DIR, 'static')
export const FRONTEND_DIST_DIR = path.resolve(ROOT_DIR, 'frontend/dist')

export const PORT = Number(process.env.PORT || 8000)
export const HOST = process.env.HOST || '0.0.0.0'
export const SECRET_KEY = process.env.SECRET_KEY || 'sahar-police-station-super-secret-key-change-in-prod'
export const DEBUG = process.env.DEBUG === 'true'
export const ALLOWED_HOSTS = (process.env.ALLOWED_HOSTS || 'localhost,127.0.0.1').split(',').map((h) => h.trim())
export const CSRF_TRUSTED_ORIGINS = (process.env.CSRF_TRUSTED_ORIGINS || 'http://localhost:8000,http://127.0.0.1:8000,http://localhost:5173')
  .split(',')
  .map((o) => o.trim())

export const NOMINATIM_CONTACT_EMAIL = process.env.NOMINATIM_CONTACT_EMAIL || 'sahar.police.station@mahapolice.gov.in'
export const DATABASE_URL = process.env.DATABASE_URL || 'file:./dev.db'

export const SESSION_COOKIE_NAME = 'sps_session'
export const SESSION_MAX_AGE_MS = 30 * 60 * 1000 // 30 minutes
export const SESSION_WARNING_MS = 28 * 60 * 1000 // 28 minutes

export const LOGIN_ATTEMPTS_LIMIT = 5
export const LOGIN_LOCKOUT_MINUTES = 15

export const MAHARASHTRA_BBOX = {
  minLat: 15.6,
  maxLat: 22.1,
  minLon: 72.6,
  maxLon: 80.9,
}

export const INDIA_BBOX = {
  minLat: 6.5,
  maxLat: 37.5,
  minLon: 68.0,
  maxLon: 97.5,
}

export const ACCURACY_RADIUS_METERS: Record<string, number> = {
  exact: 100,
  village: 2000,
  taluka: 10000,
  district: 30000,
  state: 100000,
  unknown: 500,
}

export const LOCATION_STATUS_CHOICES = [
  { value: 'not_geocoded', label: 'Not Geocoded' },
  { value: 'auto_geocoded', label: 'Auto Geocoded' },
  { value: 'needs_review', label: 'Needs Review' },
  { value: 'manually_set', label: 'Manually Set' },
  { value: 'verified', label: 'Verified' },
]

export const LOCATION_ACCURACY_CHOICES = [
  { value: 'exact', label: 'Exact (Building / Street)' },
  { value: 'village', label: 'Village / Locality (2 km)' },
  { value: 'taluka', label: 'Taluka (10 km)' },
  { value: 'district', label: 'District (30 km)' },
  { value: 'state', label: 'State level' },
  { value: 'unknown', label: 'Unknown' },
]

export const MAHARASHTRA_DISTRICTS = [
  'Ahmednagar',
  'Akola',
  'Amravati',
  'Aurangabad (Chhatrapati Sambhajinagar)',
  'Beed',
  'Bhandara',
  'Buldhana',
  'Chandrapur',
  'Dhule',
  'Gadchiroli',
  'Gondia',
  'Hingoli',
  'Jalgaon',
  'Jalna',
  'Kolhapur',
  'Latur',
  'Mumbai City',
  'Mumbai Suburban',
  'Nagpur',
  'Nanded',
  'Nandurbar',
  'Nashik',
  'Osmanabad (Dharashiv)',
  'Palghar',
  'Parbhani',
  'Pune',
  'Raigad',
  'Ratnagiri',
  'Sangli',
  'Satara',
  'Sindhudurg',
  'Solapur',
  'Thane',
  'Wardha',
  'Washim',
  'Yavatmal',
]

export const INDIAN_STATES = [
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Maharashtra',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Andaman and Nicobar Islands',
  'Chandigarh',
  'Dadra and Nagar Haveli and Daman and Diu',
  'Delhi',
  'Jammu and Kashmir',
  'Ladakh',
  'Lakshadweep',
  'Puducherry',
]
