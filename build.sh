
#!/usr/bin/env bash
# exit on error
set -o errexit

# 1. Instala as dependências
pip install -r requirements.txt

# 2. Coleta todos os arquivos estáticos para a pasta STATIC_ROOT
python manage.py collectstatic --no-input

# 3. Aplica as migrações do banco de dados
python manage.py migrate
