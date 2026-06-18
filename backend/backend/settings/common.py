import os
from pathlib import Path

# Build paths inside the project like this: BASE_DIR / 'subdir'.
BASE_DIR = Path(__file__).resolve().parent.parent.parent

INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.staticfiles',
    'django.contrib.messages',
    'rest_framework',
    'corsheaders',
    'core',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'corsheaders.middleware.CorsMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
]

# django-rest-framework
REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': (
        # 'rest_framework_simplejwt.authentication.JWTAuthentication',
    ),
}

# LLM-Veredelung eingehender Parser-Exporte (Refining/Sanitizing/Enriching).
# Eingehende ``targets`` werden vor dem Persistieren durch dasselbe
# Azure-OpenAI-Modell geschickt, das auch der Parser nutzt, damit Anträge mit
# kleinen Formatproblemen nicht mehr abgelehnt, sondern bereinigt werden.
# Ohne API-Key bzw. bei ENABLED=False arbeitet der Refiner als Passthrough.
LLM_REFINER = {
    'ENABLED': os.getenv('LLM_REFINER_ENABLED', 'true').strip().lower()
    in ('1', 'true', 'yes', 'on'),
    'API_KEY': os.getenv('AZURE_OPENAI_API_KEY', '').strip(),
    'MODEL': os.getenv('AZURE_OPENAI_MODEL', 'gpt-5.4').strip(),
    'ENDPOINT': os.getenv(
        'AZURE_OPENAI_ENDPOINT',
        'https://internal-use-ai.cognitiveservices.azure.com/openai/responses',
    ).strip(),
    'API_VERSION': os.getenv(
        'AZURE_OPENAI_API_VERSION', '2025-04-01-preview'
    ).strip(),
    'TIMEOUT': int(os.getenv('LLM_REFINER_TIMEOUT', '60')),
    'MAX_RETRIES': int(os.getenv('LLM_REFINER_MAX_RETRIES', '3')),
}

# URLs
ROOT_URLCONF = 'backend.urls'

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.debug',
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
                'django.contrib.messages.context_processors.messages',
            ],
        },
    },
]

WSGI_APPLICATION = 'backend.wsgi.application'

# Database
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# Password validation
AUTH_PASSWORD_VALIDATORS = [
    {
        'NAME': 'django.contrib.auth.password_validation.UserAttributeSimilarityValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.CommonPasswordValidator',
    },
    {
        'NAME': 'django.contrib.auth.password_validation.NumericPasswordValidator',
    },
]

# Internationalization
LANGUAGE_CODE = 'en-us'

TIME_ZONE = 'UTC'

USE_I18N = True

USE_L10N = True

USE_TZ = True

AUTHENTICATION_BACKENDS = [
    'django.contrib.auth.backends.ModelBackend',
]

LOGIN_REDIRECT_URL = '/'

STATIC_URL = "static/"