from django.conf import settings

def police_settings(request):
    """Context processor providing police station constants to all templates."""
    return {
        'POLICE_STATION_NAME_EN': getattr(settings, 'POLICE_STATION_NAME_EN', 'Sahar Police Station'),
        'POLICE_STATION_NAME_MR': getattr(settings, 'POLICE_STATION_NAME_MR', 'सहार पोलीस ठाणे'),
        'POLICE_FORCE_NAME_EN': getattr(settings, 'POLICE_FORCE_NAME_EN', 'Maharashtra Police'),
        'POLICE_FORCE_NAME_MR': getattr(settings, 'POLICE_FORCE_NAME_MR', 'महाराष्ट्र पोलीस'),
        'POLICE_STATION_ADDRESS': getattr(settings, 'POLICE_STATION_ADDRESS', 'IA Project Road, Navpada, Sahar Village, Andheri East, Mumbai, Maharashtra 400099'),
        'SESSION_TIMEOUT_SECONDS': getattr(settings, 'SESSION_COOKIE_AGE', 1800),
    }
