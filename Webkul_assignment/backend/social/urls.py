from django.urls import path
from .views import (
    SignupView, LoginView, ProfileView,
    PostListCreateView, PostDetailView, PostReactionView,
    RootView
)

urlpatterns = [
    path('', RootView.as_view(), name='root'),
    path('auth/signup', SignupView.as_view(), name='signup'),
    path('auth/login', LoginView.as_view(), name='login'),
    path('profile', ProfileView.as_view(), name='profile'),
    path('posts', PostListCreateView.as_view(), name='posts'),
    path('posts/<uuid:post_id>', PostDetailView.as_view(), name='post-detail'),
    path('posts/<uuid:post_id>/react', PostReactionView.as_view(), name='post-react'),
]
