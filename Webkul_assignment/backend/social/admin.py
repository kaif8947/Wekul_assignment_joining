from django.contrib import admin
from .models import User, Post, Reaction


@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ['email', 'full_name', 'date_of_birth', 'created_at']
    list_filter = ['created_at']
    search_fields = ['email', 'full_name']
    ordering = ['-created_at']


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ['id', 'user_name', 'description', 'likes_count', 'dislikes_count', 'created_at']
    list_filter = ['created_at']
    search_fields = ['user_name', 'description']
    ordering = ['-created_at']


@admin.register(Reaction)
class ReactionAdmin(admin.ModelAdmin):
    list_display = ['id', 'user_id', 'post_id', 'reaction_type', 'created_at']
    list_filter = ['reaction_type', 'created_at']
    search_fields = ['user_id', 'post_id']
    ordering = ['-created_at']
