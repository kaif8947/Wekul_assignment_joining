from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.parsers import MultiPartParser, FormParser
from django.utils import timezone
from datetime import timedelta
from .models import User, Post, Reaction
from .serializers import (
    UserSignupSerializer, UserLoginSerializer, UserProfileSerializer,
    PostSerializer, PostCreateSerializer, ReactionSerializer
)
import base64
import jwt
import os


SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = 'HS256'


def create_access_token(user_id):
    """Create JWT access token"""
    payload = {
        'user_id': user_id,
        'exp': timezone.now() + timedelta(days=7)
    }
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def decode_access_token(token):
    """Decode JWT access token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload.get('user_id')
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


class AuthMixin:
    """Mixin to add JWT authentication to views"""
    
    def authenticate(self, request):
        auth_header = request.headers.get('Authorization', '')
        if not auth_header.startswith('Bearer '):
            return None
        
        token = auth_header.replace('Bearer ', '')
        user_id = decode_access_token(token)
        if not user_id:
            return None
        
        try:
            user = User.objects.get(id=user_id)
            request.user_id = user_id
            return user
        except User.DoesNotExist:
            return None


class SignupView(APIView):
    def post(self, request):
        serializer = UserSignupSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token = create_access_token(user.id)
            return Response({
                'token': token,
                'user': {
                    'id': user.id,
                    'full_name': user.full_name,
                    'email': user.email,
                    'date_of_birth': user.date_of_birth
                }
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    def post(self, request):
        serializer = UserLoginSerializer(data=request.data)
        if serializer.is_valid():
            email = serializer.validated_data['email']
            password = serializer.validated_data['password']
            
            try:
                user = User.objects.get(email=email)
                if user.check_password(password):
                    token = create_access_token(user.id)
                    return Response({
                        'token': token,
                        'user': {
                            'id': user.id,
                            'full_name': user.full_name,
                            'email': user.email,
                            'date_of_birth': user.date_of_birth,
                            'profile_picture': user.profile_picture
                        }
                    })
            except User.DoesNotExist:
                pass
            
            return Response(
                {'detail': 'Invalid email or password'},
                status=status.HTTP_401_UNAUTHORIZED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ProfileView(AuthMixin, APIView):
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        user = self.authenticate(request)
        if not user:
            return Response({'detail': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
        
        serializer = UserProfileSerializer(user)
        return Response(serializer.data)

    def patch(self, request):
        user = self.authenticate(request)
        if not user:
            return Response({'detail': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
        
        if 'full_name' in request.data:
            user.full_name = request.data['full_name']
        if 'date_of_birth' in request.data:
            user.date_of_birth = request.data['date_of_birth']
        if 'profile_picture' in request.FILES:
            image_file = request.FILES['profile_picture']
            image_bytes = image_file.read()
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')
            content_type = image_file.content_type or 'image/jpeg'
            user.profile_picture = f"data:{content_type};base64,{image_base64}"
        
        user.save()
        serializer = UserProfileSerializer(user)
        return Response(serializer.data)


class PostListCreateView(AuthMixin, APIView):
    parser_classes = [MultiPartParser, FormParser]

    def get(self, request):
        user = self.authenticate(request)
        if not user:
            return Response({'detail': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
        
        posts = Post.objects.filter(user_id=user.id)
        serializer = PostSerializer(posts, many=True, context={'request': request})
        return Response(serializer.data)

    def post(self, request):
        user = self.authenticate(request)
        if not user:
            return Response({'detail': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
        
        serializer = PostCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            post = serializer.save()
            response_serializer = PostSerializer(post, context={'request': request})
            return Response(response_serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class PostDetailView(AuthMixin, APIView):
    def delete(self, request, post_id):
        user = self.authenticate(request)
        if not user:
            return Response({'detail': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            post = Post.objects.get(id=post_id, user_id=user.id)
            post.delete()
            return Response({'message': 'Post deleted successfully'})
        except Post.DoesNotExist:
            return Response(
                {'detail': 'Post not found'},
                status=status.HTTP_404_NOT_FOUND
            )


class PostReactionView(AuthMixin, APIView):
    def post(self, request, post_id):
        user = self.authenticate(request)
        if not user:
            return Response({'detail': 'Unauthorized'}, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            post = Post.objects.get(id=post_id)
        except Post.DoesNotExist:
            return Response({'detail': 'Post not found'}, status=status.HTTP_404_NOT_FOUND)

        serializer = ReactionSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        reaction_type = serializer.validated_data['reaction_type']
        
        try:
            existing_reaction = Reaction.objects.get(user_id=user.id, post_id=post.id)
            
            if existing_reaction.reaction_type == reaction_type:
                # Toggle off - remove reaction
                if reaction_type == 'like':
                    post.likes_count -= 1
                else:
                    post.dislikes_count -= 1
                existing_reaction.delete()
                post.save()
                return Response({
                    'likes_count': post.likes_count,
                    'dislikes_count': post.dislikes_count,
                    'user_reaction': None
                })
            else:
                # Change reaction
                old_type = existing_reaction.reaction_type
                existing_reaction.reaction_type = reaction_type
                existing_reaction.save()
                
                if old_type == 'like':
                    post.likes_count -= 1
                    post.dislikes_count += 1
                else:
                    post.likes_count += 1
                    post.dislikes_count -= 1
                post.save()
                
        except Reaction.DoesNotExist:
            # Create new reaction
            Reaction.objects.create(
                user_id=user.id,
                post_id=post.id,
                reaction_type=reaction_type
            )
            if reaction_type == 'like':
                post.likes_count += 1
            else:
                post.dislikes_count += 1
            post.save()

        return Response({
            'likes_count': post.likes_count,
            'dislikes_count': post.dislikes_count,
            'user_reaction': reaction_type
        })


class RootView(APIView):
    def get(self, request):
        return Response({'message': 'Social Network API'})

