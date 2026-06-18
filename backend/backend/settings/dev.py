from .common import *

SECRET_KEY = "7h&&@@i2xwrlc*q5aq-@g5415oc6k%yh@o-*w5ra5dsdi3^^lk"

DEBUG = True

ALLOWED_HOSTS = []

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}
