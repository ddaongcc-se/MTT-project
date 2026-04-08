package middleware

import (
	"net/http"
	"os"
)

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := r.Header.Get("X-Auth-Token")
		expectedToken := os.Getenv("AUTH_TOKEN")

		if expectedToken == "" {
			expectedToken = "remote-pc-secret"
		}

		if token != expectedToken {
			http.Error(w, `{"success":false,"message":"unauthorized"}`, http.StatusUnauthorized)
			return
		}

		next.ServeHTTP(w, r)
	})
}
