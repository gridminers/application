from .dev import *

# Allow all hosts inside Docker; restrict via reverse-proxy in production.
ALLOWED_HOSTS = ["*"]

# Serve on 0.0.0.0 so the container port is reachable from outside.
