from django.contrib import messages
from django.contrib.auth import login as auth_login, logout as auth_logout
from django.db.models import Count, Q
from django.http import QueryDict
from django.middleware.csrf import get_token
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect, ensure_csrf_cookie
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.exceptions import ValidationError
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView

from accused.models import Accused, AccusedPhoto
from core.authentication import authenticate_officer
from places.models import FamousPlace


def _accused_json(accused):
    return {
        'id': accused.pk,
        'record_id': accused.record_id,
        'full_name': accused.full_name,
        'mobile_number': accused.mobile_number,
        'formatted_mobile': accused.formatted_mobile,
        'detailed_address': accused.detailed_address,
        'village': accused.village,
        'city': accused.city,
        'taluka': accused.taluka,
        'district': accused.district,
        'state': accused.state,
        'pincode': accused.pincode,
        'latitude': accused.latitude,
        'longitude': accused.longitude,
        'location_status': accused.location_status,
        'location_accuracy': accused.location_accuracy,
        'geocoded_query': accused.geocoded_query,
        'geocoded_display_name': accused.geocoded_display_name,
        'geocoded_at': accused.geocoded_at,
        'verified_by': accused.verified_by.get_full_name() or accused.verified_by.username
        if accused.verified_by else None,
        'verified_at': accused.verified_at,
        'created_at': accused.created_at,
        'updated_at': accused.updated_at,
        'photo_count': (
            accused.photo_count if hasattr(accused, 'photo_count')
            else accused.photos.count()
        ),
    }


def _photo_json(photo, request):
    return {
        'id': photo.pk,
        'accused_id': photo.accused_id,
        'image_url': request.build_absolute_uri(photo.image.url) if photo.image else '',
        'location_address': photo.location_address,
        'latitude': photo.latitude,
        'longitude': photo.longitude,
        'caption': photo.caption,
        'uploaded_at': photo.uploaded_at,
    }


def _place_json(place, request):
    return {
        'id': place.pk,
        'name': place.name,
        'description': place.description,
        'city': place.city,
        'district': place.district,
        'address': place.address,
        'latitude': place.latitude,
        'longitude': place.longitude,
        'photo_url': request.build_absolute_uri(place.photo.url) if place.photo else '',
    }


def _request_with_form_data(request):
    """Adapt API request data to the existing Django forms and views."""
    django_request = request._request
    data = request.data
    if hasattr(data, 'lists'):
        post_data = data
    else:
        post_data = QueryDict('', mutable=True)
        for key, value in data.items():
            if not hasattr(value, 'read'):
                post_data[key] = value
    django_request.method = 'POST'
    django_request._post = post_data
    if request.FILES:
        django_request._files = request.FILES
    return django_request


def _run_existing_view(request, view, kwargs=None, result_getter=None, form=None):
    """Adapt existing HTML workflows without duplicating their validation or rules."""
    if form is not None and not form.is_valid():
        return Response(
            {'errors': form.errors.get_json_data()},
            status=status.HTTP_400_BAD_REQUEST,
        )

    django_request = _request_with_form_data(request)
    response = view(django_request, **(kwargs or {}))

    queued_messages = list(getattr(django_request, '_messages', []))
    errors = [str(message) for message in queued_messages if message.level >= messages.ERROR]
    if errors:
        return Response({'detail': errors}, status=status.HTTP_400_BAD_REQUEST)

    if result_getter:
        result = result_getter()
        if result is None:
            return Response(status=status.HTTP_204_NO_CONTENT)
        return Response(result)
    return Response(status=status.HTTP_204_NO_CONTENT)


def _paginated_accused(queryset, request):
    try:
        page = max(1, int(request.query_params.get('page', 1)))
        page_size = min(100, max(1, int(request.query_params.get('page_size', 20))))
    except (TypeError, ValueError):
        raise ValidationError({'page': 'Page and page_size must be integers.'})
    total = queryset.count()
    start = (page - 1) * page_size
    return {
        'results': [_accused_json(record) for record in queryset[start:start + page_size]],
        'count': total,
        'page': page,
        'page_size': page_size,
        'total_pages': (total + page_size - 1) // page_size,
    }


@api_view(['GET'])
@permission_classes([AllowAny])
@ensure_csrf_cookie
def csrf_token(request):
    return Response({'csrfToken': get_token(request)})


