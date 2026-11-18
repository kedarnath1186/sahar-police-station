from django.urls import path
from . import views

urlpatterns = [
    path('', views.view_accused_list, name='accused_list'),
    path('add/', views.add_accused, name='accused_add'),
    path('<int:pk>/', views.view_accused_detail, name='accused_detail'),
    path('<int:pk>/edit/', views.edit_accused, name='accused_edit'),
    path('<int:pk>/delete/', views.delete_accused, name='accused_delete'),
    path('<int:pk>/set-location/', views.set_manual_location, name='accused_set_location'),
    path('<int:pk>/verify-location/', views.verify_location, name='accused_verify_location'),
    path('<int:pk>/print/', views.print_accused_record, name='accused_print'),
    path('table/', views.table_view, name='accused_table'),
    path('map/', views.map_view, name='accused_map'),
    path('<int:accused_id>/photos/add/', views.add_photo, name='photo_add'),
    path('photos/<int:pk>/edit/', views.edit_photo, name='photo_edit'),
    path('photos/<int:pk>/delete/', views.delete_photo, name='photo_delete'),
    path('<int:accused_id>/photos/json/', views.accused_photos_api, name='accused_photos_api'),
]
