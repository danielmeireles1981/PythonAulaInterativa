from django.db import models

class Player(models.Model):
    name = models.CharField(max_length=100, unique=True)
    avatar = models.CharField(max_length=10, default='🐍')
    score = models.IntegerField(default=0)
    unlocked_step = models.IntegerField(default=1)

    def __str__(self):
        return self.name

class SatisfactionSurvey(models.Model):
    player = models.ForeignKey(Player, on_delete=models.CASCADE, related_name='surveys', null=True, blank=True)
    rating = models.IntegerField() # Avaliação de 1 a 5
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.player.name if self.player else "Anônimo"} - {self.rating} estrelas'