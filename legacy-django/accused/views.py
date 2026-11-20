import json
import os

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.db.models import Count
from django.http import JsonResponse, HttpResponseBadRequest
from django.shortcuts import render, redirect, get_object_or_404
from django.utils import timezone
from django.views.decorators.http import require_POST

from core.constants import MAHARASHTRA_DISTRICTS_CHOICES, LOCATION_STATUS_CHOICES
from core.geocoding import geocode_accused_address, is_in_india
from core.models import log_action, AuditLog

from .forms import AccusedForm, AccusedPhotoForm
from .models import Accused, AccusedPhoto, LocationCheck


# Address fields that trigger re-geocoding when changed
ADDRESS_FIELDS = ['detailed_address', 'village', 'taluka', 'district', 'state', 'pincode']


def _geocode_accused(accused):
    """Executes the 4-tier fallback geocoding hierarchy for an accused."""
    return geocode_accused_address(
        detailed_address=accused.detailed_address,
        village=accused.village,
        taluka=accused.taluka,
        district=accused.district,
        state=accused.state or 'Maharashtra',
        pincode=accused.pincode or '',
    )


@login_required
def add_accused(request):
    """Add a new accused record with 4-tier geocoding and fallback rules."""
    if request.method == 'POST':
        form = AccusedForm(request.POST)
        if form.is_valid():
            accused = form.save(commit=False)
            res = _geocode_accused(accused)

            if res.success and res.latitude and res.longitude:
                accused.latitude = res.latitude
                accused.longitude = res.longitude
                accused.location_accuracy = res.accuracy
                accused.geocoded_query = res.query_used
                accused.geocoded_display_name = res.display_name
                accused.geocoded_at = timezone.now()

                # Accuracy failure rule: below exact requires review
                if res.accuracy == 'exact':
                    accused.location_status = 'auto_geocoded'
                else:
                    accused.location_status = 'needs_review'

                accused.save()

                LocationCheck.objects.create(
                    accused=accused,
                    officer=request.user,
                    action='auto_geocoded',
                    latitude=res.latitude,
                    longitude=res.longitude,
                    location_status=accused.location_status,
                    location_accuracy=accused.location_accuracy,
                    note=f'Auto-geocoded at fallback tier {res.step_matched} ({res.accuracy})',
                )
                log_action(request.user, 'create', 'Accused', accused.pk,
                           f'Created {accused.record_id}: {accused.full_name} ({accused.location_status})')
                messages.success(request, f'Accused record {accused.record_id} registered and geocoded ({accused.location_status}).')
            else:
                # Failure rule: all attempts failed
                accused.latitude = None
                accused.longitude = None
                accused.location_status = 'not_geocoded'
                accused.location_accuracy = 'unknown'
                accused.geocoded_query = res.query_used
                accused.geocoded_display_name = ''
                accused.geocoded_at = timezone.now()
                accused.save()

                LocationCheck.objects.create(
                    accused=accused,
                    officer=request.user,
                    action='auto_geocoded',
                    latitude=None,
                    longitude=None,
                    location_status='not_geocoded',
                    location_accuracy='unknown',
                    note='All 4 geocoding fallback tiers failed.',
                )
                log_action(request.user, 'create', 'Accused', accused.pk,
                           f'Created {accused.record_id}: {accused.full_name} (location not found)')
                messages.warning(request, 'Location not found. Set it manually on the map.')

            return redirect('accused_detail', pk=accused.pk)
    else:
        form = AccusedForm()

    return render(request, 'accused/add.html', {'form': form})


@login_required
def view_accused_list(request):
    """List all accused records with filtering and counts."""
    qs = Accused.objects.all()

    # Filters
    district_filter = request.GET.get('district', '')
    status_filter = request.GET.get('status', '')

    if district_filter:
        qs = qs.filter(district=district_filter)
    if status_filter:
        qs = qs.filter(location_status=status_filter)

    return render(request, 'accused/list.html', {
        'accused_list': qs,
        'districts': [d[0] for d in MAHARASHTRA_DISTRICTS_CHOICES],
        'statuses': LOCATION_STATUS_CHOICES,
        'selected_district': district_filter,
        'selected_status': status_filter,
    })


@login_required
def view_accused_detail(request, pk):
    """View details of an accused record with Personal, Location, Photos, and History tabs."""
    accused = get_object_or_404(Accused, pk=pk)
    photos = accused.photos.all()
    location_checks = accused.location_checks.all()
    audit_logs = AuditLog.objects.filter(model_name='Accused', object_id=accused.pk)

    return render(request, 'accused/detail.html', {
        'accused': accused,
        'photos': photos,
        'location_checks': location_checks,
        'audit_logs': audit_logs,
    })


