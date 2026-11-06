"""
Custom middleware for Reel Studio API
"""

class NormalizeSlashMiddleware:
    """
    Ensure all /api/ requests internally end with a trailing slash.
    This prevents proxies (such as Next.js rewrites) that normalize away
    trailing slashes from triggering Django 301 redirect loops on GET
    or RuntimeError 500 errors on POST.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.path_info.startswith('/api') and not request.path_info.endswith('/'):
            request.path_info = request.path_info + '/'
            request.path = request.path + '/'
        return self.get_response(request)

