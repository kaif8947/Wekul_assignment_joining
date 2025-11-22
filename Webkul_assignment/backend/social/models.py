from django.db import models
from django.contrib.auth.hashers import make_password, check_password
import uuid


class UserManager(models.Manager):
    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError('The Email field must be set')
        email = email.lower()
        user = self.model(email=email, **extra_fields)
        if password:
            user.password_hash = make_password(password)
        user.save(using=self._db)
        return user


class User(models.Model):
    id = models.CharField(max_length=36, primary_key=True, default=lambda: str(uuid.uuid4()))
    email = models.EmailField(max_length=255, unique=True, db_index=True)
    full_name = models.CharField(max_length=255)
    password_hash = models.CharField(max_length=255)
    date_of_birth = models.CharField(max_length=20)
    profile_picture = models.TextField(null=True, blank=True)  # Base64 encoded image
    created_at = models.DateTimeField(auto_now_add=True)

    objects = UserManager()

    class Meta:
        db_table = 'users'

    def __str__(self):
        return self.email
    
    def check_password(self, raw_password):
        return check_password(raw_password, self.password_hash)
    
    def set_password(self, raw_password):
        self.password_hash = make_password(raw_password)


class Post(models.Model):
    id = models.CharField(max_length=36, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = models.CharField(max_length=36, db_index=True)
    user_name = models.CharField(max_length=255)
    description = models.TextField()
    image = models.TextField(null=True, blank=True)  # Base64 encoded image
    likes_count = models.IntegerField(default=0)
    dislikes_count = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'posts'
        ordering = ['-created_at']

    def __str__(self):
        return f"Post by {self.user_name}: {self.description[:50]}"


class Reaction(models.Model):
    LIKE = 'like'
    DISLIKE = 'dislike'
    REACTION_CHOICES = [
        (LIKE, 'Like'),
        (DISLIKE, 'Dislike'),
    ]

    id = models.CharField(max_length=36, primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = models.CharField(max_length=36, db_index=True)
    post_id = models.CharField(max_length=36, db_index=True)
    reaction_type = models.CharField(max_length=20, choices=REACTION_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'reactions'
        unique_together = ['user_id', 'post_id']

    def __str__(self):
        return f"{self.user_id} {self.reaction_type}d post {self.post_id}"
