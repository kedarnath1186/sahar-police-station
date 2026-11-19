from datetime import timedelta

from django.conf import settings
from django.contrib.auth import authenticate
from django.utils import timezone

from .models import LoginAttempt


def get_client_ip(request):
    forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if forwarded_for:
        return forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def authenticate_officer(request, username, password):
    """Apply the shared per-username failure limit and authenticate an officer."""
    timeout_minutes = getattr(settings, 'LOGIN_ATTEMPTS_TIMEOUT_MINUTES', 15)
    max_attempts = getattr(settings, 'LOGIN_ATTEMPTS_LIMIT', 5)
    since_time = timezone.now() - timedelta(minutes=timeout_minutes)
    recent_failures = LoginAttempt.objects.filter(
        username=username,
        successful=False,
        timestamp__gte=since_time,
    ).count()

    if recent_failures >= max_attempts:
        return None, (
            f"Security lockout: Too many failed login attempts for '{username}'. "
            f'Please wait {timeout_minutes} minutes before trying again.'
        ), True

    user = authenticate(request, username=username, password=password)
    LoginAttempt.objects.create(
        username=username,
        ip_address=get_client_ip(request),
        successful=user is not None,
    )
    if user is not None:
        return user, None, False

    remaining = max(0, max_attempts - (recent_failures + 1))
    if remaining:
        error = (
            f'Invalid username or password. {remaining} attempt(s) remaining '
            'before temporary lockout.'
        )
    else:
        error = (
            f'Security lockout: Too many failed login attempts. '
            f'Please wait {timeout_minutes} minutes.'
        )
    return None, error, False
