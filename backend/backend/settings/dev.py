from .common import *

SECRET_KEY = "7h&&@@i2xwrlc*q5aq-@g5415oc6k%yh@o-*w5ra5dsdi3^^lk"

DEBUG = True

ALLOWED_HOSTS = []

# CORS
CORS_ALLOWED_ORIGINS = [
    "http://localhost:4200",
    "http://127.0.0.1:4200",
]

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
