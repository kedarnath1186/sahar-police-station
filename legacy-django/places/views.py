import os

from django.contrib import messages
from django.contrib.auth.decorators import login_required
from django.shortcuts import render, redirect, get_object_or_404
from django.views.decorators.http import require_POST

from core.geocoding import geocode_address
from core.models import log_action

from .forms import FamousPlaceForm
from .models import FamousPlace


@login_required
def add_place(request):
    """Add a new famous place."""
    if request.method == 'POST':
        form = FamousPlaceForm(request.POST, request.FILES)
        if form.is_valid():
            place = form.save(commit=False)

            # Geocode the address
            result = geocode_address([place.address, place.city, place.district, 'Maharashtra'])
            if result:
                place.latitude, place.longitude = result
            else:
                messages.warning(
                    request,
                    'Could not determine location from address. '
                    'The record has been saved without coordinates.'
                )

            place.save()
            log_action(request.user, 'create', 'FamousPlace', place.pk,
                       f'Created place: {place.name}')
            messages.success(request, f'Place "{place.name}" added successfully.')
            return redirect('places_list')
    else:
        form = FamousPlaceForm()

    return render(request, 'places/add.html', {'form': form})


@login_required
def view_places(request):
    """View all famous places as a card grid with a small map."""
    places = FamousPlace.objects.all()
    import json
    places_json = json.dumps([
        {
            'id': p.pk,
            'name': p.name,
            'lat': p.latitude,
            'lon': p.longitude,
            'address': p.address,
            'city': p.city,
        }
        for p in places
        if p.latitude and p.longitude
    ])
    return render(request, 'places/list.html', {
        'places': places,
        'places_json': places_json,
    })


@login_required
def edit_place(request, pk):
    """Edit an existing famous place."""
    place = get_object_or_404(FamousPlace, pk=pk)

    if request.method == 'POST':
        old_address = place.address
        old_city = place.city
        old_district = place.district

        form = FamousPlaceForm(request.POST, request.FILES, instance=place)
        if form.is_valid():
            place = form.save(commit=False)

            # Re-geocode if address fields changed
            address_changed = (
                place.address != old_address or
                place.city != old_city or
                place.district != old_district
            )

            if address_changed:
                result = geocode_address([place.address, place.city, place.district, 'Maharashtra'])
                if result:
                    place.latitude, place.longitude = result
                else:
                    messages.warning(
                        request,
                        'Could not re-geocode the updated address. '
                        'Previous coordinates have been retained.'
                    )

            place.save()
            log_action(request.user, 'update', 'FamousPlace', place.pk,
                       f'Updated place: {place.name}')
            messages.success(request, f'Place "{place.name}" updated successfully.')
            return redirect('places_list')
    else:
        form = FamousPlaceForm(instance=place)

    return render(request, 'places/edit.html', {'form': form, 'place': place})


@login_required
@require_POST
def delete_place(request, pk):
    """Delete a famous place and its photo file with 'DELETE' typing confirmation requirement."""
    place = get_object_or_404(FamousPlace, pk=pk)
    confirmation = request.POST.get('confirm_delete', '').strip()

    if confirmation != 'DELETE':
        messages.error(request, 'Deletion aborted. You must type "DELETE" exactly to confirm.')
        return redirect('places_list')

    name = place.name
    place_pk = place.pk

    # Delete the photo file from disk
    if place.photo and os.path.isfile(place.photo.path):
        try:
            os.remove(place.photo.path)
        except OSError:
            pass

    place.delete()
    log_action(request.user, 'delete', 'FamousPlace', place_pk,
               f'Deleted place: {name}')
    messages.success(request, f'Place "{name}" deleted successfully.')
    return redirect('places_list')
