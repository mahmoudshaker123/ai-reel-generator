from rest_framework.authentication import SessionAuthentication

class CsrfExemptSessionAuthentication(SessionAuthentication):
    """
    Session authentication without CSRF enforcement for REST API clients.
    Allows seamless fetch requests from Next.js without requiring manual CSRF token management.
    """
    def enforce_csrf(self, request):
        return  # Do not enforce CSRF for API requests
