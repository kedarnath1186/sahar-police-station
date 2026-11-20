from django.urls import path

from . import api_views

urlpatterns = [
    path('auth/csrf/', api_views.csrf_token, name='api_csrf'),
    path('auth/login/', api_views.login_api, name='api_login'),
    path('auth/logout/', api_views.logout_api, name='api_logout'),
    path('auth/me/', api_views.current_user, name='api_current_user'),
    path('choices/', api_views.form_choices, name='api_form_choices'),
    path('dashboard/', api_views.dashboard_api, name='api_dashboard'),
    path('accused/', api_views.accused_collection, name='api_accused_collection'),
    path('accused/table/', api_views.accused_table, name='api_accused_table'),
    path('accused/map/', api_views.accused_map, name='api_accused_map'),
    path('accused/<int:pk>/', api_views.accused_detail, name='api_accused_detail'),
    path('accused/<int:pk>/verify/', api_views.verify_accused, name='api_verify_accused'),
    path('accused/<int:pk>/location/', api_views.set_accused_location, name='api_set_accused_location'),
    path('accused/<int:pk>/photos/', api_views.accused_photos, name='api_accused_photos'),
    path('photos/<int:pk>/', api_views.photo_detail, name='api_photo_detail'),
    path('places/', api_views.place_collection, name='api_place_collection'),
    path('places/<int:pk>/', api_views.place_detail, name='api_place_detail'),
]
