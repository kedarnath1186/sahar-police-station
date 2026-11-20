"""
Constants for Indian states/UTs and Maharashtra districts.
Used as choices in Django model fields.
"""

INDIAN_STATES_CHOICES = [
    ('Andhra Pradesh', 'Andhra Pradesh'),
    ('Arunachal Pradesh', 'Arunachal Pradesh'),
    ('Assam', 'Assam'),
    ('Bihar', 'Bihar'),
    ('Chhattisgarh', 'Chhattisgarh'),
    ('Goa', 'Goa'),
    ('Gujarat', 'Gujarat'),
    ('Haryana', 'Haryana'),
    ('Himachal Pradesh', 'Himachal Pradesh'),
    ('Jharkhand', 'Jharkhand'),
    ('Karnataka', 'Karnataka'),
    ('Kerala', 'Kerala'),
    ('Madhya Pradesh', 'Madhya Pradesh'),
    ('Maharashtra', 'Maharashtra'),
    ('Manipur', 'Manipur'),
    ('Meghalaya', 'Meghalaya'),
    ('Mizoram', 'Mizoram'),
    ('Nagaland', 'Nagaland'),
    ('Odisha', 'Odisha'),
    ('Punjab', 'Punjab'),
    ('Rajasthan', 'Rajasthan'),
    ('Sikkim', 'Sikkim'),
    ('Tamil Nadu', 'Tamil Nadu'),
    ('Telangana', 'Telangana'),
    ('Tripura', 'Tripura'),
    ('Uttar Pradesh', 'Uttar Pradesh'),
    ('Uttarakhand', 'Uttarakhand'),
    ('West Bengal', 'West Bengal'),
    ('Andaman and Nicobar Islands', 'Andaman and Nicobar Islands'),
    ('Chandigarh', 'Chandigarh'),
    ('Dadra and Nagar Haveli and Daman and Diu', 'Dadra and Nagar Haveli and Daman and Diu'),
    ('Delhi', 'Delhi'),
    ('Jammu and Kashmir', 'Jammu and Kashmir'),
    ('Ladakh', 'Ladakh'),
    ('Lakshadweep', 'Lakshadweep'),
    ('Puducherry', 'Puducherry'),
]

MAHARASHTRA_DISTRICTS_CHOICES = [
    ('Ahmednagar', 'Ahmednagar'),
    ('Akola', 'Akola'),
    ('Amravati', 'Amravati'),
    ('Aurangabad (Chhatrapati Sambhajinagar)', 'Aurangabad (Chhatrapati Sambhajinagar)'),
    ('Beed', 'Beed'),
    ('Bhandara', 'Bhandara'),
    ('Buldhana', 'Buldhana'),
    ('Chandrapur', 'Chandrapur'),
    ('Dhule', 'Dhule'),
    ('Gadchiroli', 'Gadchiroli'),
    ('Gondia', 'Gondia'),
    ('Hingoli', 'Hingoli'),
    ('Jalgaon', 'Jalgaon'),
    ('Jalna', 'Jalna'),
    ('Kolhapur', 'Kolhapur'),
    ('Latur', 'Latur'),
    ('Mumbai City', 'Mumbai City'),
    ('Mumbai Suburban', 'Mumbai Suburban'),
    ('Nagpur', 'Nagpur'),
    ('Nanded', 'Nanded'),
    ('Nandurbar', 'Nandurbar'),
    ('Nashik', 'Nashik'),
    ('Osmanabad (Dharashiv)', 'Osmanabad (Dharashiv)'),
    ('Palghar', 'Palghar'),
    ('Parbhani', 'Parbhani'),
    ('Pune', 'Pune'),
    ('Raigad', 'Raigad'),
    ('Ratnagiri', 'Ratnagiri'),
    ('Sangli', 'Sangli'),
    ('Satara', 'Satara'),
    ('Sindhudurg', 'Sindhudurg'),
    ('Solapur', 'Solapur'),
    ('Thane', 'Thane'),
    ('Wardha', 'Wardha'),
    ('Washim', 'Washim'),
    ('Yavatmal', 'Yavatmal'),
]

LOCATION_STATUS_CHOICES = [
    ('not_geocoded', 'Not Geocoded'),
    ('auto_geocoded', 'Auto Geocoded'),
    ('needs_review', 'Needs Review'),
    ('manually_set', 'Manually Set'),
    ('verified', 'Verified'),
]

LOCATION_ACCURACY_CHOICES = [
    ('exact', 'Exact (Building / Street)'),
    ('village', 'Village / Locality (2 km)'),
    ('taluka', 'Taluka (10 km)'),
    ('district', 'District (30 km)'),
    ('state', 'State level'),
    ('unknown', 'Unknown'),
]

# Accuracy radius in meters for Leaflet map circles
ACCURACY_RADIUS_METERS = {
    'exact': 100,       # 100 m
    'village': 2000,    # 2 km
    'taluka': 10000,    # 10 km
    'district': 30000,  # 30 km
    'state': 100000,    # 100 km
    'unknown': 500,
}

# Maharashtra geographic bounding box for Nominatim filtering
MAHARASHTRA_BBOX = {
    'min_lat': 15.6,
    'max_lat': 22.1,
    'min_lon': 72.6,
    'max_lon': 80.9,
}

# India geographic bounding box
INDIA_BBOX = {
    'min_lat': 6.5,
    'max_lat': 37.5,
    'min_lon': 68.0,
    'max_lon': 97.5,
}

