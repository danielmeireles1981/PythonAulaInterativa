from django.urls import path
from . import views

urlpatterns = [
    # Páginas principais
    path('', views.index, name='index'),
    path('aula/', views.aula, name='aula'),

    # Jogos
    path('games/memory/', views.memory_game, name='memory_game'),
    path('games/snake/', views.snake_game, name='snake_game'),
    path('games/galaga/', views.galaga_game, name='galaga_game'),
    path('games/pacman/', views.pacman_game, name='pacman_game'),

    # Painel de Anotações (NOVO)
    path('dashboard/notes/', views.notes_dashboard, name='notes_dashboard'),

    # API Endpoints
    path('api/hall-of-fame/', views.get_hall_of_fame, name='get_hall_of_fame'),
    path('api/player/update/', views.update_player, name='update_player'),
    path('api/player/<str:name>/', views.get_player_progress, name='get_player_progress'),
    path('api/survey/submit/', views.submit_survey, name='submit_survey'),
    path('api/notes/', views.get_research_notes, name='get_research_notes'), # NOVA API
]