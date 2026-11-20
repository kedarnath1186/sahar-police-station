from django.urls import path
from . import views

urlpatterns = [
    path('', views.view_places, name='places_list'),
    path('add/', views.add_place, name='place_add'),
    path('<int:pk>/edit/', views.edit_place, name='place_edit'),
    path('<int:pk>/delete/', views.delete_place, name='place_delete'),
]