@login_required
def edit_accused(request, pk):
    """Edit accused record with strict address-change re-geocoding failure rules."""
    accused = get_object_or_404(Accused, pk=pk)

    if request.method == 'POST':
        old_address = {field: getattr(accused, field) for field in ADDRESS_FIELDS}

        form = AccusedForm(request.POST, instance=accused)
        if form.is_valid():
            accused = form.save(commit=False)

            # Check if address changed
            address_changed = any(
                getattr(accused, field) != old_address[field]
                for field in ADDRESS_FIELDS
            )

            if address_changed:
                res = _geocode_accused(accused)

                if res.success and res.latitude and res.longitude:
                    accused.latitude = res.latitude
                    accused.longitude = res.longitude
                    accused.location_accuracy = res.accuracy
                    accused.geocoded_query = res.query_used
                    accused.geocoded_display_name = res.display_name
                    accused.geocoded_at = timezone.now()

                    # Address change resets status to needs_review and clears verification
                    accused.location_status = 'needs_review'
                    accused.verified_by = None
                    accused.verified_at = None
                    accused.save()

                    LocationCheck.objects.create(
                        accused=accused,
                        officer=request.user,
                        action='re_geocoded',
                        latitude=res.latitude,
                        longitude=res.longitude,
                        location_status=accused.location_status,
                        location_accuracy=accused.location_accuracy,
                        note='Address changed; re-geocoded successfully. Requires verification review.',
                    )
                    log_action(request.user, 'update', 'Accused', accused.pk,
                               f'Updated address for {accused.record_id}; re-geocoded to {res.accuracy}')
                    messages.success(request, f'Accused record {accused.record_id} updated and re-geocoded.')
                else:
                    # Failure rule: clear coordinates and remove marker
                    accused.latitude = None
                    accused.longitude = None
                    accused.location_status = 'not_geocoded'
                    accused.location_accuracy = 'unknown'
                    accused.geocoded_query = res.query_used
                    accused.geocoded_display_name = ''
                    accused.geocoded_at = timezone.now()
                    accused.verified_by = None
                    accused.verified_at = None
                    accused.save()

                    LocationCheck.objects.create(
                        accused=accused,
                        officer=request.user,
                        action='cleared',
                        latitude=None,
                        longitude=None,
                        location_status='not_geocoded',
                        location_accuracy='unknown',
                        note='Address changed; geocoding failed. Coordinates cleared and marker removed.',
                    )
                    log_action(request.user, 'update', 'Accused', accused.pk,
                               f'Updated address for {accused.record_id}; geocoding failed and coordinates cleared.')
                    messages.warning(
                        request,
                        'Location could not be found; the map marker has been removed until the location is set manually.'
                    )
            else:
                # No address field changed: keep existing coordinates and status
                accused.save()
                log_action(request.user, 'update', 'Accused', accused.pk,
                           f'Updated details for {accused.record_id}')
                messages.success(request, f'Record {accused.record_id} updated successfully.')

            return redirect('accused_detail', pk=accused.pk)
    else:
        form = AccusedForm(instance=accused)

    return render(request, 'accused/edit.html', {
        'form': form,
        'accused': accused,
    })


@login_required
@require_POST
def set_manual_location(request, pk):
    """
    Action to manually set coordinates from the Leaflet interactive map on the edit page.
    Sets location_status = 'manually_set' and records LocationCheck.
    """
    accused = get_object_or_404(Accused, pk=pk)

    try:
        lat = float(request.POST.get('latitude', ''))
        lon = float(request.POST.get('longitude', ''))
    except (ValueError, TypeError):
        messages.error(request, 'Invalid coordinates submitted.')
        return redirect('accused_edit', pk=accused.pk)

    if not is_in_india(lat, lon):
        messages.error(request, 'Coordinates must reside within India geographic bounds.')
        return redirect('accused_edit', pk=accused.pk)

    note = request.POST.get('note', '').strip() or 'Manually positioned on police map.'

    accused.latitude = round(lat, 6)
    accused.longitude = round(lon, 6)
    accused.location_status = 'manually_set'
    accused.location_accuracy = 'exact'
    accused.verified_by = None
    accused.verified_at = None
    accused.save()

    LocationCheck.objects.create(
        accused=accused,
        officer=request.user,
        action='manually_set',
        latitude=accused.latitude,
        longitude=accused.longitude,
        location_status=accused.location_status,
        location_accuracy=accused.location_accuracy,
        note=note,
    )
    log_action(request.user, 'manual_set', 'Accused', accused.pk,
               f'Manually set location for {accused.record_id} to ({lat:.6f}, {lon:.6f})')

    messages.success(request, f'Location for {accused.record_id} manually set to ({lat:.6f}, {lon:.6f}).')
    return redirect('accused_detail', pk=accused.pk)