@method_decorator(csrf_protect, name='dispatch')
class LoginAPI(APIView):
    permission_classes = [AllowAny]
    authentication_classes = []

    def post(self, request):
        username = str(request.data.get('username', '')).strip()
        password = request.data.get('password', '')
        if not username or not password:
            return Response({'detail': 'Username and password are required.'}, status=400)

        user, error, locked = authenticate_officer(request._request, username, password)
        if user is None:
            response_status = (
                status.HTTP_429_TOO_MANY_REQUESTS if locked
                else status.HTTP_401_UNAUTHORIZED
            )
            return Response({'detail': error}, status=response_status)
        auth_login(request._request, user)
        return Response({'user': _user_json(user)})


login_api = LoginAPI.as_view()


def _user_json(user):
    return {
        'id': user.pk,
        'username': user.get_full_name() or user.username,
        'is_staff': user.is_staff,
    }


@api_view(['POST'])
def logout_api(request):
    auth_logout(request._request)
    return Response(status=status.HTTP_204_NO_CONTENT)


@api_view(['GET'])
def current_user(request):
    return Response(_user_json(request.user))


@api_view(['GET'])
def dashboard_api(request):
    accused = Accused.objects.all()
    return Response({
        'accused_count': accused.count(),
        'photo_count': AccusedPhoto.objects.count(),
        'places_count': FamousPlace.objects.count(),
        'status_counts': {
            key: accused.filter(location_status=key).count()
            for key in ('verified', 'manually_set', 'needs_review', 'auto_geocoded', 'not_geocoded')
        },
        'recent_accused': [_accused_json(item) for item in accused[:5]],
    })


@api_view(['GET', 'POST'])
def accused_collection(request):
    if request.method == 'GET':
        queryset = Accused.objects.annotate(photo_count=Count('photos'))
        for field in ('district', 'location_status'):
            value = request.query_params.get(field)
            if value:
                queryset = queryset.filter(**{field: value})
        search = request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(full_name__icontains=search) |
                Q(mobile_number__icontains=search) |
                Q(detailed_address__icontains=search) |
                Q(district__icontains=search)
            )
        return Response(_paginated_accused(queryset, request))

    from accused import views as accused_views
    from accused.forms import AccusedForm
    return _run_existing_view(
        request, accused_views.add_accused,
        result_getter=lambda: _accused_json(Accused.objects.order_by('-pk').first())
        if Accused.objects.exists() else None,
        form=AccusedForm(request.data, request.FILES),
    )


@api_view(['GET'])
def accused_table(request):
    queryset = Accused.objects.annotate(photo_count=Count('photos'))
    district = request.query_params.get('district')
    location_status = request.query_params.get('status')
    has_photos = request.query_params.get('has_photos')
    if district:
        queryset = queryset.filter(district=district)
    if location_status:
        queryset = queryset.filter(location_status=location_status)
    if has_photos == 'yes':
        queryset = queryset.filter(photo_count__gt=0)
    elif has_photos == 'no':
        queryset = queryset.filter(photo_count=0)
    search = request.query_params.get('search', '').strip()
    if search:
        queryset = queryset.filter(
            Q(full_name__icontains=search) |
            Q(mobile_number__icontains=search) |
            Q(detailed_address__icontains=search) |
            Q(district__icontains=search)
        )
    ordering = request.query_params.get('ordering', '-created_at')
    allowed_ordering = {'full_name', '-full_name', 'created_at', '-created_at', 'district', '-district'}
    if ordering not in allowed_ordering:
        raise ValidationError({'ordering': 'Unsupported ordering field.'})
    return Response(_paginated_accused(queryset.order_by(ordering), request))


