from django.urls import path
from . import views

urlpatterns = [
    # Rotas principais
    path('', views.index, name='index'),
    path('aula/', views.aula, name='aula'),

    # Rotas para os jogos com os nomes usados no template 'aula.html'
    path('games/memory/', views.memory_game, name='memory_game'),
    path('games/snake/', views.snake_game, name='snake_game'),
    path('games/galaga/', views.galaga_game, name='galaga_game'),
    path('games/pacman/', views.pacman_game, name='pacman_game'),
    
    # Adicionei também uma rota para o Ludo, caso queira usá-lo no futuro
    path('games/ludo/', views.ludo_game, name='ludo_game'),

    # Rotas para a API do jogador
    path('api/hall-of-fame/', views.get_hall_of_fame, name='get_hall_of_fame'),
    path('api/player/update/', views.update_player, name='update_player'),
    path('api/player/<str:name>/', views.get_player_progress, name='get_player_progress'),

    # Rota para a API da pesquisa de satisfação
    path('api/survey/submit/', views.submit_survey, name='submit_survey'),
]