@login_required
@require_POST
def verify_location(request, pk):
    """
    Action for an officer to formally verify the accused's location.
    Sets location_status = 'verified', logs officer ID and timestamp.
    Must be a separate action from setting the location.
    """
    accused = get_object_or_404(Accused, pk=pk)

    if not accused.latitude or not accused.longitude:
        messages.error(request, 'Cannot verify a record without established coordinates.')
        return redirect('accused_detail', pk=accused.pk)

    note = request.POST.get('note', '').strip() or 'Officer verified marker against address dossier.'

    accused.location_status = 'verified'
    accused.verified_by = request.user
    accused.verified_at = timezone.now()
    accused.save()

    LocationCheck.objects.create(
        accused=accused,
        officer=request.user,
        action='verified',
        latitude=accused.latitude,
        longitude=accused.longitude,
        location_status=accused.location_status,
        location_accuracy=accused.location_accuracy,
        note=note,
    )
    log_action(request.user, 'verify', 'Accused', accused.pk,
               f'Officer {request.user.get_full_name() or request.user.username} verified location for {accused.record_id}')

    messages.success(request, f'Location for {accused.record_id} has been verified and certified.')
    return redirect('accused_detail', pk=accused.pk)


@login_required
def print_accused_record(request, pk):
    """Clean, print-friendly dossier view without navigation bars."""
    accused = get_object_or_404(Accused, pk=pk)
    photos = accused.photos.all()
    location_checks = accused.location_checks.all()
    audit_logs = AuditLog.objects.filter(model_name='Accused', object_id=accused.pk)

    return render(request, 'accused/print.html', {
        'accused': accused,
        'photos': photos,
        'location_checks': location_checks,
        'audit_logs': audit_logs,
        'print_time': timezone.now(),
    })


@login_required
@require_POST
def delete_accused(request, pk):
    """Delete an accused record with 'DELETE' typing confirmation requirement."""
    accused = get_object_or_404(Accused, pk=pk)
    confirmation = request.POST.get('confirm_delete', '').strip()

    if confirmation != 'DELETE':
        messages.error(request, 'Deletion aborted. You must type "DELETE" exactly to confirm.')
        return redirect('accused_detail', pk=accused.pk)

    record_id = accused.record_id
    name = accused.full_name
    accused_pk = accused.pk
    accused.delete()

    log_action(request.user, 'delete', 'Accused', accused_pk,
               f'Permanently deleted dossier {record_id} ({name})')
    messages.success(request, f'Accused dossier {record_id} ({name}) permanently deleted.')
    return redirect('accused_list')


@login_required
def table_view(request):
    """Show all accused in a DataTables-compatible table with multi-criteria server/client filtering."""
    qs = Accused.objects.annotate(photo_count=Count('photos'))

    district_filter = request.GET.get('district', '')
    status_filter = request.GET.get('status', '')
    has_photos_filter = request.GET.get('has_photos', '')

    if district_filter:
        qs = qs.filter(district=district_filter)
    if status_filter:
        qs = qs.filter(location_status=status_filter)
    if has_photos_filter == 'yes':
        qs = qs.filter(photo_count__gt=0)
    elif has_photos_filter == 'no':
        qs = qs.filter(photo_count=0)

    return render(request, 'accused/table.html', {
        'accused_list': qs,
        'districts': [d[0] for d in MAHARASHTRA_DISTRICTS_CHOICES],
        'statuses': LOCATION_STATUS_CHOICES,
        'selected_district': district_filter,
        'selected_status': status_filter,
        'selected_photos': has_photos_filter,
    })


