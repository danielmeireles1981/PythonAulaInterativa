from django.shortcuts import render
from django.http import JsonResponse
from django.db.models import F
from .models import Player, SatisfactionSurvey
from django.views.decorators.csrf import csrf_exempt
import json

# View para a página principal do mapa
def index(request):
    return render(request, 'index.html')

# View para a página da aula
def aula(request):
    return render(request, 'aula.html')

# --- Views para os Jogos ---

def memory_game(request):
    return render(request, 'memoryGame.html')

def snake_game(request):
    return render(request, 'snakeGame.html')

def galaga_game(request):
    return render(request, 'galagaGame.html')

def pacman_game(request):
    return render(request, 'pacmanGame.html')

def ludo_game(request):
    return render(request, 'ludoGame.html')

# --- Views para a API ---

def get_hall_of_fame(request):
    """Retorna os 10 melhores jogadores, com desempate por tempo."""
    # Ordena por pontuação (maior primeiro) e depois por tempo (menor primeiro).
    # Jogadores sem tempo de conclusão (null) são colocados no final do seu grupo de pontuação.
    players = Player.objects.order_by('-score', F('completion_time_seconds').asc(nulls_last=True))[:10]

    # Adicionamos 'completion_time_seconds' para que o frontend possa exibi-lo
    data = list(players.values('name', 'avatar', 'score', 'completion_time_seconds'))
    return JsonResponse(data, safe=False)

@csrf_exempt
def update_player(request):
    """Cria ou atualiza os dados de um jogador."""
    if request.method == 'POST':
        data = json.loads(request.body)
        name = data.get('name')
        if not name:
            return JsonResponse({'status': 'error', 'message': 'Nome é obrigatório'}, status=400)

        player, created = Player.objects.update_or_create(
            name=name,
            defaults={
                'avatar': data.get('avatar', '🐍'),
                'score': data.get('score', 0),
                'unlocked_step': data.get('unlocked_step', 1),
                'completion_time_seconds': data.get('completion_time_seconds') # Aceita o tempo de conclusão
            }
        )
        return JsonResponse({'status': 'success', 'created': created})
    return JsonResponse({'status': 'error', 'message': 'Método não permitido'}, status=405)

def get_player_progress(request, name):
    """Retorna o progresso de um jogador específico."""
    player = Player.objects.filter(name=name).first()
    if player:
        data = {'name': player.name, 'score': player.score, 'unlocked_step': player.unlocked_step}
        return JsonResponse(data)
    return JsonResponse({'status': 'error', 'message': 'Jogador não encontrado'}, status=404)

@csrf_exempt
def submit_survey(request):
    """Recebe e salva a avaliação de satisfação de um jogador."""
    if request.method == 'POST':
        data = json.loads(request.body)
        player_name = data.get('name')
        rating = data.get('rating')

        if not rating:
            return JsonResponse({'status': 'error', 'message': 'Avaliação é obrigatória'}, status=400)

        try:
            player = Player.objects.get(name=player_name) if player_name else None
            SatisfactionSurvey.objects.create(player=player, rating=rating)
            return JsonResponse({'status': 'success', 'message': 'Feedback recebido com sucesso!'})
        except Player.DoesNotExist:
            # Salva a avaliação mesmo se o jogador não for encontrado (avaliação anônima)
            SatisfactionSurvey.objects.create(player=None, rating=rating)
            return JsonResponse({'status': 'success', 'message': 'Feedback anônimo recebido!'})
    return JsonResponse({'status': 'error', 'message': 'Método não permitido'}, status=405)