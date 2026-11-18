from datetime import timedelta
from django.conf import settings
from django.contrib import messages
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.decorators import login_required
from django.db.models import Count
from django.http import Http404
from django.shortcuts import render, redirect
from django.utils import timezone
from django.views.decorators.http import require_POST
from django.views.static import serve as static_serve

from accused.models import Accused, AccusedPhoto
from core.models import LoginAttempt
from places.models import FamousPlace


def get_client_ip(request):
    """Retrieves client IP address from request headers."""
    x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
    if x_forwarded_for:
        return x_forwarded_for.split(',')[0].strip()
    return request.META.get('REMOTE_ADDR')


def login_view(request):
    """
    Handle user login with rate-limiting security:
    Max 5 failed attempts per 15 minutes per username.
    """
    # TODO: Add two-factor authentication here (e.g., django-otp / TOTP SMS)

    if request.user.is_authenticated:
        return redirect('dashboard')

    error = None
    timeout_minutes = getattr(settings, 'LOGIN_ATTEMPTS_TIMEOUT_MINUTES', 15)
    max_attempts = getattr(settings, 'LOGIN_ATTEMPTS_LIMIT', 5)

    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')
        client_ip = get_client_ip(request)

        # Check failed attempts in the last 15 minutes for this username
        since_time = timezone.now() - timedelta(minutes=timeout_minutes)
        recent_failures = LoginAttempt.objects.filter(
            username=username,
            successful=False,
            timestamp__gte=since_time,
        ).count()

        if recent_failures >= max_attempts:
            error = (
                f"Security lockout: Too many failed login attempts for '{username}'. "
                f"Please wait {timeout_minutes} minutes before trying again."
            )
            return render(request, 'core/login.html', {'error': error, 'locked': True})

        user = authenticate(request, username=username, password=password)

        if user is not None:
            # Record success and log user in
            LoginAttempt.objects.create(
                username=username,
                ip_address=client_ip,
                successful=True,
            )
            login(request, user)
            next_url = request.GET.get('next', '/')
            return redirect(next_url)
        else:
            # Record failed attempt
            LoginAttempt.objects.create(
                username=username,
                ip_address=client_ip,
                successful=False,
            )
            remaining = max(0, max_attempts - (recent_failures + 1))
            if remaining > 0:
                error = f"Invalid username or password. {remaining} attempt(s) remaining before temporary lockout."
            else:
                error = f"Security lockout: Too many failed login attempts. Please wait {timeout_minutes} minutes."

    return render(request, 'core/login.html', {'error': error})


@login_required
@require_POST
def logout_view(request):
    """Handle user logout. Protected with POST and login_required for CSRF and session integrity."""
    logout(request)
    messages.info(request, "Officer session securely closed.")
    return redirect('login')


@login_required
def dashboard_view(request):
    """Main police dashboard with summary metrics and location status distribution."""
    accused_qs = Accused.objects.all()

    accused_count = accused_qs.count()
    photo_count = AccusedPhoto.objects.count()
    places_count = FamousPlace.objects.count()

    # Location verification status breakdown
    status_counts = {
        'verified': accused_qs.filter(location_status='verified').count(),
        'manually_set': accused_qs.filter(location_status='manually_set').count(),
        'needs_review': accused_qs.filter(location_status='needs_review').count(),
        'auto_geocoded': accused_qs.filter(location_status='auto_geocoded').count(),
        'not_geocoded': accused_qs.filter(location_status='not_geocoded').count(),
    }

    recent_accused = accused_qs[:5]

    context = {
        'accused_count': accused_count,
        'photo_count': photo_count,
        'places_count': places_count,
        'status_counts': status_counts,
        'recent_accused': recent_accused,
    }
    return render(request, 'core/dashboard.html', context)


@login_required
def serve_media_view(request, path):
    """
    Serve media files strictly to authenticated users only.
    """
    return static_serve(request, path, document_root=settings.MEDIA_ROOT)


def custom_403(request, exception=None):
    """Custom 403 Forbidden handler."""
    return render(request, '403.html', status=403)


def custom_404(request, exception=None):
    """Custom 404 Not Found handler."""
    return render(request, '404.html', status=404)


def custom_500(request):
    """Custom 500 Internal Server Error handler."""
    return render(request, '500.html', status=500)
