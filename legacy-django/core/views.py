from django.conf import settings
from django.contrib import messages
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.db.models import Count
from django.http import Http404
from django.shortcuts import render, redirect
from django.views.decorators.http import require_POST
from django.views.static import serve as static_serve

from accused.models import Accused, AccusedPhoto
from core.authentication import authenticate_officer, get_client_ip
from places.models import FamousPlace


def login_view(request):
    """
    Handle user login with rate-limiting security:
    Max 5 failed attempts per 15 minutes per username.
    """
    # TODO: Add two-factor authentication here (e.g., django-otp / TOTP SMS)

    if request.user.is_authenticated:
        return redirect('dashboard')

    error = None
    if request.method == 'POST':
        username = request.POST.get('username', '').strip()
        password = request.POST.get('password', '')
        user, error, locked = authenticate_officer(request, username, password)

        if user is not None:
            login(request, user)
            next_url = request.GET.get('next', '/')
            return redirect(next_url)
        if locked:
            return render(request, 'core/login.html', {'error': error, 'locked': True})

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