@login_required
def map_view(request):
    """
    Leaflet map with status-colored markers, accuracy circles,
    side panel for 'Needs review' and 'Missing location' records, and district/status filters.
    """
    all_accused = Accused.objects.all().annotate(photo_count=Count('photos'))

    # Records with coordinates
    accused_with_coords = all_accused.filter(
        latitude__isnull=False,
        longitude__isnull=False,
    )

    # Side panel lists
    needs_review_list = all_accused.filter(location_status__in=['needs_review', 'auto_geocoded'])
    no_location_list = all_accused.filter(location_status='not_geocoded')

    accused_data = json.dumps([
        {
            'id': a.pk,
            'record_id': a.record_id,
            'name': a.full_name,
            'lat': a.latitude,
            'lon': a.longitude,
            'address': f'{a.detailed_address}, {a.village}, {a.city}',
            'district': a.district,
            'status': a.location_status,
            'accuracy': a.location_accuracy,
            'display_name': a.geocoded_display_name or f"{a.village}, {a.city}, {a.district}",
            'photo_count': a.photo_count,
        }
        for a in accused_with_coords
    ])

    return render(request, 'accused/map.html', {
        'accused_data': accused_data,
        'needs_review_list': needs_review_list,
        'no_location_list': no_location_list,
        'districts': [d[0] for d in MAHARASHTRA_DISTRICTS_CHOICES],
        'statuses': LOCATION_STATUS_CHOICES,
    })


@login_required
def add_photo(request, accused_id):
    """Upload a location photo for an accused."""
    accused = get_object_or_404(Accused, pk=accused_id)

    if request.method == 'POST':
        form = AccusedPhotoForm(request.POST, request.FILES)
        if form.is_valid():
            photo = form.save(commit=False)
            photo.accused = accused
            photo.save()
            log_action(request.user, 'create', 'AccusedPhoto', photo.pk,
                       f'Uploaded photo for {accused.record_id}: {accused.full_name}')
            messages.success(request, f'Photo uploaded successfully for {accused.record_id}.')
            return redirect('accused_detail', pk=accused.pk)
    else:
        initial_address = ', '.join(filter(None, [
            accused.detailed_address,
            accused.village,
            accused.city,
            accused.district,
            accused.state,
        ]))
        initial = {
            'location_address': initial_address,
            'latitude': accused.latitude or 19.0760,
            'longitude': accused.longitude or 72.8777,
        }
        form = AccusedPhotoForm(initial=initial)

    return render(request, 'accused/add_photo.html', {
        'form': form,
        'accused': accused,
    })


@login_required
def edit_photo(request, pk):
    """Edit caption and address of a photo."""
    photo = get_object_or_404(AccusedPhoto, pk=pk)

    if request.method == 'POST':
        form = AccusedPhotoForm(request.POST, request.FILES, instance=photo)
        if form.is_valid():
            form.save()
            log_action(request.user, 'update', 'AccusedPhoto', photo.pk,
                       f'Updated photo metadata for {photo.accused.record_id}')
            messages.success(request, 'Photo details updated successfully.')
            return redirect('accused_detail', pk=photo.accused.pk)
    else:
        form = AccusedPhotoForm(instance=photo)

    return render(request, 'accused/edit_photo.html', {
        'form': form,
        'photo': photo,
        'accused': photo.accused,
    })


@login_required
@require_POST
def delete_photo(request, pk):
    """Delete a photo and file from disk with 'DELETE' typing confirmation requirement."""
    photo = get_object_or_404(AccusedPhoto, pk=pk)
    confirmation = request.POST.get('confirm_delete', '').strip()

    if confirmation != 'DELETE':
        messages.error(request, 'Photo deletion aborted. You must type "DELETE" to confirm.')
        return redirect('accused_detail', pk=photo.accused.pk)

    accused_pk = photo.accused.pk
    photo_pk = photo.pk
    accused_id = photo.accused.record_id

    if photo.image and os.path.isfile(photo.image.path):
        try:
            os.remove(photo.image.path)
        except OSError:
            pass

    photo.delete()
    log_action(request.user, 'delete', 'AccusedPhoto', photo_pk,
               f'Deleted photo #{photo_pk} for {accused_id}')
    messages.success(request, f'Photo #{photo_pk} deleted permanently.')
    return redirect('accused_detail', pk=accused_pk)


@login_required
def accused_photos_api(request, accused_id):
    """Return JSON of photos for a specific accused (for map AJAX loading)."""
    accused = get_object_or_404(Accused, pk=accused_id)
    photos = accused.photos.all()
    data = [
        {
            'id': p.pk,
            'image_url': p.image.url if p.image else '',
            'location_address': p.location_address,
            'latitude': p.latitude,
            'longitude': p.longitude,
            'caption': p.caption,
            'uploaded_at': p.uploaded_at.isoformat(),
        }
        for p in photos
    ]
    return JsonResponse({
        'accused': accused.full_name,
        'record_id': accused.record_id,
        'photos': data
    })
