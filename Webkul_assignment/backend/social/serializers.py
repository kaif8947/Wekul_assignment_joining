from rest_framework import serializers
from .models import User, Post, Reaction
import base64


class UserSignupSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['email', 'full_name', 'password', 'date_of_birth']

    def create(self, validated_data):
        user = User.objects.create_user(**validated_data)
        return user


class UserLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)


class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'full_name', 'email', 'date_of_birth', 'profile_picture', 'created_at']
        read_only_fields = ['id', 'email', 'created_at']


class PostSerializer(serializers.ModelSerializer):
    user_reaction = serializers.SerializerMethodField()

    class Meta:
        model = Post
        fields = ['id', 'user_id', 'user_name', 'description', 'image', 
                  'likes_count', 'dislikes_count', 'user_reaction', 'created_at']
        read_only_fields = ['id', 'user_id', 'user_name', 'likes_count', 'dislikes_count', 'created_at']

    def get_user_reaction(self, obj):
        request = self.context.get('request')
        if request and hasattr(request, 'user_id'):
            reaction = Reaction.objects.filter(user_id=request.user_id, post_id=obj.id).first()
            return reaction.reaction_type if reaction else None
        return None


class PostCreateSerializer(serializers.Serializer):
    description = serializers.CharField()
    image = serializers.FileField(required=False, allow_null=True)

    def create(self, validated_data):
        request = self.context['request']
        user_id = request.user_id
        user = User.objects.get(id=user_id)
        image_data = None
        
        if 'image' in validated_data and validated_data['image']:
            image_file = validated_data['image']
            image_bytes = image_file.read()
            image_base64 = base64.b64encode(image_bytes).decode('utf-8')
            content_type = image_file.content_type or 'image/jpeg'
            image_data = f"data:{content_type};base64,{image_base64}"
        
        post = Post.objects.create(
            user_id=user_id,
            user_name=user.full_name,
            description=validated_data['description'],
            image=image_data
        )
        return post


class ReactionSerializer(serializers.Serializer):
    reaction_type = serializers.ChoiceField(choices=['like', 'dislike'])