@api_view(['GET'])
def accused_map(request):
    queryset = Accused.objects.annotate(photo_count=Count('photos'))
    return Response({
        'records': [
            {
                **_accused_json(item),
                'name': item.full_name,
                'lat': item.latitude,
                'lon': item.longitude,
                'address': f'{item.detailed_address}, {item.village}, {item.city}',
                'display_name': item.geocoded_display_name or f'{item.village}, {item.city}, {item.district}',
            }
            for item in queryset.filter(latitude__isnull=False, longitude__isnull=False)
        ],
        'needs_review': [
            _accused_json(item)
            for item in queryset.filter(location_status__in=('needs_review', 'auto_geocoded'))
        ],
        'not_geocoded': [
            _accused_json(item) for item in queryset.filter(location_status='not_geocoded')
        ],
    })


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def accused_detail(request, pk):
    from accused import views as accused_views
    accused = Accused.objects.filter(pk=pk).first()
    if request.method == 'GET':
        if not accused:
            return Response({'detail': 'Not found.'}, status=404)
        return Response({
            **_accused_json(accused),
            'photos': [_photo_json(photo, request) for photo in accused.photos.all()],
            'location_checks': [
                {
                    'action': check.action,
                    'latitude': check.latitude,
                    'longitude': check.longitude,
                    'location_status': check.location_status,
                    'location_accuracy': check.location_accuracy,
                    'note': check.note,
                    'timestamp': check.timestamp,
                    'officer': check.officer.get_full_name() or check.officer.username
                    if check.officer else None,
                }
                for check in accused.location_checks.all()
            ],
        })
    if not accused:
        return Response({'detail': 'Not found.'}, status=404)
    if request.method == 'DELETE':
        request._full_data = QueryDict('confirm_delete=DELETE')
        return _run_existing_view(request, accused_views.delete_accused, {'pk': pk})
    from accused.forms import AccusedForm
    return _run_existing_view(
        request, accused_views.edit_accused, {'pk': pk},
        result_getter=lambda: _accused_json(Accused.objects.get(pk=pk)),
        form=AccusedForm(request.data, request.FILES, instance=accused),
    )


@api_view(['POST'])
def verify_accused(request, pk):
    from accused import views as accused_views
    return _run_existing_view(
        request, accused_views.verify_location, {'pk': pk},
        result_getter=lambda: _accused_json(Accused.objects.get(pk=pk)),
    )


@api_view(['POST', 'PUT', 'PATCH'])
def set_accused_location(request, pk):
    from accused import views as accused_views
    return _run_existing_view(
        request, accused_views.set_manual_location, {'pk': pk},
        result_getter=lambda: _accused_json(Accused.objects.get(pk=pk)),
    )


@api_view(['GET', 'POST'])
def accused_photos(request, pk):
    from accused import views as accused_views
    accused = Accused.objects.filter(pk=pk).first()
    if not accused:
        return Response({'detail': 'Not found.'}, status=404)
    if request.method == 'GET':
        return Response([_photo_json(photo, request) for photo in accused.photos.all()])
    from accused.forms import AccusedPhotoForm
    return _run_existing_view(
        request, accused_views.add_photo, {'accused_id': pk},
        result_getter=lambda: _photo_json(accused.photos.first(), request) if accused.photos.exists() else None,
        form=AccusedPhotoForm(request.data, request.FILES),
    )


@api_view(['PUT', 'PATCH', 'DELETE'])
def photo_detail(request, pk):
    from accused import views as accused_views
    photo = AccusedPhoto.objects.filter(pk=pk).first()
    if not photo:
        return Response({'detail': 'Not found.'}, status=404)
    if request.method == 'DELETE':
        request._full_data = QueryDict('confirm_delete=DELETE')
        return _run_existing_view(request, accused_views.delete_photo, {'pk': pk})
    from accused.forms import AccusedPhotoForm
    return _run_existing_view(
        request, accused_views.edit_photo, {'pk': pk},
        result_getter=lambda: _photo_json(AccusedPhoto.objects.get(pk=pk), request),
        form=AccusedPhotoForm(request.data, request.FILES, instance=photo),
    )


@api_view(['GET', 'POST'])
def place_collection(request):
    from places import views as place_views
    if request.method == 'GET':
        return Response([_place_json(place, request) for place in FamousPlace.objects.all()])
    from places.forms import FamousPlaceForm
    return _run_existing_view(
        request, place_views.add_place,
        result_getter=lambda: _place_json(FamousPlace.objects.order_by('-pk').first(), request)
        if FamousPlace.objects.exists() else None,
        form=FamousPlaceForm(request.data, request.FILES),
    )


@api_view(['GET', 'PUT', 'PATCH', 'DELETE'])
def place_detail(request, pk):
    from places import views as place_views
    place = FamousPlace.objects.filter(pk=pk).first()
    if not place:
        return Response({'detail': 'Not found.'}, status=404)
    if request.method == 'GET':
        return Response(_place_json(place, request))
    if request.method == 'DELETE':
        request._full_data = QueryDict('confirm_delete=DELETE')
        return _run_existing_view(request, place_views.delete_place, {'pk': pk})
    from places.forms import FamousPlaceForm
    return _run_existing_view(
        request, place_views.edit_place, {'pk': pk},
        result_getter=lambda: _place_json(FamousPlace.objects.get(pk=pk), request),
        form=FamousPlaceForm(request.data, request.FILES, instance=place),
    )
