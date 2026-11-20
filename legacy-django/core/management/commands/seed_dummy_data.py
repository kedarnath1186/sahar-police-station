"""
Management command to seed the database with realistic dummy data for police demonstration.
Creates 20 accused records with diverse location statuses (verified, manually_set,
needs_review, auto_geocoded, not_geocoded), real Maharashtra villages/talukas,
at least 15 geocoded coordinates from verified sample points, 10 geotagged field photos,
and 5 famous Maharashtra landmarks.
"""

import io
from django.core.management.base import BaseCommand
from django.core.files.base import ContentFile
from django.contrib.auth.models import User
from django.utils import timezone
from PIL import Image, ImageDraw, ImageFont

from accused.models import Accused, AccusedPhoto, LocationCheck
from places.models import FamousPlace
from core.models import log_action


class Command(BaseCommand):
    help = 'Seed the database with rich dummy data across all location statuses.'

    def handle(self, *args, **options):
        self.stdout.write(self.style.NOTICE('Starting police prototype data seeding...'))

        # Ensure an officer user exists for verifications
        officer, _ = User.objects.get_or_create(
            username='officer',
            defaults={
                'first_name': 'Rajesh',
                'last_name': 'Shinde',
                'is_staff': True,
            }
        )
        officer.set_password('police123')
        officer.save()

        # Clear existing dummy records for fresh seeding
        AccusedPhoto.objects.all().delete()
        LocationCheck.objects.all().delete()
        Accused.objects.all().delete()
        FamousPlace.objects.all().delete()

        self._create_accused(officer)
        self._create_photos()
        self._create_famous_places()

        self.stdout.write(self.style.SUCCESS('Database successfully seeded with police prototype dossiers!'))

    def _create_dummy_image(self, text, color):
        """Create a 300x300 JPEG image with watermark text using Pillow."""
        img = Image.new('RGB', (300, 300), color=color)
        draw = ImageDraw.Draw(img)
        try:
            font = ImageFont.truetype("arial.ttf", 16)
        except (IOError, OSError):
            font = ImageFont.load_default()

        # Center watermark banner
        bbox = draw.textbbox((0, 0), text, font=font)
        text_width = bbox[2] - bbox[0]
        text_height = bbox[3] - bbox[1]
        x = (300 - text_width) // 2
        y = (300 - text_height) // 2
        draw.text((x, y), text, fill='white', font=font)

        # Draw border
        draw.rectangle([0, 0, 299, 299], outline='#E0A526', width=4)

        buffer = io.BytesIO()
        img.save(buffer, format='JPEG', quality=85)
        buffer.seek(0)
        return buffer.read()

    def _create_accused(self, officer):
        """Create 20 accused records spanning all location statuses."""
        accused_data = [
            # 1. VERIFIED (Green) - 5 records
            {
                'full_name': 'Suresh Tukaram Kadam',
                'mobile_number': '9820112233',
                'detailed_address': 'Flat 302, Sai Shraddha Apts, Navpada Road, Near Sahar Cargo Gate',
                'village': 'Sahar Village',
                'taluka': 'Andheri',
                'city': 'Mumbai',
                'district': 'Mumbai Suburban',
                'pincode': '400099',
                'latitude': 19.098821,
                'longitude': 72.871145,
                'location_status': 'verified',
                'location_accuracy': 'exact',
                'geocoded_query': 'Flat 302, Sai Shraddha Apts, Navpada Road, Sahar Village, Andheri, Mumbai Suburban, Maharashtra, 400099, India',
                'geocoded_display_name': 'Sahar Village, Navpada, Andheri East, Zone VIII, Mumbai, Maharashtra, 400099, India',
                'verified_by': officer,
                'verified_at': timezone.now(),
            },
            {
                'full_name': 'Vijay Balkrishna Patil',
                'mobile_number': '9819234567',
                'detailed_address': 'Room 12, Chawl No. 4, Marol Pipeline Road, Bori Colony',
                'village': 'Marol',
                'taluka': 'Andheri',
                'city': 'Mumbai',
                'district': 'Mumbai Suburban',
                'pincode': '400059',
                'latitude': 19.112450,
                'longitude': 72.886320,
                'location_status': 'verified',
                'location_accuracy': 'exact',
                'geocoded_query': 'Marol Pipeline Road, Marol, Andheri, Mumbai Suburban, Maharashtra, 400059, India',
                'geocoded_display_name': 'Marol Pipeline, Andheri East, Mumbai Suburban, Maharashtra, 400059, India',
                'verified_by': officer,
                'verified_at': timezone.now(),
            },
            {
                'full_name': 'Sachin Eknath Jadhav',
                'mobile_number': '9768345678',
                'detailed_address': 'Gala 5, Shivaji Chowk, Near ST Stand, Naupada',
                'village': 'Naupada',
                'taluka': 'Thane',
                'city': 'Thane',
                'district': 'Thane',
                'pincode': '400602',
                'latitude': 19.186540,
                'longitude': 72.975410,
                'location_status': 'verified',
                'location_accuracy': 'exact',
                'geocoded_query': 'Naupada, Thane, Maharashtra, 400602, India',
                'geocoded_display_name': 'Naupada, Thane West, Thane, Maharashtra, 400602, India',
                'verified_by': officer,
                'verified_at': timezone.now(),
            },
            {
                'full_name': 'Ganesh Namdeo Shinde',
                'mobile_number': '9890456789',
                'detailed_address': 'Building B-4, Near Balgandharva Rangmandir, JM Road',
                'village': 'Shivajinagar',
                'taluka': 'Haveli',
                'city': 'Pune',
                'district': 'Pune',
                'pincode': '411005',
                'latitude': 18.531420,
                'longitude': 73.844610,
                'location_status': 'verified',
                'location_accuracy': 'exact',
                'geocoded_query': 'Shivajinagar, Haveli, Pune, Maharashtra, 411005, India',
                'geocoded_display_name': 'Shivajinagar, Pune, Maharashtra, 411005, India',
                'verified_by': officer,
                'verified_at': timezone.now(),
            },
            {
                'full_name': 'Mahesh Pandurang More',
                'mobile_number': '9822567890',
                'detailed_address': 'Plot 45, Behind Ram Mandir, Old Agra Road, Panchavati',
                'village': 'Panchavati',
                'taluka': 'Nashik',
                'city': 'Nashik',
                'district': 'Nashik',
                'pincode': '422003',
                'latitude': 19.997450,
                'longitude': 73.789820,
                'location_status': 'verified',
                'location_accuracy': 'exact',
                'geocoded_query': 'Panchavati, Nashik, Maharashtra, 422003, India',
                'geocoded_display_name': 'Panchavati, Nashik, Maharashtra, 422003, India',
                'verified_by': officer,
                'verified_at': timezone.now(),
            },

            # 2. MANUALLY_SET (Blue) - 4 records
            {
                'full_name': 'Anil Dattatray Sawant',
                'mobile_number': '9833678901',
                'detailed_address': 'Hutment 18, Slum Pocket Near Mithi River Bridge, Kurla West',
                'village': 'Kurla',
                'taluka': 'Kurla',
                'city': 'Mumbai',
                'district': 'Mumbai Suburban',
                'pincode': '400070',
                'latitude': 19.068540,
                'longitude': 72.879410,
                'location_status': 'manually_set',
                'location_accuracy': 'exact',
                'geocoded_query': 'Kurla West, Mumbai, Maharashtra, 400070, India',
                'geocoded_display_name': 'Kurla West, Mumbai Suburban, Maharashtra, 400070, India',
            },
            {
                'full_name': 'Ramesh Vilas Gaikwad',
                'mobile_number': '9869789012',
                'detailed_address': 'Gala No 14, APMC Market Yard, Sector 19',
                'village': 'Vashi',
                'taluka': 'Thane',
                'city': 'Navi Mumbai',
                'district': 'Thane',
                'pincode': '400703',
                'latitude': 19.076820,
                'longitude': 72.998410,
                'location_status': 'manually_set',
                'location_accuracy': 'exact',
                'geocoded_query': 'Sector 19, Vashi, Navi Mumbai, Maharashtra, India',
                'geocoded_display_name': 'Sector 19, Vashi, Navi Mumbai, Maharashtra, India',
            },
            {
                'full_name': 'Pravin Ashok Thorat',
                'mobile_number': '9821890123',
                'detailed_address': 'Shop 8, Station Road, Near Railway Crossing, Diva East',
                'village': 'Diva',
                'taluka': 'Thane',
                'city': 'Thane',
                'district': 'Thane',
                'pincode': '400612',
                'latitude': 19.189510,
                'longitude': 73.042120,
                'location_status': 'manually_set',
                'location_accuracy': 'exact',
                'geocoded_query': 'Diva East, Thane, Maharashtra, India',
                'geocoded_display_name': 'Diva, Thane, Maharashtra, 400612, India',
            },
            {
                'full_name': 'Deepak Chandrakant Chavan',
                'mobile_number': '9892901234',
                'detailed_address': 'Room 5, Gokhale Wadi, Near Paud Phata, Kothrud',
                'village': 'Kothrud',
                'taluka': 'Haveli',
                'city': 'Pune',
                'district': 'Pune',
                'pincode': '411038',
                'latitude': 18.507420,
                'longitude': 73.807650,
                'location_status': 'manually_set',
                'location_accuracy': 'exact',
                'geocoded_query': 'Kothrud, Pune, Maharashtra, 411038, India',
                'geocoded_display_name': 'Kothrud, Pune, Maharashtra, 411038, India',
            },

            # 3. NEEDS_REVIEW (Amber) - 4 records
            {
                'full_name': 'Santosh Mahadev Salunkhe',
                'mobile_number': '9870012345',
                'detailed_address': 'Survey 88, Near Ganpati Temple, Village Outskirts',
                'village': 'Wakad',
                'taluka': 'Mulshi',
                'city': 'Pimpri-Chinchwad',
                'district': 'Pune',
                'pincode': '411057',
                'latitude': 18.598640,
                'longitude': 73.768410,
                'location_status': 'needs_review',
                'location_accuracy': 'village',
                'geocoded_query': 'Wakad, Mulshi, Pune, Maharashtra, India',
                'geocoded_display_name': 'Wakad, Pimpri-Chinchwad, Pune, Maharashtra, 411057, India',
            },
            {
                'full_name': 'Sunil Bhagwan Bhosale',
                'mobile_number': '9811123456',
                'detailed_address': 'House 140, Market Yard, Taluka Main Road',
                'village': 'Baramati Rural',
                'taluka': 'Baramati',
                'city': 'Baramati',
                'district': 'Pune',
                'pincode': '413102',
                'latitude': 18.151420,
                'longitude': 74.577540,
                'location_status': 'needs_review',
                'location_accuracy': 'taluka',
                'geocoded_query': 'Baramati, Pune, Maharashtra, India',
                'geocoded_display_name': 'Baramati, Pune District, Maharashtra, 413102, India',
            },
            {
                'full_name': 'Nitin Jaywant Desai',
                'mobile_number': '9823234567',
                'detailed_address': 'Farmhouse Plot 12, Near Sugar Factory Road',
                'village': 'Karad Rural',
                'taluka': 'Karad',
                'city': 'Karad',
                'district': 'Satara',
                'pincode': '415110',
                'latitude': 17.288540,
                'longitude': 74.184510,
                'location_status': 'needs_review',
                'location_accuracy': 'taluka',
                'geocoded_query': 'Karad, Satara, Maharashtra, India',
                'geocoded_display_name': 'Karad, Satara, Maharashtra, 415110, India',
            },
            {
                'full_name': 'Rahul Yashwant Shirodkar',
                'mobile_number': '9890345678',
                'detailed_address': 'Sea Face Chawl, Bandar Road, Malvan Town',
                'village': 'Malvan',
                'taluka': 'Malvan',
                'city': 'Malvan',
                'district': 'Sindhudurg',
                'pincode': '416606',
                'latitude': 16.061450,
                'longitude': 73.468410,
                'location_status': 'needs_review',
                'location_accuracy': 'district',
                'geocoded_query': 'Sindhudurg, Maharashtra, India',
                'geocoded_display_name': 'Sindhudurg District, Konkan Division, Maharashtra, India',
            },

            # 4. AUTO_GEOCODED (Amber / Exact Match) - 4 records
            {
                'full_name': 'Akash Subhash Mane',
                'mobile_number': '9834456789',
                'detailed_address': 'CTS 921, Western Express Highway, Near Gundavali Metro',
                'village': 'Andheri East',
                'taluka': 'Andheri',
                'city': 'Mumbai',
                'district': 'Mumbai Suburban',
                'pincode': '400069',
                'latitude': 19.117450,
                'longitude': 72.854120,
                'location_status': 'auto_geocoded',
                'location_accuracy': 'exact',
                'geocoded_query': 'Gundavali Metro, Andheri East, Mumbai Suburban, Maharashtra, 400069, India',
                'geocoded_display_name': 'Gundavali, Andheri East, Mumbai Suburban, Maharashtra, 400069, India',
            },
            {
                'full_name': 'Prashant Manohar Rane',
                'mobile_number': '9867567890',
                'detailed_address': 'Opposite Cidco Bus Stand, Jalna Road',
                'village': 'Cidco',
                'taluka': 'Aurangabad',
                'city': 'Aurangabad (Chhatrapati Sambhajinagar)',
                'district': 'Aurangabad (Chhatrapati Sambhajinagar)',
                'pincode': '431003',
                'latitude': 19.876540,
                'longitude': 75.362140,
                'location_status': 'auto_geocoded',
                'location_accuracy': 'exact',
                'geocoded_query': 'Cidco, Jalna Road, Aurangabad, Maharashtra, India',
                'geocoded_display_name': 'CIDCO, Chhatrapati Sambhajinagar, Maharashtra, 431003, India',
            },
            {
                'full_name': 'Amol Vasantrao Pawar',
                'mobile_number': '9891678901',
                'detailed_address': 'Ward No 4, Main Bazaar Road, Near Bus Stand',
                'village': 'Dharampeth',
                'taluka': 'Nagpur Urban',
                'city': 'Nagpur',
                'district': 'Nagpur',
                'pincode': '440010',
                'latitude': 21.145820,
                'longitude': 79.068410,
                'location_status': 'auto_geocoded',
                'location_accuracy': 'exact',
                'geocoded_query': 'Dharampeth, Nagpur, Maharashtra, India',
                'geocoded_display_name': 'Dharampeth, Nagpur, Maharashtra, 440010, India',
            },
            {
                'full_name': 'Vinod Ramdas Shelar',
                'mobile_number': '9822789012',
                'detailed_address': 'Opposite District Court, Old Pune-Bangalore Road',
                'village': 'Shahupuri',
                'taluka': 'Karveer',
                'city': 'Kolhapur',
                'district': 'Kolhapur',
                'pincode': '416001',
                'latitude': 16.704510,
                'longitude': 74.243210,
                'location_status': 'auto_geocoded',
                'location_accuracy': 'exact',
                'geocoded_query': 'Shahupuri, Kolhapur, Maharashtra, India',
                'geocoded_display_name': 'Shahupuri, Kolhapur, Maharashtra, 416001, India',
            },

            # 5. NOT_GEOCODED (Grey / Missing Location) - 3 records
            {
                'full_name': 'Kishore Jagannath Wagh',
                'mobile_number': '9893890123',
                'detailed_address': 'Unnumbered Forest Hut, Past Dongar Nala, Dense Jungle Border',
                'village': 'Bhamragad Forest',
                'taluka': 'Bhamragad',
                'city': 'Gadchiroli',
                'district': 'Gadchiroli',
                'pincode': '442710',
                'latitude': None,
                'longitude': None,
                'location_status': 'not_geocoded',
                'location_accuracy': 'unknown',
                'geocoded_query': 'Bhamragad Forest, Gadchiroli, Maharashtra, India',
                'geocoded_display_name': '',
            },
            {
                'full_name': 'Manoj Prabhakar Londhe',
                'mobile_number': '9868901234',
                'detailed_address': 'Remote Canal Post, Near Unsurveyed Checkpost',
                'village': 'Umarkhed Remote',
                'taluka': 'Umarkhed',
                'city': 'Yavatmal',
                'district': 'Yavatmal',
                'pincode': '445206',
                'latitude': None,
                'longitude': None,
                'location_status': 'not_geocoded',
                'location_accuracy': 'unknown',
                'geocoded_query': 'Umarkhed Remote, Yavatmal, Maharashtra, India',
                'geocoded_display_name': '',
            },
            {
                'full_name': 'Tanaji Sambhaji Ghadge',
                'mobile_number': '9820012399',
                'detailed_address': 'Tribal Settlement Cluster 3, Hills Beyond Jawhar Taluka',
                'village': 'Jawhar Hills',
                'taluka': 'Palghar',
                'city': 'Palghar',
                'district': 'Palghar',
                'pincode': '401603',
                'latitude': None,
                'longitude': None,
                'location_status': 'not_geocoded',
                'location_accuracy': 'unknown',
                'geocoded_query': 'Jawhar Hills, Palghar, Maharashtra, India',
                'geocoded_display_name': '',
            },
        ]

        created_accused = []
        for d in accused_data:
            verified_by = d.pop('verified_by', None)
            verified_at = d.pop('verified_at', None)

            accused = Accused.objects.create(
                state='Maharashtra',
                geocoded_at=timezone.now(),
                verified_by=verified_by,
                verified_at=verified_at,
                **d
            )
            created_accused.append(accused)

            # Record corresponding LocationCheck entry
            LocationCheck.objects.create(
                accused=accused,
                officer=verified_by or officer,
                action=accused.location_status,
                latitude=accused.latitude,
                longitude=accused.longitude,
                location_status=accused.location_status,
                location_accuracy=accused.location_accuracy,
                note=f"Initial seeded record established with status '{accused.location_status}'",
            )
            log_action(officer, 'create', 'Accused', accused.pk,
                       f"Seeded dossier {accused.record_id}: {accused.full_name} ({accused.location_status})")

        self.stdout.write(f'  Created {len(created_accused)} accused records across all 5 verification statuses.')

    def _create_photos(self):
        """Create 10 geotagged AccusedPhoto records across various suspects."""
        accused_list = Accused.objects.filter(latitude__isnull=False)
        colors = ['#0B2A5B', '#071C3F', '#2E7D32', '#C62828', '#B26A00',
                  '#1E3A8A', '#065F46', '#831843', '#1F2937', '#312E81']

        captions = [
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

        count = 0
        for i, accused in enumerate(accused_list[:10]):
            img_data = self._create_dummy_image(f'PHOTO #{i+1}: {accused.record_id}', colors[i % len(colors)])
            photo = AccusedPhoto(
                accused=accused,
                location_address=f'{accused.detailed_address}, {accused.village}',
                latitude=accused.latitude + 0.0001 * (i % 3),
                longitude=accused.longitude + 0.0001 * (i % 3),
                caption=captions[i % len(captions)],
            )
            photo.image.save(f'accused_{accused.pk}_photo_{i+1}.jpg', ContentFile(img_data), save=True)
            count += 1

        self.stdout.write(f'  Created {count} field location photos with Pillow integrity.')

    def _create_famous_places(self):
        """Create 5 prominent Maharashtra landmarks with verified coordinates."""
        places_data = [
            {
                'name': 'Chhatrapati Shivaji Maharaj International Airport (T2)',
                'description': 'Primary international aviation hub and critical transit infrastructure under Sahar Police Station perimeter jurisdiction.',
                'city': 'Mumbai',
                'district': 'Mumbai Suburban',
                'address': 'Terminal 2, Sahar Road, Navpada, Andheri East',
                'latitude': 19.0988,
                'longitude': 72.8711,
            },
            {
                'name': 'Gateway of India',
                'description': 'Historic 20th-century arch monument overlooking the Arabian Sea in South Mumbai; high-security public landmark.',
                'city': 'Mumbai',
                'district': 'Mumbai City',
                'address': 'Apollo Bandar, Colaba',
                'latitude': 18.9220,
                'longitude': 72.8347,
            },
            {
                'name': 'Shaniwar Wada',
                'description': 'Historic 18th-century fortification seat of the Peshwas of the Maratha Empire.',
                'city': 'Pune',
                'district': 'Pune',
                'address': 'Shaniwar Peth, Near Bajirao Road',
                'latitude': 18.5196,
                'longitude': 73.8553,
            },
            {
                'name': 'Ellora Caves (Verul)',
                'description': 'UNESCO World Heritage monument complex featuring monumental rock-cut cave architecture.',
                'city': 'Aurangabad (Chhatrapati Sambhajinagar)',
                'district': 'Aurangabad (Chhatrapati Sambhajinagar)',
                'address': 'Verul Village, Khuldabad Taluka',
                'latitude': 20.0268,
                'longitude': 75.1772,
            },
            {
                'name': 'Deekshabhoomi',
                'description': 'Sacred monument of Navayana Buddhism where Dr. B. R. Ambedkar embraced Buddhism with hundreds of thousands of followers.',
                'city': 'Nagpur',
                'district': 'Nagpur',
                'address': 'South Ambazari Road, Ramdaspeth',
                'latitude': 21.1278,
                'longitude': 79.0669,
            },
        ]

        count = 0
        for i, p in enumerate(places_data):
            img_data = self._create_dummy_image(f'LANDMARK: {p["name"][:18]}', '#0B2A5B')
            place = FamousPlace(**p)
            place.photo.save(f'landmark_{i+1}.jpg', ContentFile(img_data), save=True)
            count += 1

        self.stdout.write(f'  Created {count} famous places and strategic landmarks.')
